import dotenv from 'dotenv';
import conversationService from '../services/conversationService.js';
import WitService from '../services/witService.js';

dotenv.config();

class MessageHandler {
    constructor(whatsappService, wit) {
        this.whatsappService = whatsappService;
        this.wit = wit;
        this.witService = new WitService();
    }

    async handleIncomingMessage(message, value) {
        try {
            const messageType = message.type;
            const from = message.from;
            const messageId = message.id;

            console.log(`Received ${messageType} message from ${from}`);

            // Mark message as read
            await this.whatsappService.markAsRead(messageId);

            switch (messageType) {
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
                    console.log(`Unsupported message type: ${messageType}`);
                    await this.whatsappService.sendMessage(
                        from,
                        "Sorry, I don't support this type of message yet."
                    );
            }
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }

    async handleTextMessage(message, from) {
        try {
            const messageText = message.text.body;
            console.log(`Text message: ${messageText}`);

            // Get current conversation state
            const conversationState = await conversationService.getConversationState(from);
            
            // Process message through our conversation flow
            await this.processConversationFlow(messageText, from, conversationState);
            
        } catch (error) {
            console.error('Error handling text message:', error);
            await this.whatsappService.sendMessage(
                from,
                "Sorry, I encountered an error processing your message. Please try again."
            );
        }
    }

    async processConversationFlow(messageText, from, conversationState) {
        try {
            const currentStep = conversationState.currentStep;
            const conversationData = conversationState.conversationData || {};

            console.log(`🔄 Processing step: ${currentStep} for ${from}`);

            switch (currentStep) {
                case 'start':
                    await this.handleStartStep(messageText, from);
                    break;
                case 'greeting_response':
                    await this.handleGreetingResponse(messageText, from);
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
            console.error('Error in conversation flow:', error);
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
        
        if (response.includes('yes') || response === 'quote_yes' || response.includes('get quote')) {
            await conversationService.updateConversationState(from, {
                currentStep: 'product_selection',
                'conversationData.wantsQuote': true
            });
            await this.sendProductSelection(from);
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

    async sendProductSelection(from) {
        const products = await conversationService.getMylarBagProducts();
        
        const sections = [{
            title: "Available Products",
            rows: products.map(product => ({
                id: product.id,
                title: product.name,
                description: product.description
            }))
        }];

        const bodyText = `Great! 📦 Here are our available mylar bag products. Please select the type you're interested in:`;
        
        await this.whatsappService.sendListMessage(
            from, 
            bodyText, 
            "Select Product", 
            sections
        );
    }

    async handleProductSelection(messageText, from) {
        const products = await conversationService.getMylarBagProducts();
        let selectedProduct = null;

        // Check if it's a direct product ID or find by name
        selectedProduct = products.find(p => 
            p.id === messageText || 
            p.name.toLowerCase().includes(messageText.toLowerCase())
        );

        if (selectedProduct) {
            await conversationService.updateConversationState(from, {
                currentStep: 'dimension_input',
                'conversationData.selectedProduct': {
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    dimensionNames: selectedProduct.dimensionNames,
                    availableMaterials: selectedProduct.availableMaterials.map(m => m.name),
                    availableFinishes: selectedProduct.availableFinishes.map(f => f.name)
                }
            });

            await this.sendDimensionRequest(from, selectedProduct);
        } else {
            await this.whatsappService.sendMessage(
                from,
                "Please select a valid product from the list above. You can tap on one of the options or type the product name."
            );
        }
    }

    async sendDimensionRequest(from, product) {
        const dimensionNames = product.dimensionNames.join(', ');
        const message = `Perfect! You selected: *${product.name}* 📏

Now I need the dimensions for your mylar bags.

Required dimensions: *${dimensionNames}*

Please provide dimensions in one of these formats:
• ${product.dimensionNames.join(' x ')} (e.g., "10 x 8 x 3")
• Separated by commas (e.g., "10, 8, 3")
• With labels (e.g., "L:10, W:8, H:3")

All dimensions should be in inches.`;

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
            console.error('Error generating quote:', error);
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

    parseDimensionsManually(dimensionString, dimensionNames) {
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
            console.error('Error parsing dimensions manually:', error);
            return [];
        }
    }

    async handleImageMessage(message, from) {
        console.log('Received image message');
        await this.whatsappService.sendMessage(
            from,
            "Thank you for sharing the image! 📸 Our team will review it and get back to you."
        );
    }

    async handleDocumentMessage(message, from) {
        console.log('Received document message');
        await this.whatsappService.sendMessage(
            from,
            "Thank you for the document! 📄 We've received it and will review it shortly."
        );
    }

    async handleAudioMessage(message, from) {
        console.log('Received audio message');
        await this.whatsappService.sendMessage(
            from,
            "Thank you for the voice message! 🎵 Our team will listen to it and respond accordingly."
        );
    }

    async handleVideoMessage(message, from) {
        console.log('Received video message');
        await this.whatsappService.sendMessage(
            from,
            "Thank you for the video! 🎥 We've received it and will review it shortly."
        );
    }

    async handleInteractiveMessage(message, from) {
        console.log('Received interactive message');
        
        if (message.interactive.type === 'button_reply') {
            const buttonId = message.interactive.button_reply.id;
            const buttonTitle = message.interactive.button_reply.title;
            console.log(`Button clicked: ${buttonId} - ${buttonTitle}`);
            
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
            console.log(`List item selected: ${listId} - ${listTitle}`);
            
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
