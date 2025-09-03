import dotenv from 'dotenv';

dotenv.config();

class MessageHandler {
    constructor(whatsappService, wit) {
        this.whatsappService = whatsappService;
        this.wit = wit;
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

            // Process with Wit.ai if token is available
            if (process.env.WIT_AI_ACCESS_TOKEN && this.wit) {
                try {
                    const witResponse = await this.wit.message(messageText);
                    console.log('Wit.ai response:', JSON.stringify(witResponse, null, 2));

                    // Extract intent and entities
                    const intent = witResponse.intents?.[0]?.name;
                    const entities = witResponse.entities;

                    // Handle based on intent
                    await this.handleIntent(intent, entities, messageText, from);
                } catch (witError) {
                    console.error('Wit.ai error:', witError);
                    await this.handleDefaultResponse(messageText, from);
                }
            } else {
                await this.handleDefaultResponse(messageText, from);
            }
        } catch (error) {
            console.error('Error handling text message:', error);
        }
    }

    async handleIntent(intent, entities, originalMessage, from) {
        try {
            switch (intent) {
                case 'greeting':
                    await this.handleGreeting(from);
                    break;
                case 'help':
                    await this.handleHelp(from);
                    break;
                case 'quote_request':
                    await this.handleQuoteRequest(entities, from);
                    break;
                case 'product_inquiry':
                    await this.handleProductInquiry(entities, from);
                    break;
                case 'contact_info':
                    await this.handleContactInfo(from);
                    break;
                default:
                    await this.handleDefaultResponse(originalMessage, from);
            }
        } catch (error) {
            console.error('Error handling intent:', error);
            await this.handleDefaultResponse(originalMessage, from);
        }
    }

    async handleGreeting(from) {
        const greetingMessage = `Hello! 👋 Welcome to our business. How can I help you today?

I can assist you with:
• Product inquiries
• Price quotes
• General information
• Contact details

Just ask me anything!`;

        await this.whatsappService.sendMessage(from, greetingMessage);
    }

    async handleHelp(from) {
        const helpMessage = `🤖 Here's how I can help you:

📝 *Quote Requests*
- "I need a quote for..."
- "What's the price of..."

📦 *Product Information*
- "Tell me about..."
- "Do you have..."

📞 *Contact Information*
- "How can I contact you?"
- "What are your hours?"

💬 Just type your question naturally, and I'll do my best to help!`;

        await this.whatsappService.sendMessage(from, helpMessage);
    }

    async handleQuoteRequest(entities, from) {
        const productEntity = entities['product:product']?.[0];
        const quantityEntity = entities['wit$quantity:quantity']?.[0];

        let responseMessage = "I'd be happy to help you with a quote! 💰\n\n";

        if (productEntity) {
            responseMessage += `Product: ${productEntity.value}\n`;
        }
        if (quantityEntity) {
            responseMessage += `Quantity: ${quantityEntity.value}\n`;
        }

        responseMessage += "\nTo provide you with an accurate quote, I'll need a few more details. Our sales team will contact you shortly, or you can call us directly at [YOUR_PHONE_NUMBER].";

        await this.whatsappService.sendMessage(from, responseMessage);
    }

    async handleProductInquiry(entities, from) {
        const productEntity = entities['product:product']?.[0];

        let responseMessage = "I'd be happy to help you with product information! 📦\n\n";

        if (productEntity) {
            responseMessage += `You asked about: ${productEntity.value}\n\n`;
        }

        responseMessage += "Let me connect you with our product specialist who can provide detailed information. You can also browse our catalog at [YOUR_WEBSITE] or call us at [YOUR_PHONE_NUMBER].";

        await this.whatsappService.sendMessage(from, responseMessage);
    }

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

    async handleDefaultResponse(messageText, from) {
        const responses = [
            "Thank you for your message! Our team will get back to you soon. 😊",
            "I received your message. Let me connect you with the right person to help you.",
            "Thanks for reaching out! Someone from our team will contact you shortly.",
            "I appreciate your message. Our customer service team will respond to you soon."
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        await this.whatsappService.sendMessage(from, randomResponse);
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
            
            await this.whatsappService.sendMessage(
                from,
                `You selected: ${buttonTitle}. Thank you for your choice!`
            );
        } else if (message.interactive.type === 'list_reply') {
            const listId = message.interactive.list_reply.id;
            const listTitle = message.interactive.list_reply.title;
            console.log(`List item selected: ${listId} - ${listTitle}`);
            
            await this.whatsappService.sendMessage(
                from,
                `You selected: ${listTitle}. Thank you for your selection!`
            );
        }
    }
}

export default MessageHandler;
