import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import WhatsAppService from './services/whatsappService.js';
import MessageHandler from './handlers/messageHandler.js';
import WitService from './services/witService.js';
import smartLogger from './services/smartLogger.js';
import webhookService from './services/webhookService.js';
import database, { connectDB } from './config/database.js';
import testRoutes from './api/testRoutes.js';
import dashboardRoutes from './api/dashboardRoutes.js';
import logRoutes from './api/logRoutes.js';

// Load environment variables
dotenv.config();

console.log('Environment loaded, starting server...');

// Initialize database connection
let dbConnected = false;
try {
    await connectDB();
    dbConnected = true;
    console.log('✅ Database connected successfully');
} catch (error) {
    console.warn('⚠️  Database connection failed, continuing without MongoDB:', error.message);
    console.log('💡 To enable database features, please configure MONGODB_URI in .env');
}

const app = express();
const PORT = process.env.PORT || 5000;

console.log(`Port set to: ${PORT}`);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize services
console.log('Initializing WhatsApp service...');
const whatsappService = new WhatsAppService();

console.log('Initializing WitService...');
const witService = new WitService();

console.log('Initializing message handler...');
const messageHandler = new MessageHandler(whatsappService, witService.client);

console.log('Services initialized successfully!');

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Business API Server is running!',
        timestamp: new Date().toISOString(),
        status: 'active',
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER_ID,
        version: process.env.WHATSAPP_VERSION,
        database: dbConnected ? 'connected' : 'disconnected'
    });
});

// Test API routes for the relational database
app.use('/api/test', testRoutes);

// Dashboard API routes
app.use('/api/dashboard', dashboardRoutes);

// Log API routes
app.use('/api/logs', logRoutes);

// Serve static files from public directory
app.use(express.static('public'));

//     const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

//     const mode = req.query['hub.mode'];
//     const token = req.query['hub.verify_token'];
//     const challenge = req.query['hub.challenge'];

//     if (mode === 'subscribe' && token === VERIFY_TOKEN) {
//         console.log('Webhook verified successfully!');
//         res.status(200).send(challenge);
//     } else {
//         res.status(403).send('Forbidden');
//     }
// });


// WhatsApp webhook verification
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    smartLogger.info(`Webhook verification ${challenge}`);
    smartLogger.info(JSON.stringify({ ...req.body, ...req.query }));

    if (mode === "subscribe" && token === "RfNsagTqlBrcnLpCyyMQRBlCtBCYTLui") {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

app.get("/webhook2", (req, res) => {
    // const mode = req.query["hub.mode"];
    // const token = req.query["hub.verify_token"];
    // const challenge = req.query["hub.challenge"];
    smartLogger.info('Webhook verification');
    smartLogger.info(JSON.stringify({ ...req.body, ...req.query }));

    // if (mode === "subscribe" && token === "RfNsagTqlBrcnLpCyyMQRBlCtBCYTLui") {
    //     return res.status(200).send(challenge);
    // }
    return res.sendStatus(200);
});

// WhatsApp webhook for receiving messages
app.post('/webhook', async (req, res) => {
    const startTime = Date.now();
    let processingResult = {};
    smartLogger.info('Calling webhook');
    const message = req.body;
    smartLogger.info(message);
    const result = await messageHandler.handleIncomingMessage(message);

    const processingTime = Date.now() - startTime;
    console.log(`⚡ Webhook processed in ${processingTime}ms`);

    res.status(200).json({
        status: 'ok',
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
    });

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

// Wit.ai testing route
app.post('/wit/testing', async (req, res) => {
    try {
        const { message, options = {} } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required',
                message: 'Please provide a message in the request body'
            });
        }

        console.log(`Wit.ai testing request: "${message}"`);

        const result = await witService.processMessage(message, options);

        // Extract entities from the Wit.ai response
        const entitiesArray = witService.extractEntities(result.data);
        const data = witService.getRequiredDataFromEntities(entitiesArray);
        const dimensions = witService.getDimensionsFromEntities(entitiesArray);
        console.log(`Required Data:`, data);
        console.log(`Dimensions:`, dimensions);

        res.json({
            success: true,
            originalMessage: message,
            witResponse: result,
            entities: entitiesArray,
            entityCount: entitiesArray.length,
            requiredData: data,
            dimensions: dimensions,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Wit.ai testing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message with Wit.ai',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Wit.ai status and test connection
app.get('/wit/status', async (req, res) => {
    try {
        const status = witService.getStatus();
        const testResult = await witService.testConnection();

        res.json({
            success: true,
            status: status,
            testResult: testResult,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Wit.ai status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get Wit.ai status',
            details: error.message,
            timestamp: new Date().toISOString()
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
            wit: !!process.env.WIT_AI_ACCESS_TOKEN,
            database: dbConnected
        },
        config: {
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            version: process.env.WHATSAPP_VERSION
        }
    });
});

// Database Analytics Routes (only if database is connected)
app.get('/analytics/webhooks', async (req, res) => {
    if (!dbConnected) {
        return res.status(503).json({
            error: 'Database not connected',
            message: 'Please configure MONGODB_URI in .env file'
        });
    }

    try {
        const stats = await webhookService.getWebhookStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            error: 'Failed to get webhook analytics',
            details: error.message
        });
    }
});

app.get('/analytics/recent-calls', async (req, res) => {
    if (!dbConnected) {
        return res.status(503).json({
            error: 'Database not connected',
            message: 'Please configure MONGODB_URI in .env file'
        });
    }

    try {
        const limit = parseInt(req.query.limit) || 50;
        const recentCalls = await webhookService.getRecentCalls(limit);
        res.json({
            success: true,
            data: recentCalls,
            count: recentCalls.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Recent calls error:', error);
        res.status(500).json({
            error: 'Failed to get recent calls',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

// For Vercel serverless deployment or local development
console.log('Checking environment...');
console.log('VERCEL env var:', process.env.VERCEL);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (!process.env.VERCEL) {
    console.log('Starting local development server...');
    // Start server for local development only
    const server = app.listen(PORT, () => {
        console.log(`🚀 WhatsApp Message System running on port ${PORT}`);
        console.log(`📱 Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
        console.log(`🔗 API Version: ${process.env.WHATSAPP_VERSION}`);
        console.log(`📋 Webhook URL: http://localhost:${PORT}/webhook`);
        console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });

    server.on('error', (error) => {
        console.error('Server error:', error);
    });
} else {
    console.log('Running in Vercel environment, skipping server startup');
}

export default app;
