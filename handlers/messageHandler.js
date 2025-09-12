import dotenv from 'dotenv';
import conversationService from '../services/conversationService.js';
import WitService from '../services/witService.js';
import mongoLogger from '../services/mongoLogger.js';

dotenv.config();

class MessageHandler {
    constructor(whatsappService, wit) {
        this.whatsappService = whatsappService;
        this.wit = wit;
        this.witService = new WitService();
    }

    async handleIncomingMessage(message, value = null) {
        try {
            const messageType = message.type;
            const from = message.from;
            const messageId = message.id;
            await mongoLogger.logMessage(message, from);
            await mongoLogger.info('Message received', { messageType, from, messageId });

            // Mark message as read
            // await this.whatsappService.markAsRead(messageId);

            await mongoLogger.info('Processing message type', { messageType });
            switch (messageType) {
                case 'text':
                    await mongoLogger.info('Handling text message');
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
                    await this.whatsappService.sendMessage(
                        from,
                        "Sorry, I don't support this type of message yet."
                    );
            }
        } catch (error) {
            await mongoLogger.logError(error, { source: 'message-handler' });
        }
    }

    async handleTextMessage(message, from) {
        await mongoLogger.info('Handling text message');
        try {
            const messageText = message.text.body;
            await mongoLogger.info('Text message content', { messageText });

            // Get current conversation state
            const conversationState = await conversationService.getConversationState(from);
            console.log('conversationState', conversationState);
            
            // Process message with Wit.ai first
            const witResponse = await this.witService.processMessage(messageText);
            const entities = this.witService.extractEntities(witResponse.data);
            
            await mongoLogger.info('Wit.ai response', { 
                entities: entities,
                messageText: messageText 
            });

            // Extract and update conversation data with entities
            const updatedConversationData = await this.extractAndUpdateConversationData(
                entities, 
                conversationState.conversationData || {}
            );

            // Check if we can bypass steps based on extracted data
            const nextStep = await this.determineNextStep(
                conversationState.currentStep, 
                updatedConversationData, 
                entities
            );

            // Update conversation state with extracted data
            if (Object.keys(updatedConversationData).length > 0) {
                await conversationService.updateConversationState(from, {
                    conversationData: updatedConversationData,
                    currentStep: nextStep
                });
            }

            // Process message through our conversation flow
            await this.processConversationFlow(messageText, from, conversationState);
            
        } catch (error) {
            await mongoLogger.logError(error, { source: 'text-message-handler' });
            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error processing your message. Please try again."
            );
        }
    }

    /**
     * Extract entities from Wit.ai response and update conversation data
     */
    async extractAndUpdateConversationData(entities, currentConversationData) {
        const updatedData = { ...currentConversationData };

        for (const entity of entities) {
            console.log("entity....... ", entity);
            const { entity: entityName, value, confidence } = entity;
            
            switch (entityName) {
                case 'category:category':
                    if (value && confidence > 0.5) {
                        // Search for category in ProductCategory schema
                        const foundCategory = await this.findCategoryByName(value);
                        if (foundCategory) {
                            updatedData.selectedCategory = {
                                id: foundCategory._id.toString(),
                                erp_id: foundCategory.erp_id,
                                name: foundCategory.name,
                                description: foundCategory.description
                            };
                        } else {
                            updatedData.requestedCategory = value;
                        }
                    }
                    break;
                case 'dimensions:dimensions':
                    if (value && confidence > 0.5) {
                        if (!updatedData.dimensions) {
                            updatedData.dimensions = [];
                        }
                        // Add dimension if not already present
                        const existingDimension = updatedData.dimensions.find(d => d.name === value.name);
                        if (!existingDimension) {
                            updatedData.dimensions.push({
                                name: value.name,
                                value: value.value
                            });
                        }
                    }
                    break;
                case 'quantity':
                    if (value && confidence > 0.5) {
                        updatedData.quantity = parseInt(value);
                    }
                    break;
                case 'material':
                    if (value && confidence > 0.5) {
                        updatedData.selectedMaterial = value;
                    }
                    break;
                case 'finish':
                    if (value && confidence > 0.5) {
                        updatedData.selectedFinish = value;
                    }
                    break;
                case 'category':
                    if (value && confidence > 0.5) {
                        updatedData.requestedCategory = value;
                    }
                    break;
            }
        }

        return updatedData;
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
     * Determine the next step based on current step and extracted data
     */
    async determineNextStep(currentStep, conversationData, entities) {
        // If we have a selected category and product name, move to dimension_input
        if (conversationData.selectedCategory && conversationData.requestedProductName) {
            return 'dimension_input';
        }

        // If we're in product_selection and have product name, move to dimension_input
        if (currentStep === 'product_selection' && conversationData.requestedProductName) {
            return 'dimension_input';
        }

        // If we're in dimension_input and have dimensions, move to material_selection
        if (currentStep === 'dimension_input' && conversationData.dimensions && conversationData.dimensions.length > 0) {
            return 'material_selection';
        }

        // If we're in material_selection and have material, move to finish_selection
        if (currentStep === 'material_selection' && conversationData.selectedMaterial) {
            return 'finish_selection';
        }

        // If we're in finish_selection and have finish, move to quantity_input
        if (currentStep === 'finish_selection' && conversationData.selectedFinish) {
            return 'quantity_input';
        }

        // If we're in quantity_input and have quantity, move to quote_generation
        if (currentStep === 'quantity_input' && conversationData.quantity) {
            return 'quote_generation';
        }

        // If we have all required data, move to quote_generation
        if (conversationData.selectedProduct && 
            conversationData.dimensions && 
            conversationData.dimensions.length > 0 && 
            conversationData.selectedMaterial && 
            conversationData.selectedFinish && 
            conversationData.quantity) {
            return 'quote_generation';
        }

        return currentStep; // Keep current step if no advancement possible
    }

    async processConversationFlow(messageText, from, conversationState) {
        try {
            const currentStep = conversationState.currentStep;
            const conversationData = conversationState.conversationData || {};

            await mongoLogger.info('Processing conversation step', { currentStep, from });

            switch (currentStep) {
                case 'start':
                    await this.handleStartStep(messageText, from);
                    break;
                case 'greeting_response':
                    await this.handleGreetingResponse(messageText, from);
                    break;
                case 'category_selection':
                    await this.handleCategorySelection(messageText, from);
                    break;
                case 'product_selection':
                    await this.handleProductSelection(messageText, from);
                    break;
                case 'dimension_input':
                    await this.handleDimensionInput(messageText, from, conversationData);
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
                default:
                    await this.handleStartStep(messageText, from);
            }
        } catch (error) {
            await mongoLogger.logError(error, { source: 'conversation-flow' });
            await this.whatsappService.sendMessage(
                from,
                "I'm sorry, something went wrong. Let me restart our conversation. Please type 'hi' to begin."
            );
            await conversationService.resetConversation(from);
        }
    }

    async handleStartStep(messageText, from) {
        // Process with Wit.ai to detect greeting
        const witResponse = await this.witService.processMessage(messageText);
        const intent = witResponse.data?.intents?.[0]?.name;

        if (intent === 'greeting' || this.isGreeting(messageText)) {
            await this.sendGreetingWithQuoteOption(from);
            await conversationService.updateConversationState(from, {
                currentStep: 'greeting_response'
            });
        } else {
            await this.whatsappService.sendMessage(
                from,
                "Hello! 👋 Welcome to our mylar bag service. Please say 'Hi' to get started with your quote request."
            );
            await conversationService.updateConversationState(from, {
                currentStep: 'greeting_response'
            });
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

    async handleGreetingResponse(messageText, from) {
        const response = messageText.toLowerCase().trim();
        console.log('Message response ', response);
        
        if (response.includes('yes') || response === 'quote_yes' || response.includes('get quote')) {
            await conversationService.updateConversationState(from, {
                currentStep: 'category_selection',
                'conversationData.wantsQuote': true
            });
            await this.sendCategorySelection(from);
        } else if (response.includes('no') || response === 'quote_no') {
            await this.whatsappService.sendMessage(
                from,
                "No problem! If you change your mind or have any questions about our mylar bags, feel free to reach out anytime. Have a great day! 😊"
            );
            await conversationService.updateConversationState(from, {
                currentStep: 'completed',
                isActive: false,
                completedAt: new Date()
            });
        } else {
            await this.whatsappService.sendMessage(
                from,
                "Please reply with 'Yes' if you want a quote or 'No' if you don't need one right now."
            );
        }
    }

    async sendCategorySelection(from) {
        try {
            const categories = await conversationService.getProductCategories();
            
            if (!categories || categories.length === 0) {
                await this.whatsappService.sendMessage(
                    from,
                    "Sorry, no product categories are available at the moment. Please try again later."
                );
                return;
            }

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
        // try {
            const categories = await conversationService.getProductCategories();
            
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
            console.log('Selected category ', selectedCategory);

            if (selectedCategory) {
                await conversationService.updateConversationState(from, {
                    currentStep: 'product_selection',
                    'conversationData.selectedCategory': {
                        id: selectedCategory._id,
                        erp_id: selectedCategory.erp_id,
                        name: selectedCategory.name,
                        description: selectedCategory.description
                    }
                });

                await this.sendProductSelection(from);
            } else {
                await this.whatsappService.sendMessage(
                    from,
                    "I didn't quite catch that. Please select a category from the list above or type the category name."
                );
            }
        // } catch (error) {
        //     await mongoLogger.logError(error, { source: 'handle-category-selection' });
        //     await this.whatsappService.sendMessage(
        //         from,
        //         "Sorry, I encountered an error processing your category selection. Please try again."
        //     );
        // }
    }

    async sendProductSelection(from) {
        // try {
            // Get conversation state to access selected category
            const conversationState = await conversationService.getConversationState(from);
            const selectedCategory = conversationState.conversationData?.selectedCategory;
            console.log('Selected category ', selectedCategory);
            
            if (!selectedCategory || !selectedCategory.id) {
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

            const bodyText = `Great! 📦 You've selected the ${selectedCategory.name} category.

What is the name of the product you're looking for? Please type the product name and I'll help you find it.`;
            
            await this.whatsappService.sendMessage(from, bodyText);
        // } catch (error) {
        //     await mongoLogger.logError(error, { source: 'send-product-selection' });
        //     await this.whatsappService.sendMessage(
        //         from,
        //         "Sorry, I encountered an error loading products. Please try again later."
        //     );
        // }
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

            // Check if it's a direct product ERP ID or find by name
            selectedProduct = products.find(p => 
                p.erp_id.toString() === searchTerm || 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

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
                await this.whatsappService.sendMessage(
                    from,
                    `I couldn't find a product named "${searchTerm}" in the ${selectedCategory.name} category. Please try a different product name or check the spelling.`
                );
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
        const dimensionNames = dimensionFields.map(field => field.name).join(', ');
        const dimensionUnits = dimensionFields.map(field => field.unit || 'inches').join(', ');
        
        const message = `Perfect! You selected: *${product.name}* 📏

Now I need the dimensions for your product.

Required dimensions: *${dimensionNames}*

Please provide dimensions in one of these formats:
• ${dimensionFields.map(field => field.name).join(' x ')} (e.g., "10 x 8 x 3")
• Separated by commas (e.g., "10, 8, 3")
• With labels (e.g., "L:10, W:8, H:3")

All dimensions should be in ${dimensionUnits}.`;

        await this.whatsappService.sendMessage(from, message);
    }

    async handleDimensionInput(messageText, from, conversationData) {
        // Process dimensions using Wit.ai
        const witResponse = await this.witService.processMessage(messageText);
        const entities = this.witService.extractEntities(witResponse.data);
        
        // Try to parse dimensions
        let dimensions = this.witService.getDimensionsFromEntities(entities);
        
        // If Wit.ai didn't parse it, try manual parsing
        if (!dimensions || dimensions.length === 0) {
            dimensions = this.parseDimensionsManually(messageText, conversationData.selectedProduct.dimensionNames);
        }

        if (dimensions && dimensions.length > 0) {
            await conversationService.updateConversationState(from, {
                currentStep: 'material_selection',
                'conversationData.dimensions': dimensions
            });

            await this.sendMaterialSelection(from, conversationData.selectedProduct);
        } else {
            await this.whatsappService.sendMessage(
                from,
                `I couldn't understand the dimensions. Please provide them in one of these formats:

• ${conversationData.selectedProduct.dimensionNames.join(' x ')} (e.g., "10 x 8 x 3")
• Separated by commas (e.g., "10, 8, 3")
• With labels (e.g., "L:10, W:8, H:3")

All dimensions should be in inches.`
            );
        }
    }

    async sendMaterialSelection(from, selectedProduct) {
        const product = await conversationService.getProductById(selectedProduct.id);
        
        const sections = [{
            title: "Available Materials",
            rows: product.availableMaterials.map(material => ({
                id: material.name,
                title: material.name,
                description: `${material.description} - $${material.pricePerUnit}/unit`
            }))
        }];

        const bodyText = `Great! Now please select the material for your mylar bags:`;
        
        await this.whatsappService.sendListMessage(
            from, 
            bodyText, 
            "Select Material", 
            sections
        );
    }

    async handleMaterialSelection(messageText, from, conversationData) {
        const product = await conversationService.getProductById(conversationData.selectedProduct.id);
        const selectedMaterial = product.availableMaterials.find(m => 
            m.name.toLowerCase().includes(messageText.toLowerCase()) ||
            messageText.toLowerCase().includes(m.name.toLowerCase())
        );

        if (selectedMaterial) {
            await conversationService.updateConversationState(from, {
                currentStep: 'finish_selection',
                'conversationData.selectedMaterial': selectedMaterial.name
            });

            await this.sendFinishSelection(from, conversationData.selectedProduct);
        } else {
            await this.whatsappService.sendMessage(
                from,
                "Please select a valid material from the list above."
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
        const product = await conversationService.getProductById(conversationData.selectedProduct.id);
        const selectedFinish = product.availableFinishes.find(f => 
            f.name.toLowerCase().includes(messageText.toLowerCase()) ||
            messageText.toLowerCase().includes(f.name.toLowerCase())
        );

        if (selectedFinish) {
            await conversationService.updateConversationState(from, {
                currentStep: 'quantity_input',
                'conversationData.selectedFinish': selectedFinish.name
            });

            await this.sendQuantityRequest(from);
        } else {
            await this.whatsappService.sendMessage(
                from,
                "Please select a valid finish from the list above."
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
        // Process quantity using Wit.ai
        const witResponse = await this.witService.processMessage(messageText);
        const entities = this.witService.extractEntities(witResponse.data);
        
        let quantity = null;
        
        // Try to find quantity entity
        const quantityEntity = entities.find(e => e.entity === 'quantity:quantity');
        if (quantityEntity) {
            quantity = parseInt(quantityEntity.value);
        } else {
            // Manual parsing
            const numbers = messageText.match(/\d+/g);
            if (numbers && numbers.length > 0) {
                quantity = parseInt(numbers[0]);
            }
        }

        if (quantity && quantity > 0) {
            // Update conversation state with quantity
            await conversationService.updateConversationState(from, {
                currentStep: 'quote_generation',
                'conversationData.quantity': quantity
            });

            // Generate and send quote
            await this.generateAndSendQuote(from, {
                ...conversationData,
                quantity
            });
        } else {
            await this.whatsappService.sendMessage(
                from,
                "Please provide a valid quantity number. For example: '500' or '1000 pieces'"
            );
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
        const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
        const lowerMessage = message.toLowerCase();
        return greetings.some(greeting => lowerMessage.includes(greeting));
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
            
            // Process the list selection as a regular text message
            await this.processConversationFlow(listId, from, await conversationService.getConversationState(from));
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
}

export default MessageHandler;
