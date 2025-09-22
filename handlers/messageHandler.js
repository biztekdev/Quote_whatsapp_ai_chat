import dotenv from 'dotenv';
import conversationService from '../services/conversationService.js';
import WitService from '../services/witService.js';
import mongoLogger from '../services/mongoLogger.js';
import messageStatusService from '../services/messageStatusService.js';
import { Product, ProductCategory } from '../models/productModel.js';
import { Material } from '../models/materialModel.js';
import { ProductFinish } from '../models/finishModel.js';
import { ProcessedMessage } from '../models/processedMessageModel.js';


dotenv.config();

class MessageHandler {
    constructor(whatsappService, aiService) {
        this.whatsappService = whatsappService;
        this.aiService = aiService; // ChatGPT or Wit service
        this.witService = new WitService(); // Keep for backward compatibility
        // Remove old responseTracker - now using MessageStatusService
        
        // Create a wrapper for whatsappService.sendMessage to track all messages
        this.originalSendMessage = this.whatsappService.sendMessage.bind(this.whatsappService);
        this.whatsappService.sendMessage = this.trackedSendMessage.bind(this);
    }

    // Wrapper method to track all message sending attempts
    async trackedSendMessage(to, message, type = 'text') {
        console.log(`🚨 DIRECT MESSAGE SEND DETECTED: ${to} - ${message.substring(0, 50)}...`);
        // console.trace('Call stack for direct message send:');
        
        // Try to find messageId from the call stack or context
        // This is a fallback for direct calls that bypass sendMessageOnce
        const result = await this.originalSendMessage(to, message, type);
        
        // Log this as a potential duplicate
        await mongoLogger.warn('Direct message send detected (bypassed sendMessageOnce)', {
            to,
            message: message.substring(0, 100),
            type,
            source: 'direct-whatsapp-service-call'
        });
        
        return result;
    }

    // Check if we've already responded to a message using MessageStatusService
    async hasResponded(messageId) {
        return await messageStatusService.hasResponseBeenSent(messageId);
    }

    // Mark that we've responded to a message using MessageStatusService
    async markAsResponded(messageId, responseMessageId = null, responseType = 'text') {
        await messageStatusService.markResponseAsSent(messageId, responseMessageId, responseType);
    }

    // Send message only if we haven't already responded using MessageStatusService
    async sendMessageOnce(messageId, to, message, type = 'text') {
        try {
            // Check if we can send response
            const canSend = await messageStatusService.canSendResponse(messageId);

            if (!canSend) {
                console.log(`⏭️ Already responded to message ${messageId}, skipping duplicate response`);
                await mongoLogger.warn('Duplicate response prevented', {
                    messageId,
                    to,
                    message: message.substring(0, 100) + '...',
                    source: 'sendMessageOnce'
                });
                return null;
            }

            // Mark response as sending
            await messageStatusService.markResponseAsSending(messageId);

            console.log(`📤 Sending response for message ${messageId}`);

            try {
                // Send the message
                const result = await this.whatsappService.sendMessage(to, message, type);

                // Mark response as sent
                const responseMessageId = result?.messages?.[0]?.id || null;
                await messageStatusService.markResponseAsSent(messageId, responseMessageId, type);

                return result;

            } catch (sendError) {
                // Mark response as failed
                await messageStatusService.markResponseAsFailed(messageId, sendError.message);
                throw sendError;
            }

        } catch (error) {
            console.error(`❌ Error in sendMessageOnce for message ${messageId}:`, error);
            await mongoLogger.logError(error, {
                source: 'sendMessageOnce',
                messageId,
                to,
                error: error.message
            });
            throw error;
        }
    }

    // Helper method for sending messages when we don't have a messageId (fallback)
    async sendMessageFallback(to, message, type = 'text') {
        try {
            console.log(`📤 Sending fallback message to ${to}`);
            const result = await this.whatsappService.sendMessage(to, message, type);
            return result;
        } catch (error) {
            console.error(`❌ Error in sendMessageFallback:`, error);
            throw error;
        }
    }

    async handleIncomingMessage(message, value = null) {
        const messageId = message.id;
        const from = message.from;
        const messageType = message.type;

        try {
            // Check for empty text messages early
            if (messageType === 'text' && (!message.text?.body || message.text.body.trim() === '')) {
                console.log(`⏭️ Empty text message received from ${from}, skipping processing`);
                await mongoLogger.info('Empty text message received, skipping processing', { 
                    messageType, 
                    from, 
                    messageId,
                    messageText: message.text?.body || 'empty'
                });
                return;
            }

            await mongoLogger.logMessage(message, from);
            await mongoLogger.info('Message received', { messageType, from, messageId });

            // Check if conversation is already completed before processing
            const conversationState = await conversationService.getConversationState(from);
            if (conversationState.conversationData?.completed || conversationState.currentStep === 'completed') {
                console.log(`⏭️ Conversation already completed for ${from}, skipping message processing`);
                return;
            }

            // Initialize message status tracking
            await messageStatusService.initializeMessageStatus(
                messageId,
                from,
                messageType,
                message, // webhookData
                null // conversationId - can be set later if needed
            );

            // Check if message can be processed
            const canProcess = await messageStatusService.canProcessMessage(messageId);
            if (!canProcess) {
                console.log(`⏭️ Message ${messageId} already processed, skipping`);
                await mongoLogger.info('Message already processed, skipping', { messageId, from });
                return;
            }

            // Mark message as processing
            await messageStatusService.markAsProcessing(messageId);

            // Mark message as read
            // await this.whatsappService.markAsRead(messageId);

            await mongoLogger.info('Processing message type', { messageType });

            try {
                // Fix for webhook data sending wrong message type
                const actualMessageType = messageType === 'hi' ? 'text' : messageType;
                
                if (messageType !== actualMessageType) {
                    console.log(`🔧 Message type correction: ${messageType} → ${actualMessageType}`);
                }
                
                switch (actualMessageType) {
                    case 'text':
                        await this.handleTextMessage(message, from);
                        break;
                    case 'image':
                        await this.handleImageMessage(message, from);
                        break;
                    case 'document':
                        await this.handleDocumentMessage(message, from);
                        break;
                    case 'audio':
                        await this.handleAudioMessage(message, from);
                        break;
                    case 'video':
                        await this.handleVideoMessage(message, from);
                        break;
                    case 'interactive':
                        await this.handleInteractiveMessage(message, from);
                        break;
                    default:
                        await mongoLogger.warn('Unsupported message type', { messageType });
                        await this.sendMessageOnce(
                            messageId,
                            from,
                            "Sorry, I don't support this type of message yet.",
                            'text'
                        );
                }

                // Mark message as processed successfully
                await messageStatusService.markAsProcessed(messageId);

            } catch (processingError) {
                // Mark message processing as failed
                await messageStatusService.markAsFailed(messageId, processingError.message);
                throw processingError;
            }

        } catch (error) {
            await mongoLogger.logError(error, {
                source: 'message-handler',
                messageId,
                from,
                messageType
            });

            // Try to send error message if we haven't already responded
            try {
                const hasResponded = await this.hasResponded(messageId);
                if (!hasResponded) {
                    // Provide more specific error messages based on error type
                    let errorMessage = "Sorry, I encountered an error processing your message. Please try again.";
                    
                    if (error.message && error.message.includes('timeout')) {
                        errorMessage = "The system is taking longer than expected. Please try again in a moment.";
                    } else if (error.message && error.message.includes('network')) {
                        errorMessage = "There seems to be a connection issue. Please check your internet and try again.";
                    } else if (error.message && error.message.includes('database')) {
                        errorMessage = "I'm having trouble accessing my data right now. Please try again shortly.";
                    }
                    
                    // Add restart option
                    errorMessage += "\n\n💡 You can also type 'hi' to restart our conversation anytime.";
                    
                    await this.sendMessageOnce(
                        messageId,
                        from,
                        errorMessage,
                        'text'
                    );
                }
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }

    async handleTextMessage(message, from) {
        let messageText = 'unknown';
        try {
            messageText = message.text.body;

            // Check if message is empty, null, or undefined
            if (!messageText || messageText.trim() === '') {
                console.log(`⏭️ Empty message received from ${from}, skipping processing`);
                await mongoLogger.info('Empty message received, skipping processing', { 
                    from, 
                    messageId: message.id,
                    messageText: messageText || 'empty'
                });
                return;
            }

            // Check if conversation is already completed
            let conversationState = await conversationService.getConversationState(from);
            if (conversationState.conversationData?.completed || conversationState.currentStep === 'completed') {
                console.log(`⏭️ Conversation already completed for ${from}, skipping text message processing`);
                return;
            }

            // Process message with ChatGPT FIRST to extract entities before making decisions
            let aiResponse = null;
            let aiEntities = {};
            
            try {
                console.log("🤖 Processing message with ChatGPT:", messageText);
                aiResponse = await this.aiService.processMessage(messageText);
                
                // Log the complete ChatGPT response
                console.log("📊 Complete ChatGPT Response:", JSON.stringify(aiResponse, null, 2));
                
                aiEntities = aiResponse?.data?.entities || {};
                
            } catch (aiError) {
                console.error("❌ ChatGPT processing failed:", aiError);
                await mongoLogger.error('ChatGPT processing failed', { 
                    messageText, 
                    from,
                    error: aiError.message,
                    stack: aiError.stack,
                    step: 'AI_ERROR'
                });
                
                // Continue without ChatGPT - use empty entities
                aiResponse = { data: { entities: {} } };
                aiEntities = {};
            }

            // Check if user wants to start a new quote OR is greeting (regardless of current step)
            const newQuoteKeywords = ['new quote', 'new', 'start over', 'restart', 'reset', 'begin again', 'fresh quote', 'another quote', 'new order'];
            const wantsNewQuote = newQuoteKeywords.some(keyword => 
                messageText.toLowerCase().includes(keyword.toLowerCase())
            );

            // Check if this is a greeting message
            const isGreetingMessage = this.isGreeting(messageText);
            
            // Check if message contains useful product information
            const hasProductInfo = this.hasProductInformation(messageText);
            
            console.log('🔍 Message analysis:', {
                message: messageText,
                wantsNewQuote: wantsNewQuote,
                isGreetingMessage: isGreetingMessage,
                hasProductInfo: hasProductInfo,
                hasEntities: Object.keys(aiEntities).length > 0
            });

            // Only reset conversation for simple greetings or explicit new quote requests
            // Don't reset for complex messages with product information or detected entities
            if (wantsNewQuote || (isGreetingMessage && !hasProductInfo && Object.keys(aiEntities).length === 0)) {
                console.log("User wants new quote or is simple greeting, resetting conversation");
                
                // Reset conversation to start fresh
                await conversationService.resetConversation(from);
                
                // Send greeting response for new conversation
                await this.handleGreetingResponse(messageText, from, message.id);
                return;
            }
            
            // If it's a complex message with product info OR entities detected, process it with entity extraction
            if (hasProductInfo || Object.keys(aiEntities).length > 0) {
                console.log("Complex message with product information or entities detected, processing with entity extraction");
                
                // For greeting messages with entities, reset conversation but extract entities first
                if (isGreetingMessage) {
                    console.log("Greeting with entities detected, resetting and extracting data");
                    await conversationService.resetConversation(from);
                    
                    // Get fresh conversation state after reset
                    conversationState = await conversationService.getConversationState(from);
                }
            }

            // Extract and update conversation data with entities
            // Skip entity extraction for quote_generation, material_selection, and finish_selection to prevent unwanted overrides
            // Allow entity extraction for greeting_response when it contains product info
            let updatedConversationData = conversationState.conversationData || {};
            const shouldExtractEntities = conversationState.currentStep !== 'quote_generation' && 
                                        conversationState.currentStep !== 'material_selection' &&
                                        conversationState.currentStep !== 'finish_selection' &&
                                        !(conversationState.currentStep === 'greeting_response' && 
                                          (messageText.toLowerCase().includes('yes') || messageText.toLowerCase().includes('no')));
                                          
            if (shouldExtractEntities) {
                updatedConversationData = await this.extractAndUpdateConversationData(
                aiResponse.data.entities,
                    conversationState.conversationData || {},
                    messageText
            );
                console.log("🎯 Entity extraction performed for step:", conversationState.currentStep, "message:", messageText);
            } else {
                console.log("🎯 Skipping entity extraction for response step:", conversationState.currentStep, "message:", messageText);
            }


            // Special case: If this is the first message and we have selectedCategory, bypass greeting
            if (conversationState.currentStep === 'start' && updatedConversationData.selectedCategory) {
                // console.log("Bypassing greeting - user provided product info in first message");
                updatedConversationData.wantsQuote = true;
            }

            // Check if we can bypass steps based on extracted data
            console.log('🔍 determineNextStep input:', {
                currentStep: conversationState.currentStep,
                wantsQuote: updatedConversationData.wantsQuote,
                hasSelectedCategory: !!updatedConversationData.selectedCategory?.id,
                selectedCategory: updatedConversationData.selectedCategory
            });
            const nextStep = await this.determineNextStep(
                conversationState.currentStep,
                updatedConversationData,
                aiResponse.data.entities
            );
            console.log('🎯 determineNextStep result:', nextStep);
            // Update conversation state with extracted data
            if (Object.keys(updatedConversationData).length > 0) {
                // console.log("💾 Updating conversation state with data:", {
                //     hasSkus: !!updatedConversationData.skus,
                //     skusData: updatedConversationData.skus,
                //     dataKeys: Object.keys(updatedConversationData)
                // });
                
                const _sss = await conversationService.updateConversationState(from, {
                    conversationData: updatedConversationData,
                    currentStep: nextStep
                });
                
                // console.log("✅ Conversation state updated successfully");
                
                // Get the updated conversation state for processing
                conversationState = await conversationService.getConversationState(from);
                // console.log("🔄 Retrieved updated conversation state:", {
                //     hasSkus: !!conversationState.conversationData?.skus,
                //     skusData: conversationState.conversationData?.skus,
                //     currentStep: conversationState.currentStep
                // });
            }
            // Process message through our conversation flow
            
            await this.processConversationFlow(message, messageText, from, conversationState, false);

        } catch (error) {
            console.error('Error in handleTextMessage:', error);
            await mongoLogger.logError(error, {
                source: 'text-message-handler',
                from: from,
                messageText: messageText || 'unknown'
            });

            try {
                await this.sendMessageOnce(
                    message.id,
                    from,
                    errorMessage
                );
            } catch (sendError) {
                console.error('Error sending error message to user:', sendError);
                await mongoLogger.logError(sendError, {
                    source: 'error-message-sender',
                    from: from
                });
            }
        }
    }

    /**
     * Parse dimension values from string with various separators
     */
    parseDimensionValues(dimensionString) {
        try {
            if (!dimensionString || typeof dimensionString !== 'string') {
                return [];
            }

            // Check if this looks like a dimension string (has dimension indicators)
            const dimensionIndicators = [
                'x', '×', '*', 'inch', 'cm', 'mm', 'size:', 'dimension', 
                'width', 'height', 'depth', 'diameter', 'w:', 'h:', 'd:', 'dia:'
            ];
            
            const lowerStr = dimensionString.toLowerCase();
            const hasDimensionIndicator = dimensionIndicators.some(indicator => 
                lowerStr.includes(indicator)
            );
            
            // If no dimension indicators, don't parse as dimensions
            if (!hasDimensionIndicator) {
                console.log(`No dimension indicators found in "${dimensionString}", skipping dimension parsing`);
                return [];
            }

            // Replace common separators with comma and clean the string
            let cleanedString = dimensionString
                .replace(/[x×*]/gi, ',')  // Replace x, ×, or * with comma
                .replace(/\s+/g, ',')    // Replace spaces with comma
                .replace(/[,\s]+/g, ',') // Replace multiple commas/spaces with single comma
                .replace(/^,|,$/g, '');  // Remove leading/trailing commas

            // Split by comma and parse numbers
            const values = cleanedString
                .split(',')
                .map(val => val.trim())
                .filter(val => val !== '')
                .map(val => parseFloat(val))
                .filter(val => !isNaN(val) && val > 0 && val < 1000); // Reasonable dimension limits

            console.log(`Parsed dimensions from "${dimensionString}":`, values);
            return values;
        } catch (error) {
            console.error('Error parsing dimension values:', error);
            return [];
        }
    }

    /**
     * Extract entities from Wit.ai response and update conversation data
     */
    async extractAndUpdateConversationData(entities, currentConversationData, messageText = '') {
        try {
            // Skip entity processing only for simple greetings without product information
            if (messageText && this.isGreeting(messageText) && !this.hasProductInformation(messageText)) {
                console.log("🎯 Skipping entity extraction for simple greeting message:", messageText);
                return currentConversationData;
            }

            const updatedData = { ...currentConversationData };
            console.log("Processing entities:", entities);

            // Define processing order for entities
            const customOrder = [
                "category:category",
                "product:product",
                "dimensions:dimensions",
                "material:material",
                "finishes:finishes",
                "quantities:quantities",
                "skus:skus",
                "sku:sku"
            ];

            // Sort entities based on custom order
            const sortedEntityEntries = Object.entries(entities).sort(([a], [b]) => {
                const indexA = customOrder.indexOf(a);
                const indexB = customOrder.indexOf(b);

                // If both are in custom order, sort by their position
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // If only A is in custom order, A comes first
                if (indexA !== -1) {
                    return -1;
                }
                // If only B is in custom order, B comes first
                if (indexB !== -1) {
                    return 1;
                }
                // If neither is in custom order, maintain original order
                return 0;
            });

            // Process each entity type in sorted order
            for (const [entityType, entityArray] of sortedEntityEntries) {
                console.log(`🔍 Processing entity type: ${entityType}`, JSON.stringify(entityArray, null, 2));

                for (const entity of entityArray) {
                    try {
                        const { value, confidence, body } = entity;
                        console.log(`📝 Entity Details - Type: ${entityType}`, { 
                            value, 
                            confidence, 
                            body,
                            fullEntity: JSON.stringify(entity, null, 2)
                        });

                        if (confidence > 0.5) {
                            switch (entityType) {
                                case 'category:category':
                                    // Search for category in ProductCategory schema
                                    const foundCategory = await this.findCategoryByName(value || body);
                                    if (foundCategory) {
                                        updatedData.selectedCategory = {
                                            id: foundCategory._id.toString(),
                                            erp_id: foundCategory.erp_id,
                                            name: foundCategory.name,
                                            description: foundCategory.description
                                        };
                                        // If this is a greeting message with category, auto-set wantsQuote to true
                                        if (messageText && this.isGreeting(messageText)) {
                                            updatedData.wantsQuote = true;
                                            console.log("🎯 Auto-setting wantsQuote=true for greeting with category:", foundCategory.name);
                                        }
                                        // console.log("Found category:", foundCategory.name);
                                    } else {
                                        updatedData.requestedCategory = value || body;
                                        console.log("Category not found, stored as requested:", value || body);
                                    }
                                    break;

                                case 'product:product':
                                    // Only update product if not already selected (prevent overriding during material/finish selection)
                                    if (!currentConversationData.selectedProduct || !currentConversationData.selectedProduct.id) {
                                        // Search for product in Product schema
                                        const foundProduct = await this.findProductByName(value || body, updatedData);
                                        if (foundProduct) {
                                            updatedData.selectedProduct = {
                                                id: foundProduct._id.toString(),
                                                erp_id: foundProduct.erp_id,
                                                name: foundProduct.name,
                                                description: foundProduct.description,
                                                basePrice: foundProduct.basePrice
                                            };
                                            const foundCategory = await this.findCategoryById(foundProduct.categoryId);
                                            if (foundCategory) {
                                                updatedData.selectedCategory = {
                                                    id: foundCategory._id.toString(),
                                                    erp_id: foundCategory.erp_id,
                                                    name: foundCategory.name,
                                                    description: foundCategory.description
                                                };
                                            }
                                            // If this is a greeting message with product, auto-set wantsQuote to true
                                            if (messageText && this.isGreeting(messageText)) {
                                                updatedData.wantsQuote = true;
                                                console.log("🎯 Auto-setting wantsQuote=true for greeting with product:", foundProduct.name);
                                            }
                                        } else {
                                            updatedData.requestedProductName = value || body;
                                            // console.log("Product not found, stored as requested:", value || body);
                                        }
                                    } else {
                                        console.log("Product already selected, skipping extraction to prevent override:", currentConversationData.selectedProduct.name);
                                    }
                                    break;

                                case 'dimensions:dimensions':
                                    const dimensions = value || body;

                                    // Parse dimension values from the string
                                    const dimensionValues = this.parseDimensionValues(dimensions);

                                    // Check if we have a selected product
                                    if (updatedData.selectedProduct && updatedData.selectedProduct.id) {
                                        try {
                                            // Get the product with dimension fields
                                            const product = await conversationService.getProductById(updatedData.selectedProduct.id);

                                            if (product && product.dimensionFields && dimensionValues.length > 0) {
                                                // Initialize dimensions array if not exists
                                                if (!updatedData.dimensions) {
                                                    updatedData.dimensions = [];
                                                }

                                                // Map dimension values to product dimension fields
                                                product.dimensionFields.forEach((field, index) => {
                                                    if (dimensionValues[index] !== undefined) {
                                                        // Check if dimension already exists
                                                        const existingDimension = updatedData.dimensions.find(d => d.name === field.name);
                                                        if (!existingDimension) {
                                                            updatedData.dimensions.push({
                                                                name: field.name,
                                                                value: dimensionValues[index]
                                                            });
                                                            // console.log("Added dimension:", field.name, "=", dimensionValues[index]);
                                                        }
                                                    }
                                                });

                                                // console.log("Final dimensions array:", updatedData.dimensions);
                                            } else {
                                                console.log("No product dimension fields or no valid dimension values found");
                                            }
                                        } catch (error) {
                                            console.error("Error processing dimensions:", error);
                                        }
                                    } else {
                                        // console.log("No selected product found, skipping dimension processing");
                                    }
                                    break;
                                case 'finishes:finishes':
                                    const finishes = value || body;
                                    const findFinish = await this.findFinishByName(finishes);
                                    if (findFinish) {
                                        // Initialize selectedFinish array if it doesn't exist
                                        if (!updatedData.selectedFinish) {
                                            updatedData.selectedFinish = [];
                                        }
                                        // Check if finish already exists to avoid duplicates
                                        const finishExists = updatedData.selectedFinish.some(f => f._id === findFinish.erp_id.toString());
                                        if (!finishExists) {
                                            // Push only _id and name
                                            updatedData.selectedFinish.push({
                                                _id: findFinish.erp_id.toString(),
                                                name: findFinish.name
                                            });
                                        }
                                    }
                                    break;
                                case 'material:material':
                                    const material = value || body;
                                    console.log("🚨 MATERIAL ENTITY DETECTED:", {
                                        material,
                                        value,
                                        body,
                                        messageText,
                                        confidence,
                                        hasExistingMaterial: !!currentConversationData.selectedMaterial
                                    });
                                    
                                    // Only update material if not already confirmed (prevent overriding during material selection step)
                                    if (!currentConversationData.selectedMaterial || !currentConversationData.selectedMaterial.name) {
                                        const findMaterial = await this.findMaterialByName(material);
                                        if (findMaterial) {
                                            updatedData.selectedMaterial = {
                                                _id: findMaterial.erp_id.toString(),
                                                name: findMaterial.name,
                                            };
                                            console.log("🚨 AUTO-SELECTED MATERIAL:", findMaterial.name);
                                        } else {
                                            // Store the requested material even if not found in database
                                            updatedData.requestedMaterial = material;
                                            console.log("Material not found in database, storing as requested:", material);
                                        }
                                    } else {
                                        console.log("Material already selected, skipping extraction to prevent override:", currentConversationData.selectedMaterial.name);
                                    }
                                    break;
                                case 'quantities:quantities':
                                    const quantity = value || body;
                                    
                                    // Don't extract quantity if this looks like a dimension string
                                    if (messageText && this.isDimensionMessage(messageText)) {
                                        console.log("Skipping quantity extraction - detected dimension message:", messageText);
                                        break;
                                    }
                                    
                                    if (!updatedData.quantity) {
                                        updatedData.quantity = [];
                                    }
                                    // Convert to number for comparison - handle comma-separated numbers and "k" notation
                                    const cleanQuantity = quantity.toString().replace(/,/g, '');
                                    
                                    // Handle "k" notation (e.g., "19k" -> 19000)
                                    let numericQuantity;
                                    if (cleanQuantity.toLowerCase().includes('k')) {
                                        // Extract number before 'k' and multiply by 1000
                                        const kMatch = cleanQuantity.toLowerCase().match(/(\d+(?:\.\d+)?)k/);
                                        if (kMatch) {
                                            numericQuantity = parseFloat(kMatch[1]) * 1000;
                                            console.log(`Converted "${cleanQuantity}" to ${numericQuantity} (k notation)`);
                                        } else {
                                            numericQuantity = parseInt(cleanQuantity);
                                        }
                                    } else {
                                        numericQuantity = parseInt(cleanQuantity);
                                    }
                                    
                                    if (!isNaN(numericQuantity) && !updatedData.quantity.includes(numericQuantity)) {
                                        updatedData.quantity.push(numericQuantity);
                                        console.log(`Added quantity: ${numericQuantity} (from "${quantity}")`);
                                    }
                                    break;
                                case 'skus:skus':
                                case 'sku:sku':
                                    console.log("🎯 Processing SKU entity:", { value, body, confidence });
                                    const skuValue = value || body;
                                    console.log("📦 SKU value extracted:", skuValue);
                                    
                                    // Store SKU as single value, not array
                                    const cleanSku = skuValue.toString().replace(/,/g, '');
                                    const skuNum = parseInt(cleanSku);
                                    
                                    console.log("🔢 SKU number conversion:", { cleanSku, skuNum, isNaN: isNaN(skuNum) });
                                    
                                    if (!isNaN(skuNum)) {
                                        updatedData.skus = skuNum;
                                        console.log("✅ Stored numeric SKU:", skuNum);
                                    } else {
                                        updatedData.skus = skuValue;
                                        console.log("✅ Stored string SKU:", skuValue);
                                    }
                                    
                                    console.log("📊 Current skus value:", updatedData.skus);
                                    break;
                                default:
                                    // Check if this is a SKU-related entity that we missed
                                    if (entityType.includes('sku') || entityType.includes('SKU')) {
                                        console.log("🎯 Processing potential SKU entity (fallback):", { entityType, value, body, confidence });
                                        const skuValue = value || body;
                                        
                                        const cleanSku = skuValue.toString().replace(/,/g, '');
                                        const skuNum = parseInt(cleanSku);
                                        
                                        if (!isNaN(skuNum)) {
                                            updatedData.skus = skuNum;
                                            console.log("✅ Stored SKU via fallback:", skuNum);
                                        } else {
                                            updatedData.skus = skuValue;
                                            console.log("✅ Stored SKU string via fallback:", skuValue);
                                        }
                                    }
                                    break;
                        }
                        }
                    } catch (entityError) {
                        console.error(`Error processing entity ${entityType}:`, entityError);
                        await mongoLogger.logError(entityError, {
                            source: 'entity-processor',
                            entityType: entityType,
                            entity: entity
                        });
                        // Continue processing other entities
                    }
                }
            }

            console.log("✅ Final Updated Conversation Data:", JSON.stringify(updatedData, null, 2));
            console.log("🔍 Checking for SKUs in final data:", {
                hasSkus: !!updatedData.skus,
                skusValue: updatedData.skus,
                skusType: typeof updatedData.skus
            });
            return updatedData;
        } catch (error) {
            console.error('Error in extractAndUpdateConversationData:', error);
            await mongoLogger.logError(error, {
                source: 'extract-conversation-data',
                entities: entities
            });
            // Return original data if extraction fails
            return currentConversationData;
        }
    }

    /**
     * Find category by name in ProductCategory schema
     */
    async findCategoryByName(categoryName) {
        try {
            const categories = await conversationService.getProductCategories();

            // Search in name field
            let foundCategory = categories.find(cat =>
                cat.name.toLowerCase().includes(categoryName.toLowerCase())
            );

            // If not found in name, search in sub_names
            if (!foundCategory) {
                foundCategory = categories.find(cat =>
                    cat.sub_names && cat.sub_names.some(subName =>
                        subName.toLowerCase().includes(categoryName.toLowerCase())
                    )
                );
            }

            return foundCategory;
        } catch (error) {
            console.error('Error finding category by name:', error);
            return null;
        }
    }

    /**
     * Find category by ID in ProductCategory schema
     */
    async findCategoryById(categoryId) {
        try {
            // Convert ObjectId to string if needed
            const categoryIdString = categoryId.toString();
            console.log("categoryIdString ", categoryIdString);

            // First try to find by MongoDB ObjectId
            let category = await ProductCategory.findById(categoryIdString);

            // If not found and it's a number, try finding by ERP ID
            if (!category && !isNaN(parseInt(categoryIdString))) {
                category = await ProductCategory.findOne({ erp_id: parseInt(categoryIdString) });
                console.log("Found category by ERP ID:", category?.name);
            }

            return category;
        } catch (error) {
            console.error('Error finding category by ID:', error);
            return null;
        }
    }

    /**
     * Find product by name in Product schema
     */
    async findProductByName(productName, conversationData = {}) {
        try {
            // Search all active products
            const products = await Product.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });

            // Search in name field
            let foundProduct = products.find(product =>
                product.name.toLowerCase().includes(productName.toLowerCase())
            );

            // If not found in name, search in description
            if (!foundProduct) {
                foundProduct = products.find(product =>
                    product.description && product.description.toLowerCase().includes(productName.toLowerCase())
                );
            }

            // If not found in description, search in erp_id
            if (!foundProduct) {
                const erpId = parseInt(productName);
                if (!isNaN(erpId)) {
                    foundProduct = products.find(product => product.erp_id === erpId);
                }
            }

            return foundProduct;
        } catch (error) {
            console.error('Error finding product by name:', error);
            return null;
        }
    }

    async findFinishByName(finishName) {
        try {
            // Search all active finishes
            const finishes = await ProductFinish.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
            
            // Search in name field
            let foundFinish = finishes.find(finish =>
                finish.name.toLowerCase().includes(finishName.toLowerCase())
            );
            
            // If not found in name, search in description
            if (!foundFinish) {
                foundFinish = finishes.find(finish =>
                    finish.description && finish.description.toLowerCase().includes(finishName.toLowerCase())
                );
            }
            
            // If not found in description, search in erp_id
            if (!foundFinish) {
                const erpId = parseInt(finishName);
                if (!isNaN(erpId)) {
                    foundFinish = finishes.find(finish => finish.erp_id === erpId);
                }
            }
            
            return foundFinish;
        } catch (error) {
            console.error('Error finding finish by name:', error);
            return null;
        }
    }

    async findMaterialByName(materialName) {
        try {
            console.log("🔍 Searching for material:", materialName);
            
            // Search all active materials
            const materials = await Material.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
            console.log("🔍 Available materials:", materials.map(m => ({ name: m.name, erp_id: m.erp_id })));
            
            // Search in name field (exact match first)
            let foundMaterial = materials.find(material =>
                material.name.toLowerCase() === materialName.toLowerCase()
            );
            
            if (foundMaterial) {
                console.log("🎯 Found exact match:", foundMaterial.name);
                return foundMaterial;
            }
            
            // If not found, search for partial match in name
            foundMaterial = materials.find(material =>
                material.name.toLowerCase().includes(materialName.toLowerCase())
            );
            
            if (foundMaterial) {
                console.log("🎯 Found partial match in name:", foundMaterial.name);
                return foundMaterial;
            }
            
            // If not found in name, search in description
            foundMaterial = materials.find(material =>
                material.description && material.description.toLowerCase().includes(materialName.toLowerCase())
            );
            
            if (foundMaterial) {
                console.log("🎯 Found match in description:", foundMaterial.name);
                return foundMaterial;
            }
            
            // If not found in description, try searching for individual parts (for composite materials like "PET + MPET + PE")
            if (!foundMaterial) {
                const materialParts = materialName.split('+').map(part => part.trim());
                for (const part of materialParts) {
                    foundMaterial = materials.find(material =>
                        material.name.toLowerCase().includes(part.toLowerCase())
                    );
                    if (foundMaterial) break;
                }
            }
            
            // If not found, search in erp_id
            if (!foundMaterial) {
                const erpId = parseInt(materialName);
                if (!isNaN(erpId)) {
                    foundMaterial = materials.find(material => material.erp_id === erpId);
                }
            }
            
            console.log("Material search result:", foundMaterial ? foundMaterial.name : "Not found");
            return foundMaterial;
        } catch (error) {
            console.error('Error finding material by name:', error);
            return null;
        }
    }

    /**
     * Check if a step should be bypassed based on available data
     */
    shouldBypassStep(step, conversationData) {
        switch (step) {
            case 'greeting_response':
                // Bypass greeting_response if we have category data and user wants a quote
                return conversationData.wantsQuote && 
                       ((conversationData.selectedCategory && conversationData.selectedCategory.id) || conversationData.requestedCategory);

            case 'category_selection':
                return (conversationData.selectedCategory && conversationData.selectedCategory.id) || conversationData.requestedCategory;

            case 'product_selection':
                return (conversationData.selectedProduct && conversationData.selectedProduct.id) || conversationData.requestedProductName;

            case 'dimension_input':
                return conversationData.dimensions && conversationData.dimensions.length > 0;

            case 'material_selection':
                return conversationData.selectedMaterial && conversationData.selectedMaterial.name;

            case 'finish_selection':
                return conversationData.selectedFinish && conversationData.selectedFinish.length > 0;

            case 'quantity_input':
                return conversationData.quantity && conversationData.quantity.length > 0;

            default:
                return false;
        }
    }

    /**
     * Get the next step after bypassing current step
     */
    getNextStepAfterBypass(currentStep, conversationData) {
        // If we have all required data, go to quote generation
        if (conversationData.selectedProduct &&
            conversationData.dimensions &&
            conversationData.dimensions.length > 0 &&
            conversationData.selectedMaterial &&
            conversationData.selectedMaterial.name &&
            conversationData.selectedFinish &&
            conversationData.selectedFinish.length > 0 &&
            conversationData.quantity &&
            conversationData.quantity.length > 0) {
            return 'quote_generation';
        }

        // Otherwise, move to the next logical step
        switch (currentStep) {
            case 'greeting_response':
                return conversationData.selectedProduct ? 'dimension_input' : 
                       (conversationData.selectedCategory ? 'product_selection' : 'category_selection');

            case 'category_selection':
                return conversationData.selectedProduct ? 'dimension_input' : 'product_selection';

            case 'product_selection':
                return 'dimension_input';

            case 'dimension_input':
                return 'material_selection';

            case 'material_selection':
                return 'finish_selection';

            case 'finish_selection':
                return 'quantity_input';

            case 'quantity_input':
                return 'quote_generation';

            default:
                return currentStep;
        }
    }

    /**
     * Determine the next step based on current step and extracted data
     */
    async determineNextStep(currentStep, conversationData, entities) {
        console.log('🔍 determineNextStep called with:', {
            currentStep,
            wantsQuote: conversationData.wantsQuote,
            hasSelectedCategory: !!conversationData.selectedCategory?.id,
            selectedCategory: conversationData.selectedCategory
        });

        // Special case: If we're in 'start' step and have selectedCategory, go to product_selection
        if (currentStep === 'start' && conversationData.selectedCategory?.id) {
            console.log('✅ Case 1: start + has selectedCategory → product_selection');
            return 'product_selection';
        }

        // Special case: If we're in 'start' step and user wants quote but no category selected, go to greeting_response
        if (currentStep === 'start' && conversationData.wantsQuote && !conversationData.selectedCategory?.id) {
            console.log('✅ Case 2: start + wantsQuote + no category → greeting_response');
            return 'greeting_response';
        }

        // Special case: If we're in 'greeting_response' and now have selectedCategory, move to product_selection
        if (currentStep === 'greeting_response' && conversationData.selectedCategory?.id) {
            console.log('✅ Case 3: greeting_response + has selectedCategory → product_selection');
            return 'product_selection';
        }

        // Use the bypassing logic to determine next step
        if (this.shouldBypassStep(currentStep, conversationData)) {
            const bypassResult = this.getNextStepAfterBypass(currentStep, conversationData);
            console.log('✅ Case 4: bypass logic →', bypassResult);
            return bypassResult;
        }

        console.log('✅ Case 5: no change →', currentStep);
        return currentStep; // Keep current step if no advancement possible
    }

    async processConversationFlow(message, messageText, from, conversationState, hasResponded = false) {
        console.log("processConversationFlow ", messageText, from, conversationState);
        try {
            const currentStep = conversationState.currentStep;
            const conversationData = conversationState.conversationData || {};

            // Check if conversation is already completed
            if (conversationData.completed || currentStep === 'completed') {
                console.log(`⏭️ Conversation already completed for ${from}, skipping processing`);
                return;
            }

            await mongoLogger.info('Processing conversation step', { currentStep, from });

            // Check if current step should be bypassed
            if (this.shouldBypassStep(currentStep, conversationData)) {
                await mongoLogger.info(`Bypassing step: ${currentStep}`, {
                    from,
                    conversationData: Object.keys(conversationData)
                });

                const nextStep = this.getNextStepAfterBypass(currentStep, conversationData);

                // Update conversation state to next step
                await conversationService.updateConversationState(from, {
                    currentStep: nextStep
                });

                // Recursively process the next step - but don't send duplicate responses
                const updatedState = await conversationService.getConversationState(from);
                return await this.processConversationFlow(message, messageText, from, updatedState, hasResponded);
            }
            
            // Only process step if we haven't already responded
            if (!hasResponded) {
                try {
                    switch (currentStep) {
                        case 'start':
                            await this.handleStartStep(messageText, from, message.id);
                            break;
                        case 'greeting_response':
                            await this.handleGreetingResponse(messageText, from, message.id);
                            break;
                        case 'category_selection':
                            await this.handleCategorySelection(messageText, from);
                            break;
                        case 'product_selection':
                            await this.handleProductSelection(messageText, from);
                            break;
                        case 'dimension_input':
                            await this.handleDimensionInput(messageText, from, conversationData, message);
                            break;
                        case 'material_selection':
                            await this.handleMaterialSelection(messageText, from, conversationData);
                            break;
                        case 'finish_selection':
                            await this.handleFinishSelection(messageText, from, conversationData);
                            break;
                        case 'quantity_input':
                            await this.handleQuantityInput(messageText, from, conversationData);
                            break;
                        case 'quote_generation':
                            await this.handleQuoteGeneration(messageText, from, conversationData, message);
                            break;
                        default:
                            console.log(`Unknown step: ${currentStep}, defaulting to start step`);
                            await this.handleStartStep(messageText, from, message.id);
                    }
                } catch (stepError) {
                    console.error(`Error in step ${currentStep}:`, stepError);
                    await mongoLogger.logError(stepError, {
                        source: 'conversation-step-handler',
                        step: currentStep,
                        from: from,
                        messageText: messageText
                    });

                    // Send user-friendly error message (only once)
                    await this.sendMessageOnce(
                        message.id,
                        from,
                        "Sorry, I encountered an error processing your request. Let me start over."
                    );

                    // Reset conversation to start step
                    await conversationService.updateConversationState(from, {
                        currentStep: 'start',
                        conversationData: {}
                    });
                }
            } else {
                console.log(`Skipping step processing - already responded for ${from}`);
            }
        } catch (error) {
            await mongoLogger.logError(error, { source: 'conversation-flow' });
            // Only send error message if we haven't already responded
            if (!(await this.hasResponded(message.id))) {
                await this.sendMessageOnce(
                    message.id,
                    from,
                    "I'm sorry, something went wrong. Let me restart our conversation. Please type 'hi' to begin."
                );
            }
            await conversationService.resetConversation(from);
        }
    }

    async handleStartStep(messageText, from, messageId) {
        try {
            // Process with ChatGPT to detect greeting (with fallback)
            let intent = null;
            try {
                const aiResponse = await this.aiService.processMessage(messageText);
                intent = aiResponse.data?.intents?.[0]?.name;
            } catch (aiError) {
                console.log("ChatGPT not available, using fallback greeting detection");
                await mongoLogger.warn('ChatGPT unavailable in handleStartStep, using fallback', { 
                    messageText, 
                    from,
                    error: aiError.message
                });
            }

            if (intent === 'greeting' || this.isGreeting(messageText)) {
                await this.sendGreetingWithQuoteOption(from);
                await conversationService.updateConversationState(from, {
                    currentStep: 'greeting_response'
                });
            } else {
                await this.sendMessageOnce(
                    messageId,
                    from,
                    "Hello! 👋 Welcome to our mylar bag service. Please say 'Hi' to get started with your quote request."
                );
                await conversationService.updateConversationState(from, {
                    currentStep: 'greeting_response'
                });
            }
        } catch (error) {
            console.error('Error in handleStartStep:', error);
            await mongoLogger.error('handleStartStep failed', { 
                messageText, 
                from,
                error: error.message,
                stack: error.stack
            });
            
            // Fallback response
            await this.sendMessageOnce(
                messageId,
                from,
                "Hello! 👋 Welcome to our mylar bag service. Please say 'Hi' to get started with your quote request."
            );
        }
    }

    async sendGreetingWithQuoteOption(from) {
        const buttons = [
            {
                type: 'reply',
                reply: {
                    id: 'quote_yes',
                    title: 'Yes, Get Quote'
                }
            },
            {
                type: 'reply',
                reply: {
                    id: 'quote_no',
                    title: 'No, Thanks'
                }
            }
        ];

        const bodyText = `Hello! 👋 Welcome to our Mylar Bag service! 

We specialize in high-quality mylar bags for all your packaging needs.

Would you like to get a quote for mylar bags today?`;

        await this.whatsappService.sendButtonMessage(from, bodyText, buttons);
    }

    async handleGreetingResponse(messageText, from, messageId = null) {
        const response = messageText.toLowerCase().trim();
        console.log('🎯 handleGreetingResponse called with:', { messageText, response, from });

        // Check if user is making a specific quote request (e.g., "need folding carton quote")
        const isQuoteRequest = response.includes('quote') || response.includes('need') || 
                              response.includes('want') || response.includes('get');
                              
        // Check if user mentioned a specific category
        const hasProductInfo = this.hasProductInformation(messageText);

        if (response.includes('yes') || response === 'quote_yes' || response.includes('get quote') || 
            (isQuoteRequest && hasProductInfo)) {
            console.log('✅ User wants quote, updating state to category_selection or proceeding with extracted category');
            
            await conversationService.updateConversationState(from, {
                currentStep: 'category_selection',
                'conversationData.wantsQuote': true
            });
            
            // Check if we already have category information from entity extraction
            const conversationState = await conversationService.getConversationState(from);
            const selectedCategory = conversationState.conversationData?.selectedCategory;
            
            if (selectedCategory && selectedCategory.id) {
                console.log('📦 Category already identified from message, proceeding to product selection');
                
                // Send confirmation that category was detected
                await this.whatsappService.sendMessage(
                    from,
                    `✅ Perfect! I detected you need a quote for **${selectedCategory.name}** products. Let me show you the available options.`
                );
                
                await conversationService.updateConversationState(from, {
                    currentStep: 'product_selection'
                });
                
                // Small delay to ensure messages appear in order
                setTimeout(async () => {
                    await this.sendProductSelection(from);
                }, 1000);
            } else {
                console.log('📤 No category identified, calling sendCategorySelection');
                await this.sendCategorySelection(from);
            }
        } else if (response.includes('no') || response === 'quote_no') {
            await this.sendMessageOnce(
                messageId,
                from,
                "No problem! If you change your mind or have any questions about our mylar bags, feel free to reach out anytime. Have a great day! 😊"
            );
            await conversationService.updateConversationState(from, {
                currentStep: 'completed',
                isActive: false,
                completedAt: new Date()
            });
        } else {
            await this.sendMessageOnce(
                messageId,
                from,
                "Please reply with 'Yes' if you want a quote or 'No' if you don't need one right now."
            );
        }
    }

    async sendCategorySelection(from, messageId = null) {
        console.log('🎯 sendCategorySelection called for:', from);
        try {
            const categories = await conversationService.getProductCategories();
            console.log('📋 Retrieved categories:', categories?.length || 0);

            if (!categories || categories.length === 0) {
                if (messageId) {
                    await this.sendMessageOnce(
                        messageId,
                        from,
                        "Sorry, no product categories are available at the moment. Please try again later."
                    );
                } else {
                    await this.sendMessageFallback(
                        from,
                        "Sorry, no product categories are available at the moment. Please try again later."
                    );
                }
                return;
            }

            // Ensure we're in category_selection step before sending the list
            await conversationService.updateConversationState(from, {
                currentStep: 'category_selection'
            });

            const sections = [{
                title: "Product Categories",
                rows: categories.map(category => ({
                    id: category.erp_id.toString(),
                    title: category.name,
                    description: category.description
                }))
            }];

            const bodyText = `Perfect! 🎯 Let's start by selecting the category that best fits your needs. Which category are you interested in?`;
            console.log('sections ', sections);
            await this.whatsappService.sendListMessage(
                from,
                bodyText,
                "Select Category",
                sections
            );
        } catch (error) {
            await mongoLogger.logError(error, { source: 'send-category-selection' });
            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error loading categories. Please try again later."
            );
        }
    }

    async handleCategorySelection(messageText, from) {
        console.log('🎯 handleCategorySelection called with:', { messageText, from });

        const categories = await conversationService.getProductCategories();
        console.log('📋 Available categories:', categories?.map(c => ({ name: c.name, erp_id: c.erp_id })) || 'No categories found');

        if (!categories || categories.length === 0) {
            await this.whatsappService.sendMessage(
                from,
                "Sorry, no product categories are available at the moment. Please try again later."
            );
            return;
        }

        let selectedCategory = null;

        // Check if it's a direct category ERP ID or find by name
        selectedCategory = categories.find(c =>
            c.erp_id.toString() === messageText ||
            c.name.toLowerCase().includes(messageText.toLowerCase())
        );

        console.log('🔍 Category search result:', {
            searchTerm: messageText,
            foundCategory: selectedCategory ? { name: selectedCategory.name, erp_id: selectedCategory.erp_id } : null,
            searchByERP: categories.some(c => c.erp_id.toString() === messageText),
            searchByName: categories.some(c => c.name.toLowerCase().includes(messageText.toLowerCase())),
            allCategoryERPIds: categories.map(c => c.erp_id.toString()),
            exactMatch: categories.find(c => c.erp_id.toString() === messageText)
        });

        if (selectedCategory) {
            console.log('✅ Updating conversation state with selected category:', {
                id: selectedCategory._id,
                erp_id: selectedCategory.erp_id,
                name: selectedCategory.name,
                description: selectedCategory.description
            });
            
            const updatePayload = {
                currentStep: 'product_selection',
                'conversationData.selectedCategory': {
                    id: selectedCategory._id,
                    erp_id: selectedCategory.erp_id,
                    name: selectedCategory.name,
                    description: selectedCategory.description
                }
            };
            console.log('📤 Update payload:', JSON.stringify(updatePayload, null, 2));
            
            try {
                const updatedState = await conversationService.updateConversationState(from, updatePayload);
                console.log('📥 Update response received:', {
                    success: !!updatedState,
                    currentStep: updatedState?.currentStep,
                    selectedCategory: updatedState?.conversationData?.selectedCategory,
                    hasCategory: !!updatedState?.conversationData?.selectedCategory?.id,
                    fullState: JSON.stringify(updatedState, null, 2)
                });

                // Verify the update was successful by reading back the state
                const verificationState = await conversationService.getConversationState(from);
                console.log('� Verification - state after update:', {
                    currentStep: verificationState?.currentStep,
                    selectedCategory: verificationState?.conversationData?.selectedCategory,
                    hasCategory: !!verificationState?.conversationData?.selectedCategory?.id,
                    categoryId: verificationState?.conversationData?.selectedCategory?.id,
                    categoryName: verificationState?.conversationData?.selectedCategory?.name
                });

                if (!verificationState?.conversationData?.selectedCategory?.id) {
                    console.error('❌ CRITICAL: Category update failed to persist in database!');
                    await mongoLogger.logError(new Error('Category selection failed to persist'), {
                        source: 'category-selection-persistence',
                        from: from,
                        selectedCategory: selectedCategory,
                        updatePayload: updatePayload,
                        updatedState: updatedState,
                        verificationState: verificationState
                    });
                    
                    // Retry the update
                    console.log('🔄 Retrying category update...');
                    const retryState = await conversationService.updateConversationState(from, updatePayload);
                    console.log('🔄 Retry result:', retryState);
                } else {
                    console.log('✅ Category successfully persisted in database');
                }

                console.log('�📤 Sending product selection for category:', selectedCategory.name);
            await this.sendProductSelection(from);
            } catch (updateError) {
                console.error('❌ Error updating conversation state with category:', updateError);
                await mongoLogger.logError(updateError, {
                    source: 'category-selection-update',
                    from: from,
                    selectedCategory: selectedCategory,
                    updatePayload: updatePayload
                });
                
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, I encountered an error saving your category selection. Please try again."
                );
                return;
            }
        } else {
            console.log('❌ No category found for:', messageText);
            await this.whatsappService.sendMessage(
                from,
                "I didn't quite catch that. Please select a category from the list above or type the category name."
            );
        }
    }

    async sendProductSelection(from, messageId = null) {
        console.log('🚨 sendProductSelection called for:', from, '- This should not be called during greeting response!');
        try {
        // Get conversation state to access selected category
        const conversationState = await conversationService.getConversationState(from);
            console.log('📋 sendProductSelection - Current conversation state:', {
                from: from,
                currentStep: conversationState?.currentStep,
                selectedCategory: conversationState?.conversationData?.selectedCategory,
                hasCategory: !!conversationState?.conversationData?.selectedCategory?.id,
                categoryId: conversationState?.conversationData?.selectedCategory?.id,
                categoryName: conversationState?.conversationData?.selectedCategory?.name,
                fullConversationData: JSON.stringify(conversationState?.conversationData, null, 2)
            });

        const selectedCategory = conversationState.conversationData?.selectedCategory;
        console.log('Selected category ', selectedCategory);

        if (!selectedCategory || !selectedCategory.id) {
                console.error('❌ CRITICAL: No selected category found in sendProductSelection!');
                await mongoLogger.logError(new Error('No selected category in sendProductSelection'), {
                    source: 'send-product-selection',
                    from: from,
                    conversationState: conversationState
                });
                
            await this.whatsappService.sendMessage(
                from,
                "Sorry, I couldn't find the selected category. Please start over by selecting a category."
            );
            return;
        }

        // Get products by category ID to validate against
        const allProducts = await conversationService.getProductsByCategory(selectedCategory.id);

        if (!allProducts || allProducts.length === 0) {
            await this.whatsappService.sendMessage(
                from,
                `Sorry, no products are available in the ${selectedCategory.name} category at the moment. Please try another category.`
            );
            return;
        }

        // Get all the information we have so far
        const conversationData = conversationState.conversationData || {};
        
        // Show available products with collected information
        let bodyText = `Perfect! 🎯 I see you need a quote for **${selectedCategory.name}** products.\n\n`;
        
        // Show collected information if any
        let hasCollectedInfo = false;
        if (conversationData.selectedMaterial?.name || conversationData.requestedMaterial) {
            bodyText += `🧱 **Material:** ${conversationData.selectedMaterial?.name || conversationData.requestedMaterial}\n`;
            hasCollectedInfo = true;
        }
        if (conversationData.quantity?.length > 0) {
            bodyText += `🔢 **Quantity:** ${conversationData.quantity.join(', ')}\n`;
            hasCollectedInfo = true;
        }
        if (conversationData.dimensions?.length > 0) {
            const dimensionsText = conversationData.dimensions.map(d => `${d.name}: ${d.value}`).join(', ');
            bodyText += `📏 **Dimensions:** ${dimensionsText}\n`;
            hasCollectedInfo = true;
        }
        if (conversationData.selectedFinish?.length > 0) {
            const finishNames = conversationData.selectedFinish.map(f => f.name).join(', ');
            bodyText += `✨ **Finishes:** ${finishNames}\n`;
            hasCollectedInfo = true;
        }
        
        if (hasCollectedInfo) {
            bodyText += `\n`;
        }
        
        // Show available products list
        const productList = allProducts.map((product, index) => `${index + 1}. ${product.name}`).join('\n');
        
        bodyText += `Here are the available products in **${selectedCategory.name}**:\n\n${productList}\n\nPlease select a product by:\n• Typing the product name (e.g., "${allProducts[0].name}")\n• Or just the number (e.g., "1" for ${allProducts[0].name})`;

        if (messageId) {
            await this.sendMessageOnce(messageId, from, bodyText);
        } else {
            await this.sendMessageFallback(from, bodyText);
        }
    } catch (error) {
        console.error('Error in sendProductSelection:', error);
        await mongoLogger.logError(error, {
            source: 'send-product-selection',
            from: from,
            selectedCategory: selectedCategory
        });
        
        await this.whatsappService.sendMessage(
            from,
            "Sorry, I encountered an error while preparing the product selection. Please try again."
        );
    }
    }

    async handleProductSelection(messageText, from) {
        try {
            // Get conversation state to access selected category
            const conversationState = await conversationService.getConversationState(from);
            const selectedCategory = conversationState.conversationData?.selectedCategory;
            const requestedProductName = conversationState.conversationData?.requestedProductName;

            if (!selectedCategory || !selectedCategory.id) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, I couldn't find the selected category. Please start over by selecting a category."
                );
                return;
            }

            // Get products by category ID
            const products = await conversationService.getProductsByCategory(selectedCategory.id);
            let selectedProduct = null;

            // Use requested product name from Wit.ai if available, otherwise use messageText
            const searchTerm = requestedProductName || messageText;
            
            console.log('🔍 Product selection search details:', {
                messageText,
                requestedProductName,
                searchTerm,
                selectedCategory: selectedCategory?.name,
                hasQuantity: !!conversationState.conversationData?.quantity?.length,
                quantity: conversationState.conversationData?.quantity
            });

            // Check if the message contains quantity information but no specific product name
            const hasQuantityInfo = conversationState.conversationData?.quantity?.length > 0;
            const isGenericQuoteRequest = messageText.toLowerCase().includes('quote') && 
                                        messageText.toLowerCase().includes('qty');
            
            if (hasQuantityInfo && isGenericQuoteRequest && !requestedProductName) {
                console.log('📋 User provided quantity but no specific product, asking for product selection');
                
                // Acknowledge the quantity and ask for product selection
                const quantity = conversationState.conversationData?.quantity?.[0];
                const quantityText = quantity ? `${quantity.toLocaleString()} pieces` : 'the specified quantity';
                
                await this.whatsappService.sendMessage(
                    from,
                    `Great! I see you need a quote for ${quantityText}. Now please select a product from the ${selectedCategory.name} category:`
                );
                
                await this.sendProductSelection(from);
                return;
            }

            // Check if it's a numeric selection (e.g., "1", "2", etc.)
            const numericSelection = parseInt(searchTerm);
            if (!isNaN(numericSelection) && numericSelection > 0 && numericSelection <= products.length) {
                selectedProduct = products[numericSelection - 1];
                console.log(`🔢 Selected product by number: ${numericSelection} -> ${selectedProduct.name}`);
            } else {
                // Check if it's a direct product ERP ID or find by name
                selectedProduct = products.find(p =>
                    p.erp_id.toString() === searchTerm ||
                    p.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            if (selectedProduct) {
                await conversationService.updateConversationState(from, {
                    currentStep: 'dimension_input',
                    'conversationData.selectedProduct': {
                        id: selectedProduct.erp_id.toString(),
                        erp_id: selectedProduct.erp_id,
                        name: selectedProduct.name,
                        description: selectedProduct.description,
                        basePrice: selectedProduct.basePrice,
                        dimensionFields: selectedProduct.dimensionFields
                    }
                });

                // Check if dimensions are already provided from Wit.ai
                const conversationData = conversationState.conversationData || {};
                if (conversationData.dimensions && conversationData.dimensions.length > 0) {
                    // Skip dimension input and go to material selection
                    await conversationService.updateConversationState(from, {
                        currentStep: 'material_selection'
                    });
                    await this.sendMaterialSelection(from, selectedProduct);
                } else {
                    await this.sendDimensionRequest(from, selectedProduct);
                }
            } else {
                    // Check if this looks like a quote request rather than a specific product name
                const isQuoteRequest = messageText.toLowerCase().includes('quote') || 
                                     messageText.toLowerCase().includes('need') ||
                                     messageText.toLowerCase().includes('want') ||
                                     messageText.toLowerCase().includes('get');
                
                // Also check if the message contains the category name (likely a generic request)
                const containsCategoryName = selectedCategory.name.toLowerCase().split(' ').some(word => 
                    messageText.toLowerCase().includes(word.toLowerCase())
                );
                
                if (isQuoteRequest || containsCategoryName) {
                    console.log('🎯 Detected generic quote request, showing product list');
                    
                    // Show available products list
                    if (products && products.length > 0) {
                        const productList = products.map((p, index) => `${index + 1}. ${p.name}`).join('\n');
                        
                        await this.whatsappService.sendMessage(
                            from,
                            `Great! I see you need a quote for *${selectedCategory.name}* products. 📦\n\nHere are the available products:\n\n${productList}\n\nPlease type the name of the product you're interested in, or just the product number (e.g., "1" for ${products[0].name}).`
                        );
                    } else {
                        await this.whatsappService.sendMessage(
                            from,
                            `I understand you need a quote for ${selectedCategory.name}, but no products are available in this category at the moment. Please contact our support team.`
                        );
                    }
                } else {
                    await this.whatsappService.sendMessage(
                        from,
                        `I couldn't find a product named "${searchTerm}" in the ${selectedCategory.name} category. Please try a different product name or check the spelling.`
                    );
                }
            }
        } catch (error) {
            await mongoLogger.logError(error, { source: 'handle-product-selection' });
            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error processing your product selection. Please try again."
            );
        }
    }

    async sendDimensionRequest(from, product) {
        const dimensionFields = product.dimensionFields || [];
        const dimensionNames = dimensionFields.map(field => field.name);

        // Get conversation state to show all collected information
        const conversationState = await conversationService.getConversationState(from);
        const conversationData = conversationState.conversationData || {};

        let message = `Perfect! You selected: **${product.name}** 📏\n\n`;
        
        // Show all collected information
        message += `Here's what I have so far:\n`;
        message += `📂 **Category:** ${conversationData.selectedCategory?.name || 'Not specified'}\n`;
        message += `🧱 **Material:** ${conversationData.selectedMaterial?.name || conversationData.requestedMaterial || 'Not specified'}\n`;
        message += `🔢 **Quantity:** ${conversationData.quantity?.join(', ') || 'Not specified'}\n`;
        message += `✨ **Finishes:** ${conversationData.selectedFinish?.map(f => f.name).join(', ') || 'Not specified'}\n\n`;
        
        message += `Now I need the ${dimensionNames.length === 1 ? 'dimension' : 'dimensions'} for your product.\n\n`;
        
        // Create appropriate example based on the number of dimensions
        if (dimensionNames.length === 1) {
            message += `📏 **Required:** ${dimensionNames[0]} (Diameter)\n\n`;
            message += `**Examples:**\n• Just one value: "5"\n• With label: "${dimensionNames[0]}:5"\n\n`;
        } else if (dimensionNames.length === 2) {
            message += `📏 **Required:** ${dimensionNames.join(' x ')}\n\n`;
            message += `**Examples:**\n• Two values: "${dimensionNames.map(() => '5').join(' x ')}" or "${dimensionNames.map(() => '5').join(', ')}"\n• With labels: "${dimensionNames.map((name, i) => `${name}:5`).join(', ')}"\n\n`;
        } else {
            message += `📏 **Required:** ${dimensionNames.join(' x ')}\n\n`;
            message += `**Examples:**\n• ${dimensionNames.length} values: "${dimensionNames.map(() => '5').join(' x ')}" or "${dimensionNames.map(() => '5').join(', ')}"\n• With labels: "${dimensionNames.map((name, i) => `${name}:5`).join(', ')}"\n\n`;
        }
        
        message += `All dimensions should be in inches.`;

        await this.whatsappService.sendMessage(from, message);
    }

    async handleDimensionInput(messageText, from, conversationData, message = null) {
        try {
            // Check if we're waiting for dimension confirmation
            if (conversationData.awaitingDimensionConfirmation && conversationData.pendingDimensions) {
                const response = messageText.toLowerCase().trim();
                
                if (response.includes('yes') || response.includes('y') || response.includes('correct') || response.includes('ok')) {
                    // User confirmed the dimensions
                    const dimensions = conversationData.pendingDimensions;
                    const dimensionsList = dimensions.map(d => `${d.name}: ${d.value}`).join(', ');
                    
                    await this.whatsappService.sendMessage(
                        from,
                        `✅ Great! Confirmed dimensions: **${dimensionsList}**\n\nMoving to the next step...`
                    );
                    
                    // Update conversation state with confirmed dimensions
                    await conversationService.updateConversationState(from, {
                        'conversationData.dimensions': dimensions,
                        'conversationData.pendingDimensions': null,
                        'conversationData.awaitingDimensionConfirmation': false
                    });

                    // Move to next step
                    const nextStep = this.getNextStepAfterBypass('dimension_input', { ...conversationData, dimensions });
                    await conversationService.updateConversationState(from, {
                        currentStep: nextStep
                    });

                    // Process the next step
                    const updatedState = await conversationService.getConversationState(from);
                    await this.processConversationFlow(message, messageText, from, updatedState, false);
                    return;
                    
                } else {
                    // User wants to provide different dimensions
                    await conversationService.updateConversationState(from, {
                        'conversationData.pendingDimensions': null,
                        'conversationData.awaitingDimensionConfirmation': false
                    });
                    
                    const product = await conversationService.getProductById(conversationData.selectedProduct.id);
                    const dimensionNames = product.dimensionFields.map(f => f.name);
                    
                    await this.whatsappService.sendMessage(
                        from,
                        `No problem! Please provide the correct dimensions for **${product.name}**:\n\nRequired: **${dimensionNames.join(', ')}**\n\nFormat: **${dimensionNames.join(' x ')}** (e.g., "${dimensionNames.map(() => '5').join(' x ')}")`
                    );
                    return;
                }
            }
            
            // Check if dimensions already exist
            if (conversationData.dimensions && conversationData.dimensions.length > 0) {
                console.log("Dimensions already exist, bypassing dimension input step");

                // Bypass dimension_input and move to next step
                const nextStep = this.getNextStepAfterBypass('dimension_input', conversationData);

                await conversationService.updateConversationState(from, {
                    currentStep: nextStep
                });

                // Process the next step
                const updatedState = await conversationService.getConversationState(from);
                await this.processConversationFlow(message, messageText, from, updatedState, false);
                return;
            }

            // Check if we have a selected product
            if (!conversationData.selectedProduct || !conversationData.selectedProduct.id) {
                console.log("No selected product, checking conversation state:", {
                    hasCategory: !!conversationData.selectedCategory?.id,
                    selectedCategory: conversationData.selectedCategory,
                    messageText: messageText
                });

                // Check if we have a selected category
                if (!conversationData.selectedCategory || !conversationData.selectedCategory.id) {
                    console.log("No selected category, asking for category selection");
                    await conversationService.updateConversationState(from, {
                        currentStep: 'category_selection'
                    });
                    await this.sendCategorySelection(from);
                    return;
                } else {
                    console.log("Have category, asking for product selection");
                    await this.sendProductSelection(from);
                    return;
                }
            }

            // Try to extract dimensions from the message using ChatGPT
            console.log("Attempting to extract dimensions from message:", messageText);
            
            try {
                const aiResponse = await this.aiService.processMessage(messageText);
                console.log("ChatGPT response for dimensions:", JSON.stringify(aiResponse, null, 2));

                if (aiResponse.data && aiResponse.data.entities && aiResponse.data.entities['dimensions:dimensions']) {
                    console.log("Found dimensions in ChatGPT response, processing...");
                    
                    // Extract and update conversation data with dimensions
                    const updatedData = await this.extractAndUpdateConversationData(aiResponse.data.entities, conversationData, messageText);
                    
                    if (updatedData.dimensions && updatedData.dimensions.length > 0) {
                        console.log("Successfully extracted dimensions:", updatedData.dimensions);
                        
                        // Update conversation state with dimensions (store in conversationData)
                        await conversationService.updateConversationState(from, {
                            'conversationData.dimensions': updatedData.dimensions
                        });

                        // Move to next step
                        const nextStep = this.getNextStepAfterBypass('dimension_input', updatedData);
                        await conversationService.updateConversationState(from, {
                            currentStep: nextStep
                        });

                        // Process the next step
                        const updatedState = await conversationService.getConversationState(from);
                        await this.processConversationFlow(message, messageText, from, updatedState, false);
                        return;
                    }
                }
            } catch (aiError) {
                console.log("ChatGPT extraction failed, trying manual parsing:", aiError.message);
            }

            // If ChatGPT extraction failed, try manual parsing - but only for simple dimension responses
            // Check if this looks like a complex quote request rather than a dimension response
            const quoteRequestIndicators = ['looking for', 'need', 'want', 'quote', 'pouches', 'bags', 'labels', 'standard size', 'different', 'flavors', 'designs', 'inside'];
            const isComplexQuoteRequest = quoteRequestIndicators.some(indicator => 
                messageText.toLowerCase().includes(indicator)
            );
            
            if (isComplexQuoteRequest) {
                console.log("Detected complex quote request, not parsing as dimensions:", messageText);
                // This is a quote request, not dimension input - ask for dimensions
                const product = await conversationService.getProductById(conversationData.selectedProduct.id);
                if (product && product.dimensionFields) {
                    const dimensionNames = product.dimensionFields.map(f => f.name);
                    await this.whatsappService.sendMessage(
                        from,
                        `Thank you for your quote request! 📋\n\nTo proceed, I need the dimensions for your **${product.name}**.\n\n📏 Required: **${dimensionNames.join(', ')}**\n\n*Format:* **${dimensionNames.join(' x ')}** (e.g., "${dimensionNames.map(() => '5').join(' x ')}")\n\nAll dimensions should be in inches.`
                    );
                }
                return;
            }
            
            const product = await conversationService.getProductById(conversationData.selectedProduct.id);
            if (product && product.dimensionFields) {
                const dimensionNames = product.dimensionFields.map(f => f.name);
                const dimensionValues = this.parseDimensionValues(messageText);
                
                console.log('🔍 Dimension matching details:', {
                    productName: product.name,
                    requiredDimensions: dimensionNames,
                    requiredCount: dimensionNames.length,
                    providedValues: dimensionValues,
                    providedCount: dimensionValues.length,
                    messageText
                });
                
                if (dimensionValues.length > 0) {
                    console.log("Manually parsed dimensions:", dimensionValues);
                    
                    // Check if the number of provided values matches required dimensions
                    if (dimensionValues.length > dimensionNames.length) {
                        // Too many dimensions provided
                        const extraDimensions = dimensionValues.slice(dimensionNames.length);
                        await this.whatsappService.sendMessage(
                            from,
                            `I notice you provided ${dimensionValues.length} dimensions (${dimensionValues.join(', ')}), but **${product.name}** only requires **${dimensionNames.length} dimension${dimensionNames.length > 1 ? 's' : ''}**: **${dimensionNames.join(', ')}**.\n\nI'll use the first ${dimensionNames.length} value${dimensionNames.length > 1 ? 's' : ''}: **${dimensionValues.slice(0, dimensionNames.length).join(', ')}**\n\nIs this correct? Reply 'yes' to continue or provide the correct dimension${dimensionNames.length > 1 ? 's' : ''}.`
                        );
                        
                        // Use only the required number of dimensions
                        const limitedValues = dimensionValues.slice(0, dimensionNames.length);
                        const dimensions = [];
                        product.dimensionFields.forEach((field, index) => {
                            if (limitedValues[index] !== undefined) {
                                dimensions.push({
                                    name: field.name,
                                    value: limitedValues[index]
                                });
                            }
                        });
                        
                        // Store the dimensions but wait for user confirmation
                        await conversationService.updateConversationState(from, {
                            'conversationData.pendingDimensions': dimensions,
                            'conversationData.awaitingDimensionConfirmation': true
                        });
                        return;
                        
                    } else if (dimensionValues.length < dimensionNames.length) {
                        // Not enough dimensions provided
                        const missingCount = dimensionNames.length - dimensionValues.length;
                        const providedDimensionsList = dimensionNames.slice(0, dimensionValues.length).map((name, index) => 
                            `${name}: ${dimensionValues[index]}`
                        ).join(', ');
                        const missingDimensions = dimensionNames.slice(dimensionValues.length);
                        
                        await this.whatsappService.sendMessage(
                            from,
                            `I received: **${providedDimensionsList}**\n\nBut **${product.name}** needs **${missingCount} more dimension${missingCount > 1 ? 's' : ''}**: **${missingDimensions.join(', ')}**\n\nPlease provide the missing dimension${missingCount > 1 ? 's' : ''}, or provide all dimensions in this format:\n**${dimensionNames.join(' x ')}** (e.g., "${dimensionNames.map(() => '5').join(' x ')}")`
                        );
                        return;
                        
                    } else {
                        // Perfect match - correct number of dimensions
                        const dimensions = [];
                        product.dimensionFields.forEach((field, index) => {
                            if (dimensionValues[index] !== undefined) {
                                dimensions.push({
                                    name: field.name,
                                    value: dimensionValues[index]
                                });
                            }
                        });

                        if (dimensions.length > 0) {
                            console.log("Successfully parsed dimensions manually:", dimensions);
                            
                            // Send confirmation message
                            const dimensionsList = dimensions.map(d => `${d.name}: ${d.value}`).join(', ');
                            await this.whatsappService.sendMessage(
                                from,
                                `✅ Perfect! I've set your dimensions: **${dimensionsList}**\n\nMoving to the next step...`
                            );
                            
                            // Update conversation state with dimensions (store in conversationData)
                            await conversationService.updateConversationState(from, {
                                'conversationData.dimensions': dimensions
                            });

                            // Move to next step
                            const nextStep = this.getNextStepAfterBypass('dimension_input', { ...conversationData, dimensions });
                            await conversationService.updateConversationState(from, {
                                currentStep: nextStep
                            });

                            // Process the next step
                            const updatedState = await conversationService.getConversationState(from);
                            await this.processConversationFlow(message, messageText, from, updatedState, false);
                            return;
                        }
                    }
                }
            }

            // If no dimensions were extracted, ask for them

            if (!product || !product.dimensionFields) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, this product doesn't have dimension requirements. Let me help you with the next step."
                );
                return;
            }

            // Ask for dimensions with product-specific dimension names
            const dimensionNames = product.dimensionFields.map(f => f.name);
            
            // Create appropriate example based on the number of dimensions
            let exampleFormat = '';
            let exampleValues = '';
            if (dimensionNames.length === 1) {
                exampleFormat = `**${dimensionNames[0]}** (e.g., "5")`;
                exampleValues = `Just one value: "5"`;
            } else if (dimensionNames.length === 2) {
                exampleFormat = `**${dimensionNames.join(' x ')}** (e.g., "5 x 8")`;
                exampleValues = `Two values: "5 x 8" or "5, 8"`;
            } else {
                exampleFormat = `**${dimensionNames.join(' x ')}** (e.g., "5 x 8 x 3")`;
                exampleValues = `${dimensionNames.length} values: "${dimensionNames.map(() => '5').join(' x ')}" or "${dimensionNames.map(() => '5').join(', ')}"`;
            }

            await this.whatsappService.sendMessage(
                from,
                `Please provide the ${dimensionNames.length === 1 ? 'dimension' : 'dimensions'} for your **${product.name}**:\n\n📏 **Required:** ${exampleFormat}\n\n**Examples:**\n• ${exampleValues}\n• With labels: "${dimensionNames.map((name, i) => `${name}:5`).join(', ')}"\n\nAll dimensions should be in inches.`
            );
        } catch (error) {
            console.error('Error in handleDimensionInput:', error);
            await mongoLogger.logError(error, {
                source: 'dimension-input-handler',
                from: from,
                messageText: messageText
            });

            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error processing your dimensions. Please try again."
            );
        }
    }

    async sendMaterialSelection(from, selectedProduct) {
        const product = await conversationService.getProductById(selectedProduct.id);
        
        // Get current conversation data to show what we already have
        const conversationState = await conversationService.getConversationState(from);
        const conversationData = conversationState.conversationData || {};

        const sections = [{
            title: "Available Materials",
            rows: product.availableMaterials.map(material => ({
                id: material.name,
                title: material.name,
                description: `${material.description} - $${material.pricePerUnit}/unit`
            }))
        }];

        // Build acknowledgment message with collected details
        let acknowledgmentText = "Great! I have the following details from your message:\n\n";
        
        if (conversationData.selectedProduct) {
            acknowledgmentText += `• Product: ${conversationData.selectedProduct.name}\n`;
        }
        
        if (conversationData.quantity && conversationData.quantity.length > 0) {
            const quantity = conversationData.quantity[0];
            acknowledgmentText += `• Quantity: ${quantity.toLocaleString()} pieces\n`;
        }
        
        if (conversationData.selectedFinish && conversationData.selectedFinish.length > 0) {
            const finishNames = conversationData.selectedFinish.map(f => f.name).join(', ');
            acknowledgmentText += `• Finishes: ${finishNames}\n`;
        }
        
        if (conversationData.skus) {
            acknowledgmentText += `• SKUs: ${conversationData.skus}\n`;
        }
        
        acknowledgmentText += `\nNow please select the material for your ${product.name}:`;

        await this.whatsappService.sendListMessage(
            from,
            acknowledgmentText,
            "Select Material",
            sections
        );
    }

    async sendMaterialRequest(from, selectedCategory) {
        try {
            const category = await this.findCategoryById(selectedCategory.id);

            if (!category) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, category not found. Please try again."
                );
                return;
            }

            // Fetch materials for this category from Material model
            const materials = await Material.find({
                categoryId: selectedCategory.id,
                isActive: true
            }).sort({ sortOrder: 1, name: 1 });

            if (!materials || materials.length === 0) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, no materials are available for this category. Please contact support."
                );
                return;
            }

            // Get conversation state to show all collected information
            const conversationState = await conversationService.getConversationState(from);
            const conversationData = conversationState.conversationData || {};

            let message = `Great! Now please select the material for your ${category.name} products.\n\n`;
            
            // Show all collected information
            message += `Here's what I have so far:\n`;
            message += `📂 **Category:** ${conversationData.selectedCategory?.name || 'Not specified'}\n`;
            message += `🔧 **Product:** ${conversationData.selectedProduct?.name || 'Not specified'}\n`;
            message += `🔢 **Quantity:** ${conversationData.quantity?.join(', ') || 'Not specified'}\n`;
            message += `📏 **Dimensions:** ${conversationData.dimensions?.map(d => `${d.name}: ${d.value}`).join(', ') || 'Not specified'}\n`;
            message += `✨ **Finishes:** ${conversationData.selectedFinish?.map(f => f.name).join(', ') || 'Not specified'}\n\n`;
            message += `Type your material name.`;

            await this.whatsappService.sendMessage(from, message);
        } catch (error) {
            console.error('Error in sendMaterialRequest:', error);
            await mongoLogger.logError(error, {
                source: 'send-material-request',
                from: from
            });

            await this.whatsappService.sendMessage(
                from,
                "Please type the name of the material you want to use."
            );
        }
    }

    async sendFinishRequest(from, conversationData) {
        try {
            const category = await this.findCategoryById(conversationData.selectedCategory.id);

            if (!category) {
                await this.sendCategorySelection(from);
                await conversationService.updateConversationState(from, {
                    currentStep: 'category_selection'
                });
                return;
            }
            const product = await conversationService.getProductById(conversationData.selectedProduct.id);
            console.log("product111111111 ", product);

            if (!product) {
                await this.sendProductSelection(from);
                await conversationService.updateConversationState(from, {
                    currentStep: 'product_selection'
                });
                return;
            }

            // Fetch finishes for this category from ProductFinish model
            const finishes = await ProductFinish.find({
                productCategoryId: conversationData.selectedCategory.id,
                isActive: true
            }).sort({ sortOrder: 1, name: 1 });

            if (!finishes || finishes.length === 0) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, no finishes are available for this category. Please contact support."
                );
                return;
            }

            await this.whatsappService.sendMessage(
                from,
                `Great! Now please select the finishes for your ${product.name} product.\n\nType your finish names.`
            );
        } catch (error) {
            console.error('Error in sendFinishRequest:', error);
            await mongoLogger.logError(error, {
                source: 'send-finish-request',
                from: from
            });

            await this.whatsappService.sendMessage(
                from,
                "Please type the name of the finish you want to use."
            );
        }
    }

    async handleMaterialSelection(messageText, from, conversationData) {
        try {
            console.log('🔧 handleMaterialSelection called:', {
                messageText,
                hasSelectedMaterial: !!conversationData.selectedMaterial?.name,
                selectedMaterial: conversationData.selectedMaterial,
                selectedMaterialKeys: Object.keys(conversationData.selectedMaterial || {}),
                selectedMaterialName: conversationData.selectedMaterial?.name,
                selectedCategory: conversationData.selectedCategory?.name
            });
            
            // Check if this message looks like a dimension input (e.g., "8x9", "5x5x5")
            const isDimensionMessage = this.isDimensionMessage(messageText);
            
            // If this is the first time in material selection, ask for material
            // OR if the message looks like dimensions (transitioning from dimension_input step)
            if (!conversationData.selectedMaterial || !conversationData.selectedMaterial.name || isDimensionMessage) {
                if (isDimensionMessage) {
                    console.log('🎯 Detected dimension message in material selection step, asking for material:', messageText);
                }
                await this.sendMaterialRequest(from, conversationData.selectedCategory);
                return;
            }

            // User has provided material, process it
            const category = await this.findCategoryById(conversationData.selectedCategory.id);

            if (!category) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, category not found. Please try again."
                );
                return;
            }

            // Fetch materials for this category from Material model
            const materials = await Material.find({
                categoryId: conversationData.selectedCategory.id,
                isActive: true
            }).sort({ sortOrder: 1, name: 1 });

            if (!materials || materials.length === 0) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, no materials are available for this category. Please try again."
                );
                return;
            }

            // Find matching material with improved matching logic
            let selectedMaterial = null;
            
            // First check if user sent a number (list position)
            const trimmedText = messageText.trim();
            const listPosition = parseInt(trimmedText);
            
            if (!isNaN(listPosition) && listPosition >= 1 && listPosition <= materials.length) {
                // User selected by number (1-based indexing)
                selectedMaterial = materials[listPosition - 1];
                console.log(`🔢 User selected material by number ${listPosition}: ${selectedMaterial.name}`);
            } else {
                // Try exact match first
                selectedMaterial = materials.find(m =>
                    m.name.toLowerCase() === messageText.toLowerCase()
                );
                
                // If no exact match, try partial matching
                if (!selectedMaterial) {
                    selectedMaterial = materials.find(m =>
                        m.name.toLowerCase().includes(messageText.toLowerCase()) ||
                        messageText.toLowerCase().includes(m.name.toLowerCase())
                    );
                }
                
                // If still no match, try matching individual words for complex descriptions
                if (!selectedMaterial) {
                    const messageWords = messageText.toLowerCase().split(/[\s,+\-_]+/).filter(word => word.length > 2);
                    selectedMaterial = materials.find(m => {
                        const materialWords = m.name.toLowerCase().split(/[\s,+\-_]+/).filter(word => word.length > 2);
                        return messageWords.some(msgWord => 
                            materialWords.some(matWord => 
                                msgWord.includes(matWord) || matWord.includes(msgWord)
                            )
                        );
                    });
                }
            }
            
            console.log('🔍 Material search result:', {
                searchTerm: messageText,
                foundMaterial: selectedMaterial ? selectedMaterial.name : 'Not found',
                availableMaterials: materials.map(m => m.name)
            });

            if (selectedMaterial) {
                console.log("selectedMaterial ", selectedMaterial);
                
                // Send confirmation message
                await this.whatsappService.sendMessage(
                    from,
                    `✅ Great! I've selected *${selectedMaterial.name}* as your material.\n\nMoving to the next step...`
                );
                
                // Update conversation data with selected material
                await conversationService.updateConversationState(from, {
                    'conversationData.selectedMaterial': {
                        _id: selectedMaterial.erp_id.toString(),
                        name: selectedMaterial.name
                    }
                });

                // Bypass material_selection and move to next step
                const nextStep = this.getNextStepAfterBypass('material_selection', {
                    ...conversationData,
                    selectedMaterial: {
                        _id: selectedMaterial.erp_id.toString(),
                        name: selectedMaterial.name
                    }
                });

                await conversationService.updateConversationState(from, {
                    currentStep: nextStep
                });

                // Process the next step
                const updatedState = await conversationService.getConversationState(from);
                await this.processConversationFlow(null, messageText, from, updatedState);
            } else {
                // Get current conversation data to show what we already have
                const conversationState = await conversationService.getConversationState(from);
                const conversationData = conversationState.conversationData || {};
                
                // Build acknowledgment message with collected details
                let acknowledgmentText = "I have the following details from your message:\n\n";
                
                if (conversationData.selectedProduct) {
                    acknowledgmentText += `• Product: ${conversationData.selectedProduct.name}\n`;
                }
                
                if (conversationData.quantity && conversationData.quantity.length > 0) {
                    const quantity = conversationData.quantity[0];
                    acknowledgmentText += `• Quantity: ${quantity.toLocaleString()} pieces\n`;
                }
                
                if (conversationData.selectedFinish && conversationData.selectedFinish.length > 0) {
                    const finishNames = conversationData.selectedFinish.map(f => f.name).join(', ');
                    acknowledgmentText += `• Finishes: ${finishNames}\n`;
                }
                
                if (conversationData.skus) {
                    acknowledgmentText += `• SKUs: ${conversationData.skus}\n`;
                }
                
                // Show available materials to help user
                const availableMaterialsList = materials.map((m, index) => `${index + 1}. ${m.name}`).join('\n');
                
                acknowledgmentText += `\nI couldn't find a material named "${messageText}".\n\nAvailable materials for ${category.name}:\n${availableMaterialsList}\n\nPlease type the *number* (e.g., "7") or the full material name from the list above.`;
                
                await this.whatsappService.sendMessage(
                    from,
                    acknowledgmentText
                );
            }
        } catch (error) {
            console.error('Error in handleMaterialSelection:', error);
            await mongoLogger.logError(error, {
                source: 'material-selection-handler',
                from: from,
                messageText: messageText
            });

            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error processing your material selection. Please try again."
            );
        }
    }

    async sendFinishSelection(from, selectedProduct) {
        const product = await conversationService.getProductById(selectedProduct.id);

        const sections = [{
            title: "Available Finishes",
            rows: product.availableFinishes.map(finish => ({
                id: finish.name,
                title: finish.name,
                description: `${finish.description} - $${finish.pricePerUnit}/unit`
            }))
        }];

        const bodyText = `Excellent! Now please select the finish for your mylar bags:`;

        await this.whatsappService.sendListMessage(
            from,
            bodyText,
            "Select Finish",
            sections
        );
    }

    async handleFinishSelection(messageText, from, conversationData) {
        try {
            // Check if finishes already exist
            if (conversationData.selectedFinish && conversationData.selectedFinish.length > 0) {
                console.log("Finishes already exist, bypassing finish selection step");

                // Bypass finish_selection and move to next step
                const nextStep = this.getNextStepAfterBypass('finish_selection', conversationData);

                await conversationService.updateConversationState(from, {
                    currentStep: nextStep
                });

                // Process the next step
                const updatedState = await conversationService.getConversationState(from);
                await this.processConversationFlow(message, messageText, from, updatedState, false);
                return;
            }

            // Check if we have a selected product
            if (!conversationData.selectedProduct || !conversationData.selectedProduct.id) {
                console.log("No selected product, asking for product selection");
                await this.sendProductSelection(from);
                return;
            }
            console.log("sending Finish Request",);

            // We have a product, ask for finishes
            await this.sendFinishRequest(from, conversationData);
        } catch (error) {
            console.error('Error in handleFinishSelection:', error);
            await mongoLogger.logError(error, {
                source: 'finish-selection-handler',
                from: from,
                messageText: messageText
            });

            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error processing your finish selection. Please try again."
            );
        }
    }

    async sendQuantityRequest(from) {
        const message = `Almost done! 📊

Please tell me the quantity of mylar bags you need:

Examples:
• "500 pieces"
• "1000"
• "2500 bags"

What quantity would you like?`;

        await this.whatsappService.sendMessage(from, message);
    }

    async handleQuantityInput(messageText, from, conversationData) {
        try {
            // Check if quantity already exists
            if (conversationData.quantity && conversationData.quantity.length > 0) {
                console.log("Quantity already exists, bypassing quantity input step");

                // Bypass quantity_input and move to next step
                const nextStep = this.getNextStepAfterBypass('quantity_input', conversationData);

                await conversationService.updateConversationState(from, {
                    currentStep: nextStep
                });

                // Process the next step
                const updatedState = await conversationService.getConversationState(from);
                await this.processConversationFlow(message, messageText, from, updatedState, false);
                return;
            }

            // Check if we have all required data for quote generation
            if (!conversationData.selectedProduct || !conversationData.selectedMaterial ||
                !conversationData.selectedFinish || conversationData.selectedFinish.length === 0) {
                console.log("Missing required data for quote generation");

                // Guide user to complete missing steps
                if (!conversationData.selectedProduct) {
                    await this.sendProductSelection(from);
                    return;
                }
                if (!conversationData.selectedMaterial) {
                    await this.sendMaterialRequest(from, conversationData.selectedCategory);
                    return;
                }
                if (!conversationData.selectedFinish || conversationData.selectedFinish.length === 0) {
                    await this.sendFinishRequest(from, conversationData);
                    return;
                }
            }

            // We have all required data, ask for quantity
            await this.sendQuantityRequest(from);
        } catch (error) {
            console.error('Error in handleQuantityInput:', error);
            await mongoLogger.logError(error, {
                source: 'quantity-input-handler',
                from: from,
                messageText: messageText
            });

            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error processing your quantity. Please try again."
            );
        }
    }

    async handleQuoteGeneration(messageText, from, conversationData, message) {
        console.log("conversationData111111111 ", conversationData);
        try {
            // Check if this looks like a dimension message (e.g., "5x5x5", "10,8,3", etc.)
            const isDimensionMessage = this.isDimensionMessage(messageText);
            if (isDimensionMessage && (!conversationData.dimensions || conversationData.dimensions.length === 0)) {
                console.log("Detected dimension message in quote generation, processing as dimensions");
                
                // Get the product to know what dimensions are needed
                const product = conversationData.selectedProduct;
                if (product && product.dimensionFields) {
                    const dimensionNames = product.dimensionFields.map(f => f.name);
                    const parsedDimensions = await this.parseDimensionsManually(messageText, dimensionNames);
                    
                    if (parsedDimensions.length > 0) {
                        console.log("Successfully parsed dimensions from quote generation:", parsedDimensions);
                        
                        // Update conversation state with dimensions (store in conversationData)
                        await conversationService.updateConversationState(from, {
                            'conversationData.dimensions': parsedDimensions
                        });
                        
                        // Verify dimensions were stored
                        const verifyState = await conversationService.getConversationState(from);
                        console.log('🔍 Dimensions after storage:', verifyState.conversationData?.dimensions);
                        
                        // Move back to quote generation to continue
                        await conversationService.updateConversationState(from, {
                            currentStep: 'quote_generation'
                        });
                        
                        // Verify dimensions are still there after step update
                        const finalState = await conversationService.getConversationState(from);
                        console.log('🔍 Dimensions after step update:', finalState.conversationData?.dimensions);
                        
                        // Process the next step
                        const updatedState = await conversationService.getConversationState(from);
                        await this.processConversationFlow(message, messageText, from, updatedState, false);
                        return;
                    }
                }
            }
            
            // Validate required data before proceeding
            const validationResult = this.validateQuoteData(conversationData);
            if (!validationResult.isValid) {
                console.log("Missing required data for quote generation:", validationResult.missingFields);
                
                // Send helpful message about what's missing
                const missingMessage = `I need more information to generate your quote. Please provide:\n\n${validationResult.missingFields.join('\n')}\n\nLet's go back and collect this information.`;
                
                await this.whatsappService.sendMessage(from, missingMessage);
                
                // Reset to appropriate step based on what's missing
                const resetStep = this.getResetStepForMissingData(validationResult.missingFields, conversationData);
                await conversationService.updateConversationState(from, {
                    currentStep: resetStep
                });
                
                return;
            }

            // Check if this is the first time in quote generation (acknowledge selections)
            if (!conversationData.quoteAcknowledged) {
                // Format the acknowledgment message
                const categoryName = conversationData.selectedCategory?.name || 'Not specified';
                const productName = conversationData.selectedProduct?.name || 'Not specified';
                const materialName = conversationData.selectedMaterial?.name || 'Not specified';

                // Format finishes
                const finishNames = conversationData.selectedFinish?.map(f => f.name).join(', ') || 'Not specified';

                // Format dimensions
                const dimensionsText = conversationData.dimensions?.map(d => `${d.name}: ${d.value}`).join(', ') || 'Not specified';

                // Format quantities
                const quantitiesText = conversationData.quantity?.join(', ') || 'Not specified';

                // Format SKUs
                const skusText = conversationData.skus ? conversationData.skus.toString() : 'Not specified';

                const acknowledgmentMessage = `Perfect! 🎯 Let me confirm your selections:

📦 **Category:** ${categoryName}
🔧 **Product:** ${productName}
🧱 **Material:** ${materialName}
✨ **Finishes:** ${finishNames}
📏 **Dimensions:** ${dimensionsText}
🔢 **Quantities:** ${quantitiesText}
🎨 **SKUs/Designs:** ${skusText}

Based on the information you've provided, would you like me to generate pricing for your quote? 

Please reply with "Yes" to get pricing details, or "No" if you'd like to make any changes.`;

                await this.sendMessageOnce(
                    message.id,
                    from,
                    acknowledgmentMessage
                );

                // Mark as acknowledged and wait for response
                await conversationService.updateConversationState(from, {
                    'conversationData.quoteAcknowledged': true
                });

            } else {
                // Process user's response
                const response = messageText.toLowerCase().trim();

                // Check if user is responding to PDF request after pricing is done
                if (conversationData.pricing_done && !conversationData.wantsPdf) {
                    if (response.includes('yes') || response.includes('y') || response.includes('sure') || response.includes('ok')) {
                        // Check if already completed to prevent duplicate processing
                        if (conversationData.completed) {
                            console.log(`⏭️ Conversation already completed for ${from}, skipping duplicate PDF generation`);
                            return;
                        }

                        // User wants PDF, generate and send it
                        await conversationService.updateConversationState(from, {
                            'conversationData.wantsPdf': true
                        });

                        await this.generateAndSendPDF(from, conversationData, message.id);
                        
                        // Send completion message using sendMessageOnce to prevent duplicates
                        await this.sendMessageOnce(
                            message.id,
                            from,
                            `✅ **Quote Complete!** 

Thank you for using our quote system! Your PDF has been generated and sent.

Need another quote? Just say "Hi" or "New Quote" anytime! 🌟`
                        );

                        // Mark as fully completed
                        await conversationService.updateConversationState(from, {
                            'conversationData.completed': true,
                            currentStep: 'completed',
                            isActive: false
                        });

                    } else if (response.includes('no') || response.includes('n') || response.includes('not')) {
                        // Check if already completed to prevent duplicate processing
                        if (conversationData.completed) {
                            console.log(`⏭️ Conversation already completed for ${from}, skipping duplicate completion`);
                            return;
                        }

                        // User doesn't want PDF, end conversation
                        await this.sendMessageOnce(
                            message.id,
                            from,
                            `✅ **Quote Complete!** 

Thank you for using our quote system! 

Need another quote? Just say "Hi" or "New Quote" anytime! 🌟`
                        );

                        // Mark as completed without PDF
                        await conversationService.updateConversationState(from, {
                            'conversationData.completed': true,
                            currentStep: 'completed',
                            isActive: false
                        });
                    } else {
                        // Unclear response to PDF question
                        await this.sendMessageOnce(
                            message.id,
                            from,
                            "Would you like a PDF quote? Please reply with 'Yes' for PDF or 'No' to finish."
                        );
                    }
                } else if (!conversationData.pricing_done) {
                    // User is responding to initial pricing question
                    if (response.includes('yes') || response.includes('y') || response.includes('sure') || response.includes('ok')) {
                        // User wants pricing, generate and send quote
                        try {
                            console.log("User wants pricing, calling getPricingForQuote...");
                            const pricing = await this.getPricingForQuote(conversationData);
                            console.log("Pricing result:", pricing);

                            if (pricing && !pricing.error) {
                                // Store pricing in conversation data
                                await conversationService.updateConversationState(from, {
                                   
                                    'conversationData.pricingData': pricing,
                                    'conversationData.pricing_done': true
                                });

                                // Send beautiful pricing table
                                await this.sendPricingTable(from, conversationData, pricing, message.id);
                            } else {
                                // Handle pricing error
                                await this.sendMessageOnce(
                                    message.id,
                                    from,
                                    "Sorry, I couldn't get pricing information at the moment. Please try again later or contact our support team."
                                );
                            }
                        } catch (pricingError) {
                            console.error("Error in pricing generation:", pricingError);
                            await mongoLogger.logError(pricingError, {
                                source: 'pricing-generation',
                                from: from,
                                conversationData: conversationData
                            });
                            
                            await this.sendMessageOnce(
                                message.id,
                                from,
                                "Sorry, I encountered an error generating your pricing. Please try again later or contact our support team."
                            );
                        }
                    } else if (response.includes('no') || response.includes('n') || response.includes('not')) {
                        // User doesn't want pricing, end conversation gracefully
                        const goodbyeMessage = `No problem! 😊 

I'm always here to help you whenever you need a quote. Just say "Hi" or "Get Quote" anytime you're ready, and I'll be happy to assist you with pricing for your products.

Have a great day! 🌟`;

                        await this.sendMessageOnce(
                            message.id,
                            from,
                            goodbyeMessage
                        );

                        // Inactivate conversation
                        await conversationService.updateConversationState(from, {
                            currentStep: 'completed',
                            isActive: false,
                            'conversationData.completed': true
                        });

                    } else {
                        // Unclear response, ask for clarification
                        await this.sendMessageOnce(
                            message.id,
                            from,
                            "I didn't quite catch that. Please reply with 'Yes' if you'd like pricing details, or 'No' if you'd like to make changes."
                        );
                    }
                } else {
                    // Unclear response, ask for clarification
                    await this.sendMessageOnce(
                        message.id,
                        from,
                        "I didn't quite catch that. Please reply with 'Yes' if you'd like pricing details, or 'No' if you'd like to make changes."
                    );
                }
            }

        } catch (error) {
            console.error('Error in handleQuoteGeneration:', error);
            await mongoLogger.logError(error, {
                source: 'quote-generation-handler',
                from: from,
                messageText: messageText
            });

            await this.sendMessageOnce(
                message.id,
                from,
                "Sorry, I encountered an error processing your request. Please try again or type 'hi' to restart."
            );
        }
    }

    async getPricingForQuote(conversationData) {
        try {
            console.log("getPricingForQuote - conversationData:", JSON.stringify(conversationData, null, 2));
            
            // Prepare the payload for the pricing API
            const payload = {
                file_type: conversationData.selectedCategory?.erp_id?.toString() || "1",
                product_id: conversationData.selectedProduct?.erp_id || 26,
                material_id: conversationData.selectedMaterial?._id || 55,
                finishes: conversationData.selectedFinish?.map(finish => {
                    console.log("Processing finish:", finish);
                    const finishId = parseInt(finish._id);
                    if (isNaN(finishId)) {
                        console.error("Invalid finish ID:", finish._id);
                        throw new Error(`Invalid finish ID: ${finish._id}`);
                    }
                    return {
                        id: finishId,
                        value: null
                    };
                }) || [],
                quantities: conversationData.quantity || [],
                dimensions: conversationData.dimensions?.map(dim => dim.value) || []
            };


            console.log("payload", payload);
            console.log("Pricing API Payload:", JSON.stringify(payload, null, 2));

            // Make API call to get pricing
            console.log("Making API call to:", `${process.env.ERP_API_BASE_URL}/api/get-quote-price-for-whatsapp`);
            
            const response = await fetch(`${process.env.ERP_API_BASE_URL}/api/get-quote-price-for-whatsapp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${process.env.PRICING_API_TOKEN || ''}`,
                    // Add any other required headers
                },
                body: JSON.stringify(payload)
            });

            console.log("API Response status:", response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error Response:", errorText);
                throw new Error(`Pricing API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const pricingData = await response.json();
            console.log("Pricing API Response:", pricingData);

            return pricingData;

        } catch (error) {
            console.error('Error getting pricing for quote:', error);
            await mongoLogger.logError(error, {
                source: 'pricing-api-call',
                conversationData: conversationData
            });
            
            // Return a default pricing structure or null
            return {
                error: true,
                message: 'Failed to get pricing information',
                details: error.message
            };
        }
    }

    async sendPricingTable(from, conversationData, pricingData, messageId = null) {
        try {
            const { qty, unit_cost } = pricingData;
            
            // Create beautiful pricing table
            let pricingMessage = `🎉 **Your Quote is Ready!** 🎉\n\n`;
            
            // Add product details
            pricingMessage += `📦 **Product:** ${conversationData.selectedProduct?.name || 'N/A'}\n`;
            pricingMessage += `🧱 **Material:** ${conversationData.selectedMaterial?.name || 'N/A'}\n`;
            pricingMessage += `✨ **Finishes:** ${conversationData.selectedFinish?.map(f => f.name).join(', ') || 'N/A'}\n`;
            pricingMessage += `📏 **Dimensions:** ${conversationData.dimensions?.map(d => `${d.name}: ${d.value}`).join(', ') || 'N/A'}\n\n`;
            
            // Create pricing table
            pricingMessage += `💰 **PRICING BREAKDOWN**\n`;
            pricingMessage += `┌─────────────┬─────────────┬─────────────┐\n`;
            pricingMessage += `│    Tier     │  Quantity   │ Unit Price  │\n`;
            pricingMessage += `├─────────────┼─────────────┼─────────────┤\n`;
            
            // Add each tier
            qty.forEach((quantity, index) => {
                const tier = index + 1;
                const unitPrice = unit_cost[index];
                const totalPrice = (quantity * unitPrice).toFixed(2);
                
                pricingMessage += `│   Tier ${tier}    │   ${quantity.toLocaleString()}   │   $${unitPrice.toFixed(3)}   │\n`;
            });
            
            pricingMessage += `└─────────────┴─────────────┴─────────────┘\n\n`;
            
            // Add total calculation for each tier
            pricingMessage += `📊 **TOTAL COST BY TIER**\n`;
            qty.forEach((quantity, index) => {
                const tier = index + 1;
                const unitPrice = unit_cost[index];
                const totalPrice = (quantity * unitPrice).toFixed(2);
                
                pricingMessage += `Tier ${tier}: ${quantity.toLocaleString()} units × $${unitPrice.toFixed(3)} = **$${totalPrice}**\n`;
            });
            
            pricingMessage += `\n✨ **Best Value:** Tier ${qty.length} at $${unit_cost[qty.length - 1].toFixed(3)} per unit\n\n`;
            
            // Ask for PDF
            pricingMessage += `📄 Would you like me to generate a detailed PDF quote for your records?\n\n`;
            pricingMessage += `Reply with "Yes" for PDF or "No" to finish.`;

            if (messageId) {
                await this.sendMessageOnce(messageId, from, pricingMessage);
            } else {
                await this.whatsappService.sendMessage(from, pricingMessage);
            }

        } catch (error) {
            console.error('Error sending pricing table:', error);
            await mongoLogger.logError(error, {
                source: 'pricing-table-sender',
                from: from,
                pricingData: pricingData
            });

            // Fallback message
            await this.whatsappService.sendMessage(
                from,
                "Here's your pricing information:\n\n" +
                `Quantities: ${pricingData.qty.join(', ')}\n` +
                `Unit Costs: $${pricingData.unit_cost.join(', $')}\n\n` +
                "Would you like a PDF quote? Reply Yes or No."
            );
        }
    }

    async generateAndSendPDF(from, conversationData, messageId = null) {
        try {
            console.log("Generating PDF for:", from);
            console.log("Conversation data for PDF:", JSON.stringify(conversationData, null, 2));
            
            // Create PDF document using PDFKit
            console.log("Creating PDF document...");
            const pdfBuffer = await this.createPDFDocument(conversationData);
            console.log("PDF document created, buffer size:", pdfBuffer.length);
            
            // For Vercel compatibility, try buffer approach first
            try {
                console.log("Attempting to send PDF via buffer...");
                // Send PDF directly from buffer (Vercel-friendly)
                await this.whatsappService.sendDocument(from, {
                    buffer: pdfBuffer,
                    filename: `Quote_${Date.now()}.pdf`,
                    caption: "📄 Here's your detailed quote PDF!"
                });
                
                console.log("PDF sent successfully via buffer to:", from);
                
            } catch (bufferError) {
                console.error("Buffer upload failed:", bufferError);
                console.log("Trying file approach...");
                
                // Fallback to file approach
                const tempPath = await this.createTempPDF(pdfBuffer, from);
                console.log("Temp PDF created at:", tempPath);
                
                // Send PDF via WhatsApp
                await this.whatsappService.sendDocument(from, {
                    link: tempPath,
                    filename: `Quote_${Date.now()}.pdf`,
                    caption: "📄 Here's your detailed quote PDF!"
                });
                
                console.log("PDF sent successfully via file to:", from);
            }
            
        } catch (error) {
            console.error('Error generating/sending PDF:', error);
            await mongoLogger.logError(error, {
                source: 'pdf-generation',
                from: from
            });
            
            // Fallback message - use sendMessageOnce to prevent duplicates
            await this.sendMessageOnce(
                messageId || 'pdf-error',
                from,
                "Sorry, I couldn't generate the PDF at the moment. However, you have all the pricing information above. Please contact our support if you need assistance."
            );
        }
    }

    async createPDFDocument(conversationData) {
        try {
            console.log("Starting PDF creation...");
            console.log("Conversation data:", JSON.stringify(conversationData, null, 2));
            
            // Import PDFKit dynamically
            console.log("Importing PDFKit...");
            const PDFDocument = (await import('pdfkit')).default;
            console.log("PDFKit imported successfully");
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margin: 0,
                layout: 'portrait'
            });
            const chunks = [];
            
            // Collect PDF data
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                console.log("PDF generation completed");
            });
            
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            
            // Set up colors
            const primaryColor = '#000000';
            const secondaryColor = '#333333';
            const accentColor = '#FFA500'; // Orange for highlights
            
            // Background
            doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
            
            // Vertical QUOTE text on the left
            doc.save()
               .translate(30, 100)
               .rotate(-90)
               .fontSize(48)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text('QUOTE', 0, 0)
               .restore();
            
            // Header section with logo area
            const headerY = 50;
            const contentStartX = 120;
            
            // Company logo area (simulated)
            doc.fontSize(24)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text('Print247', contentStartX, headerY)
               .fontSize(16)
               .font('Helvetica')
               .text('.us', contentStartX + 80, headerY + 5);
            
            // Disclaimer section
            const disclaimerY = headerY + 40;
            doc.fontSize(10)
               .fillColor(secondaryColor)
               .font('Helvetica-Bold')
               .text('Disclaimer:', contentStartX, disclaimerY)
               .font('Helvetica')
               .fontSize(8)
               .text('We want to emphasize that our estimate is comprehensive, encompassing all essential operations and materials in line with industry standards. If you have any queries, please don\'t hesitate to reach out. The estimate remains valid for 30 days from the specified date, and pricing adjustments may occur after a final artwork inspection. The countdown for delivery initiation starts upon design file approval and payment receipt. We value your business and eagerly anticipate the opportunity to serve you in the future. Feel free to contact us for any further information or clarification you may need. Any additional tariff, duty, and taxes on goods at the time of arrival, if applicable, shall be paid by the receiver/customer.', contentStartX, disclaimerY + 15, {
                   width: pageWidth - contentStartX - 50,
                   align: 'left'
               });
            
            // Quote details section
            const detailsY = disclaimerY + 120;
            const details = [
                ['Query No:', `QT-${Date.now()}`],
                ['Customer:', 'WhatsApp Customer'],
                ['Job Name:', conversationData.selectedProduct?.name || 'Custom Product'],
                ['No of Sku\'s:', conversationData.skus?.toString() || '1'],
                ['Turnaround Time:', '12 - 15 Business Days (*T&C Applies)'],
                ['Shipping:', 'DAP (Delivered At Place)'],
                ['Stock:', conversationData.selectedMaterial?.name || 'Standard Material'],
                ['Finished Size:', conversationData.dimensions?.map(d => `${d.value}`).join(' x ') || 'Custom Size'],
                ['Finishing:', 'CMYK 4/0 + DIE CUTTING + STRAIGHT LINE GLUING'],
                ['Extra Finishes:', conversationData.selectedFinish?.map(f => f.name).join(', ') || 'Standard Finish'],
                ['Representative:', 'AI Assistant']
            ];
            
            let currentY = detailsY;
            details.forEach(([label, value]) => {
                // Draw horizontal line
                doc.moveTo(contentStartX, currentY)
                   .lineTo(pageWidth - 50, currentY)
                   .stroke('#CCCCCC');
                
                // Label and value
                doc.fontSize(10)
                   .fillColor(primaryColor)
                   .font('Helvetica-Bold')
                   .text(label, contentStartX, currentY + 5)
                   .font('Helvetica-Bold')
                   .text(value, contentStartX + 200, currentY + 5);
                
                currentY += 25;
            });
            
            // Final line
            doc.moveTo(contentStartX, currentY)
               .lineTo(pageWidth - 50, currentY)
               .stroke('#CCCCCC');
            
            // Pricing table
            const tableY = currentY + 30;
            const tableStartX = contentStartX;
            const colWidth = 100;
            
            if (conversationData.pricingData) {
                console.log("Pricing data found:", conversationData.pricingData);
                const { qty, unit_cost } = conversationData.pricingData;
                
                if (!qty || !unit_cost) {
                    console.error("Invalid pricing data structure:", { qty, unit_cost });
                    throw new Error("Invalid pricing data structure");
                }
                
                // Table headers
                doc.fontSize(12)
                   .fillColor(primaryColor)
                   .font('Helvetica-Bold')
                   .text('Tier\'s', tableStartX, tableY)
                   .text('Tier 1', tableStartX + colWidth, tableY)
                   .text('Tier 2', tableStartX + colWidth * 2, tableY)
                   .text('Tier 3', tableStartX + colWidth * 3, tableY);
                
                // Draw header line
                doc.moveTo(tableStartX, tableY + 15)
                   .lineTo(tableStartX + colWidth * 4, tableY + 15)
                   .stroke(primaryColor);
                
                // Quantities row
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .text('Quantities:', tableStartX, tableY + 25);
                
                qty.forEach((quantity, index) => {
                    doc.text(quantity.toString(), tableStartX + colWidth * (index + 1), tableY + 25);
                });
                
                // Unit Cost row
                doc.text('Unit Cost:', tableStartX, tableY + 40);
                unit_cost.forEach((cost, index) => {
                    doc.text(cost.toFixed(3), tableStartX + colWidth * (index + 1), tableY + 40);
                });
                
                // Estimate Price row
                doc.text('Estimate Price:', tableStartX, tableY + 55);
                qty.forEach((quantity, index) => {
                    const totalPrice = (quantity * unit_cost[index]).toFixed(1);
                    doc.text(totalPrice, tableStartX + colWidth * (index + 1), tableY + 55);
                });
                
                // Draw table bottom line
                doc.moveTo(tableStartX, tableY + 70)
                   .lineTo(tableStartX + colWidth * 4, tableY + 70)
                   .stroke(primaryColor);
            } else {
                console.log("No pricing data available for PDF");
                // Add a message indicating no pricing data
                doc.fontSize(12)
                   .fillColor(primaryColor)
                   .font('Helvetica-Bold')
                   .text('Pricing information not available', tableStartX, tableY);
            }
            
            // Footer section
            const footerY = pageHeight - 100;
            
            // Seal area (simulated)
            doc.circle(contentStartX + 50, footerY, 30)
               .stroke(primaryColor);
            
            doc.fontSize(8)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text('PROUDLY BASED', contentStartX + 20, footerY - 10, { align: 'center' })
               .text('IN THE USA', contentStartX + 20, footerY - 2, { align: 'center' })
               .text('Print247.us', contentStartX + 20, footerY + 6, { align: 'center' });
            
            // Authorization section
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text('SM. Authorized By', contentStartX, footerY + 40)
               .text('_________________', contentStartX, footerY + 55);
            
            // Date
            doc.text('Date', pageWidth - 100, footerY + 40)
               .text('_________________', pageWidth - 100, footerY + 55)
               .text(new Date().toLocaleDateString('en-US'), pageWidth - 100, footerY + 70);
            
            // Finalize PDF
            doc.end();
            
            // Wait for PDF to be ready
            return new Promise((resolve) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            
        } catch (error) {
            console.error('Error creating PDF document:', error);
            throw error;
        }
    }

    async createTempPDF(pdfBuffer, from) {
        try {
            // Check if we're in Vercel environment
            if (process.env.VERCEL) {
                // For Vercel, use /tmp directory which is writable
                const fs = await import('fs/promises');
                const path = await import('path');
                const os = await import('os');
                
                // Use system temp directory
                const tempDir = path.join(os.tmpdir(), 'whatsapp-pdfs');
                await fs.mkdir(tempDir, { recursive: true });
                
                // Generate unique filename
                const filename = `quote_${from}_${Date.now()}.pdf`;
                const filepath = path.join(tempDir, filename);
                
                // Save PDF file
                await fs.writeFile(filepath, pdfBuffer);
                
                console.log('PDF saved to Vercel temp:', filepath);
                return filepath;
            } else {
                // For local development, use the existing temp directory
                const fs = await import('fs/promises');
                const path = await import('path');
                
                // Create temp directory if it doesn't exist
                const tempDir = path.join(process.cwd(), 'temp', 'pdfs');
                await fs.mkdir(tempDir, { recursive: true });
                
                // Generate unique filename
                const filename = `quote_${from}_${Date.now()}.pdf`;
                const filepath = path.join(tempDir, filename);
                
                // Save PDF file
                await fs.writeFile(filepath, pdfBuffer);
                
                console.log('PDF saved to local temp:', filepath);
                return filepath;
            }
            
        } catch (error) {
            console.error('Error creating temp PDF file:', error);
            throw error;
        }
    }

    async generateAndSendQuote(from, conversationData) {
        try {
            // Generate the quote
            const quote = await conversationService.generateQuote(from, conversationData);

            // Format and send the quote
            const quoteMessage = conversationService.formatQuoteMessage(quote);
            await this.whatsappService.sendMessage(from, quoteMessage);

            // Send follow-up options
            const buttons = [
                {
                    type: 'reply',
                    reply: {
                        id: 'new_quote',
                        title: 'New Quote'
                    }
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'contact_us',
                        title: 'Contact Us'
                    }
                }
            ];

            const followUpText = `Thank you for using our quote service! 🎉

Would you like to:`;

            await this.whatsappService.sendButtonMessage(from, followUpText, buttons);

            // Mark conversation as completed
            await conversationService.updateConversationState(from, {
                currentStep: 'completed',
                isActive: false,
                completedAt: new Date()
            });

        } catch (error) {
            await mongoLogger.logError(error, { source: 'quote-generation' });
            await this.whatsappService.sendMessage(
                from,
                "I'm sorry, there was an error generating your quote. Please contact our support team for assistance."
            );
        }
    }

    // Helper methods
    isGreeting(message) {
        const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'hi there', 'hello there', 'hey there', 'howdy', 'hiya', 'sup', 'yo'];
        const lowerMessage = message.toLowerCase().trim();
        
        // Check for exact matches first
        if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'hey') {
            return true;
        }
        
        // Check for simple greetings (not complex messages with product info)
        const isSimpleGreeting = greetings.some(greeting => {
            if (greeting.length <= 3) {
                // For short greetings, require exact word match
                return lowerMessage === greeting;
            } else {
                // For longer greetings, allow partial match but not in the middle of words
                return lowerMessage.includes(greeting);
            }
        });
        
        // If it's a simple greeting, return true
        if (isSimpleGreeting) {
            return true;
        }
        
        // If the message contains product-related keywords, it's not a simple greeting
        const productKeywords = ['looking for', 'need', 'want', 'quote', 'price', 'pouches', 'boxes', 'labels', 'carton', 'quantity', 'size', 'flavors', 'uv', 'foil', 'white', 'inside'];
        const hasProductInfo = productKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // If it has product info, it's not a simple greeting
        if (hasProductInfo) {
            return false;
        }
        
        return false;
    }

    hasProductInformation(message) {
        const lowerMessage = message.toLowerCase().trim();
        
        // Check for product-related keywords that indicate useful information
        const productKeywords = [
            'looking for', 'need', 'want', 'quote', 'price', 'pouches', 'boxes', 'labels', 'carton',
            'quantity', 'size', 'flavors', 'uv', 'foil', 'white', 'inside', 'standup', 'folding',
            'rigid', 'mylor', 'bag', 'label', 'dimensions', 'width', 'height', 'length', 'thickness',
            'material', 'finish', 'coating', 'printing', 'colors', 'design', 'custom', 'specifications'
        ];
        
        const hasProductInfo = productKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // Also check for numbers (quantities, dimensions)
        const hasNumbers = /\d+/.test(message);
        
        // Check for measurement units
        const hasUnits = /(mm|cm|inches?|ft|feet|meters?|kg|g|lb|pounds?|pieces?|units?|pcs|k|thousand)/i.test(message);
        
        return hasProductInfo || (hasNumbers && hasUnits);
    }

    isDimensionMessage(message) {
        const trimmedMessage = message.trim();
        
        // Check for common dimension patterns
        const dimensionPatterns = [
            /^\d+x\d+x\d+$/,           // 5x5x5
            /^\d+,\d+,\d+$/,           // 5,5,5
            /^\d+\s+\d+\s+\d+$/,       // 5 5 5
            /^\d+\.\d+x\d+\.\d+x\d+\.\d+$/, // 5.5x5.5x5.5
            /^\d+\.\d+,\d+\.\d+,\d+\.\d+$/, // 5.5,5.5,5.5
            /^[a-zA-Z]:\d+[x,]\d+[x,]\d+$/i, // L:5x5x5 or L:5,5,5
        ];
        
        return dimensionPatterns.some(pattern => pattern.test(trimmedMessage));
    }

    async parseDimensionsManually(dimensionString, dimensionNames) {
        try {
            const values = [];
            const dimensionStringLower = dimensionString.toLowerCase().trim();

            // Handle format: "5x7x3" or "5,7,3" or "5 7 3"
            let numbers = [];

            if (dimensionStringLower.includes('x')) {
                numbers = dimensionStringLower.split('x').map(v => parseFloat(v.trim()));
            } else if (dimensionStringLower.includes(',')) {
                numbers = dimensionStringLower.split(',').map(v => parseFloat(v.trim()));
            } else {
                // Extract all numbers from the string
                const matches = dimensionStringLower.match(/\d+(?:\.\d+)?/g);
                if (matches) {
                    numbers = matches.map(n => parseFloat(n));
                }
            }

            // Map values to dimension names
            const result = [];
            for (let i = 0; i < dimensionNames.length && i < numbers.length; i++) {
                if (!isNaN(numbers[i]) && numbers[i] > 0) {
                    result.push({
                        name: dimensionNames[i],
                        value: numbers[i]
                    });
                }
            }

            return result.length === dimensionNames.length ? result : [];
        } catch (error) {
            await mongoLogger.logError(error, { source: 'dimension-parsing' });
            return [];
        }
    }

    async handleImageMessage(message, from) {
        await mongoLogger.info('Received image message', { from });
        await this.whatsappService.sendMessage(
            from,
            "Thank you for sharing the image! 📸 Our team will review it and get back to you."
        );
    }

    async handleDocumentMessage(message, from) {
        await mongoLogger.info('Received document message', { from });
        await this.whatsappService.sendMessage(
            from,
            "Thank you for the document! 📄 We've received it and will review it shortly."
        );
    }

    /**
     * Validate that all required data is present for quote generation
     */
    validateQuoteData(conversationData) {
        const missingFields = [];
        let isValid = true;

        // Check for selected category
        if (!conversationData.selectedCategory || !conversationData.selectedCategory.id) {
            missingFields.push("• Product category selection");
            isValid = false;
        }

        // Check for selected product
        if (!conversationData.selectedProduct || !conversationData.selectedProduct.id) {
            missingFields.push("• Product selection");
            isValid = false;
        }

        // Check for selected material
        if (!conversationData.selectedMaterial || !conversationData.selectedMaterial.name) {
            missingFields.push("• Material selection");
            isValid = false;
        }

        // Check for selected finishes
        if (!conversationData.selectedFinish || conversationData.selectedFinish.length === 0) {
            missingFields.push("• Finish selection");
            isValid = false;
        }

        // Check for dimensions
        if (!conversationData.dimensions || conversationData.dimensions.length === 0) {
            missingFields.push("• Product dimensions");
            isValid = false;
        }

        // Check for quantity
        if (!conversationData.quantity || conversationData.quantity.length === 0) {
            missingFields.push("• Quantity specification");
            isValid = false;
        }

        return {
            isValid,
            missingFields
        };
    }

    /**
     * Determine which step to reset to based on missing data
     */
    getResetStepForMissingData(missingFields, conversationData) {
        // Priority order: category -> product -> dimensions -> material -> finish -> quantity
        if (missingFields.some(field => field.includes("category"))) {
            return 'category_selection';
        }
        if (missingFields.some(field => field.includes("product"))) {
            return 'product_selection';
        }
        if (missingFields.some(field => field.includes("dimensions"))) {
            return 'dimension_input';
        }
        if (missingFields.some(field => field.includes("material"))) {
            return 'material_selection';
        }
        if (missingFields.some(field => field.includes("finish"))) {
            return 'finish_selection';
        }
        if (missingFields.some(field => field.includes("quantity"))) {
            return 'quantity_input';
        }

        // Default fallback
        return 'start';
    }

    async handleAudioMessage(message, from) {
        await mongoLogger.info('Received audio message', { from });
        await this.whatsappService.sendMessage(
            from,
            "Thank you for the voice message! 🎵 Our team will listen to it and respond accordingly."
        );
    }

    async handleVideoMessage(message, from) {
        await mongoLogger.info('Received video message', { from });
        await this.whatsappService.sendMessage(
            from,
            "Thank you for the video! 🎥 We've received it and will review it shortly."
        );
    }

    async handleInteractiveMessage(message, from) {
        await mongoLogger.info('Received interactive message', { from });

        if (message.interactive.type === 'button_reply') {
            const buttonId = message.interactive.button_reply.id;
            const buttonTitle = message.interactive.button_reply.title;
            await mongoLogger.info('Button clicked', { buttonId, buttonTitle, from });

            // Get current conversation state
            const conversationState = await conversationService.getConversationState(from);

            // Handle button responses
            if (buttonId === 'quote_yes') {
                await conversationService.updateConversationState(from, {
                    currentStep: 'product_selection',
                    'conversationData.wantsQuote': true
                });
                await this.sendProductSelection(from);
            } else if (buttonId === 'quote_no') {
                await this.whatsappService.sendMessage(
                    from,
                    "No problem! If you change your mind or have any questions about our mylar bags, feel free to reach out anytime. Have a great day! 😊"
                );
                await conversationService.updateConversationState(from, {
                    currentStep: 'completed',
                    isActive: false,
                    completedAt: new Date()
                });
            } else if (buttonId === 'new_quote') {
                await conversationService.resetConversation(from);
                await this.sendGreetingWithQuoteOption(from);
                await conversationService.updateConversationState(from, {
                    currentStep: 'greeting_response'
                });
            } else if (buttonId === 'contact_us') {
                await this.handleContactInfo(from);
            } else {
                await this.whatsappService.sendMessage(
                    from,
                    `You selected: ${buttonTitle}. Thank you for your choice!`
                );
            }
        } else if (message.interactive.type === 'list_reply') {
            const listId = message.interactive.list_reply.id;
            const listTitle = message.interactive.list_reply.title;
            await mongoLogger.info('List item selected', { listId, listTitle, from });

            // Get current conversation state before processing
            const conversationState = await conversationService.getConversationState(from);
            console.log('🔍 Current conversation state before list reply:', {
                currentStep: conversationState.currentStep,
                hasSelectedCategory: !!conversationState.conversationData?.selectedCategory,
                selectedCategory: conversationState.conversationData?.selectedCategory,
                conversationData: Object.keys(conversationState.conversationData || {})
            });

            console.log('📋 Processing list reply:', {
                listId,
                listTitle,
                currentStep: conversationState.currentStep,
                messageText: listId,
                isNumeric: !isNaN(parseInt(listId)),
                parsedId: parseInt(listId)
            });

            // Smart routing: Determine what type of selection this is based on the listId
            const routingResult = await this.determineListReplyRouting(listId, listTitle, conversationState);
            console.log('🎯 List reply routing result:', routingResult);

            if (routingResult.shouldOverrideStep) {
                console.log('🔄 Overriding step from', conversationState.currentStep, 'to', routingResult.correctStep);
                // Override the current step and process with the correct handler
                await conversationService.updateConversationState(from, {
                    currentStep: routingResult.correctStep
                });

                // Get updated state
                const updatedState = await conversationService.getConversationState(from);
                console.log('🔄 Updated state after step override:', {
                    currentStep: updatedState.currentStep,
                    selectedCategory: updatedState.conversationData?.selectedCategory,
                    hasCategory: !!updatedState.conversationData?.selectedCategory?.id
                });

                // Process with the correct step
                await this.processConversationFlow(message, listId, from, updatedState);
            } else {
                console.log('➡️ Processing with current step:', conversationState.currentStep);
                // Process normally with current step
            await this.processConversationFlow(message, listId, from, conversationState);
            }
        }
    }

    // Helper methods for contact info
    async handleContactInfo(from) {
        const contactMessage = `📞 *Contact Information*

🏢 *Business Hours:*
Monday - Friday: 9:00 AM - 6:00 PM
Saturday: 9:00 AM - 2:00 PM
Sunday: Closed

📱 *Phone:* [YOUR_PHONE_NUMBER]
📧 *Email:* [YOUR_EMAIL]
🌐 *Website:* [YOUR_WEBSITE]
📍 *Address:* [YOUR_ADDRESS]

Feel free to reach out anytime!`;

        await this.whatsappService.sendMessage(from, contactMessage);
    }

    /**
     * Determine the correct routing for a list reply based on its content and current state
     */
    async determineListReplyRouting(listId, listTitle, conversationState) {
        const currentStep = conversationState.currentStep;
        const conversationData = conversationState.conversationData || {};

        console.log('🔍 Determining list reply routing:', {
            listId,
            listTitle,
            currentStep,
            hasCategory: !!conversationData.selectedCategory?.id,
            hasProduct: !!conversationData.selectedProduct?.id
        });

        // If listId is numeric, it could be a category ERP ID
        if (!isNaN(parseInt(listId))) {
            const numericId = parseInt(listId);

            // Check if this matches a category ERP ID
            try {
                const categories = await conversationService.getProductCategories();
                const matchingCategory = categories.find(cat => cat.erp_id === numericId);

                if (matchingCategory) {
                    console.log('✅ List reply matches category:', matchingCategory.name);

                    // If we're not in category selection and don't have a category, this should be treated as category selection
                    if (currentStep !== 'category_selection' && !conversationData.selectedCategory?.id) {
                        return {
                            shouldOverrideStep: true,
                            correctStep: 'category_selection',
                            reason: 'List reply matches category but current step is not category_selection'
                        };
                    }

                    // If we already have a category but this is a different one, treat it as category selection
                    if (conversationData.selectedCategory?.erp_id && conversationData.selectedCategory.erp_id !== numericId) {
                        return {
                            shouldOverrideStep: true,
                            correctStep: 'category_selection',
                            reason: 'List reply matches different category than currently selected'
                        };
                    }
                }
            } catch (error) {
                console.log('Error checking categories:', error.message);
            }
        }

        // Check if listId could be a product name or ID
        if (conversationData.selectedCategory?.id) {
            try {
                const products = await conversationService.getProductsByCategory(conversationData.selectedCategory.id);
                const matchingProduct = products.find(prod =>
                    prod.erp_id.toString() === listId ||
                    prod.name.toLowerCase().includes(listTitle.toLowerCase())
                );

                if (matchingProduct) {
                    console.log('✅ List reply matches product:', matchingProduct.name);

                    // If we're not in product selection and don't have a product, this should be treated as product selection
                    if (currentStep !== 'product_selection' && !conversationData.selectedProduct?.id) {
                        return {
                            shouldOverrideStep: true,
                            correctStep: 'product_selection',
                            reason: 'List reply matches product but current step is not product_selection'
                        };
                    }
                }
            } catch (error) {
                console.log('Error checking products:', error.message);
            }
        }

        // Check for corrupted state: user in dimension_input but no category/product selected
        if (currentStep === 'dimension_input' && !conversationData.selectedCategory?.id && !conversationData.selectedProduct?.id) {
            console.log('🚨 Corrupted state detected: in dimension_input but no category/product selected');

            // Try to determine if this is actually a category selection
            if (!isNaN(parseInt(listId))) {
                return {
                    shouldOverrideStep: true,
                    correctStep: 'category_selection',
                    reason: 'Corrupted state: user in dimension_input with no selections, treating as category selection'
                };
            }
        }

        // Check for other corrupted states
        if (currentStep === 'material_selection' && !conversationData.selectedProduct?.id) {
            console.log('🚨 Corrupted state detected: in material_selection but no product selected');
            return {
                shouldOverrideStep: true,
                correctStep: 'product_selection',
                reason: 'Corrupted state: user in material_selection with no product selected'
            };
        }

        if (currentStep === 'finish_selection' && !conversationData.selectedProduct?.id) {
            console.log('🚨 Corrupted state detected: in finish_selection but no product selected');
            return {
                shouldOverrideStep: true,
                correctStep: 'product_selection',
                reason: 'Corrupted state: user in finish_selection with no product selected'
            };
        }

        if (currentStep === 'quantity_input' && !conversationData.selectedFinish?.length) {
            console.log('🚨 Corrupted state detected: in quantity_input but no finishes selected');
            return {
                shouldOverrideStep: true,
                correctStep: 'finish_selection',
                reason: 'Corrupted state: user in quantity_input with no finishes selected'
            };
        }

        // Default: don't override, process with current step
        return {
            shouldOverrideStep: false,
            correctStep: currentStep,
            reason: 'No override needed, processing with current step'
        };
    }
}

export default MessageHandler;
