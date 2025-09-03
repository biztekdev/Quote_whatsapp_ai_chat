import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pkg from 'node-wit';
const { Wit } = pkg;
import WhatsAppService from '../services/whatsappService.js';
import MessageHandler from '../handlers/messageHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize services
const whatsappService = new WhatsAppService();
const wit = new Wit({
    accessToken: process.env.WIT_AI_ACCESS_TOKEN,
});
const messageHandler = new MessageHandler(whatsappService, wit);

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Business API Server is running!',
        timestamp: new Date().toISOString(),
        status: 'active',
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER_ID,
        version: process.env.WHATSAPP_VERSION
    });
});

// WhatsApp webhook verification
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully!');
        res.status(200).send(challenge);
    } else {
        res.status(403).send('Forbidden');
    }
});

// WhatsApp webhook for receiving messages
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        console.log('Incoming webhook:', JSON.stringify(body, null, 2));
        
        if (body.object === 'whatsapp_business_account') {
            body.entry?.forEach(async (entry) => {
                const changes = entry.changes?.[0];
                if (changes?.field === 'messages') {
                    const value = changes.value;
                    const messages = value.messages;
                    
                    if (messages) {
                        for (const message of messages) {
                            await messageHandler.handleIncomingMessage(message, value);
                        }
                    }
                }
            });
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API Routes for sending messages
app.post('/send-message', async (req, res) => {
    try {
        const { to, message, type = 'text' } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({
                error: 'Missing required fields: to, message'
            });
        }
        
        const result = await whatsappService.sendMessage(to, message, type);
        res.json({
            success: true,
            messageId: result.messages[0].id,
            data: result
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            error: 'Failed to send message',
            details: error.message
        });
    }
});

// Send template message
app.post('/send-template', async (req, res) => {
    try {
        const { to, templateName, languageCode = 'en_US', components } = req.body;
        
        if (!to || !templateName) {
            return res.status(400).json({
                error: 'Missing required fields: to, templateName'
            });
        }
        
        const result = await whatsappService.sendTemplateMessage(to, templateName, languageCode, components);
        res.json({
            success: true,
            messageId: result.messages[0].id,
            data: result
        });
    } catch (error) {
        console.error('Send template error:', error);
        res.status(500).json({
            error: 'Failed to send template message',
            details: error.message
        });
    }
});

// Send media message
app.post('/send-media', async (req, res) => {
    try {
        const { to, mediaUrl, type, caption } = req.body;
        
        if (!to || !mediaUrl || !type) {
            return res.status(400).json({
                error: 'Missing required fields: to, mediaUrl, type'
            });
        }
        
        const result = await whatsappService.sendMediaMessage(to, mediaUrl, type, caption);
        res.json({
            success: true,
            messageId: result.messages[0].id,
            data: result
        });
    } catch (error) {
        console.error('Send media error:', error);
        res.status(500).json({
            error: 'Failed to send media message',
            details: error.message
        });
    }
});

// Send button message
app.post('/send-buttons', async (req, res) => {
    try {
        const { to, bodyText, buttons } = req.body;
        
        if (!to || !bodyText || !buttons) {
            return res.status(400).json({
                error: 'Missing required fields: to, bodyText, buttons'
            });
        }
        
        const result = await whatsappService.sendButtonMessage(to, bodyText, buttons);
        res.json({
            success: true,
            messageId: result.messages[0].id,
            data: result
        });
    } catch (error) {
        console.error('Send button message error:', error);
        res.status(500).json({
            error: 'Failed to send button message',
            details: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            whatsapp: !!process.env.WHATSAPP_ACCESS_TOKEN,
            wit: !!process.env.WIT_AI_ACCESS_TOKEN
        },
        config: {
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            version: process.env.WHATSAPP_VERSION
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

export default app;
