import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import WhatsAppService from './services/whatsappService.js';
import MessageHandler from './handlers/messageHandler.js';
import WitService from './services/witService.js';
import mongoLogger from './services/mongoLogger.js';
import webhookService from './services/webhookService.js';
import database, { connectDB } from './config/database.js';
import testRoutes from './api/testRoutes.js';
import dashboardRoutes from './api/dashboardRoutes.js';
import logRoutes from './api/logRoutes.js';
import authRoutes from './api/authRoutes.js';
import { authenticateToken } from './middleware/auth.js';
import erpSyncRoutes from './api/erpSyncRoutes.js';
import cronManager from './cron/index.js';
import { ProcessedMessage } from './models/processedMessageModel.js';

// Load environment variables   
dotenv.config();    

// await mongoLogger.info('Environment loaded, starting server...');

// Initialize database connection
let dbConnected = false;
try {
    await connectDB();
    dbConnected = true;
    // await mongoLogger.info('Database connected successfully');
} catch (error) {
    // await mongoLogger.warn('Database connection failed, continuing without MongoDB', { error: error.message });
    // await mongoLogger.info('To enable database features, please configure MONGODB_URI in .env');
}

const app = express();
const PORT = process.env.PORT || 5001;

// await mongoLogger.info('Port configuration', { port: PORT });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize services
// await mongoLogger.info('Initializing WhatsApp service...');
const whatsappService = new WhatsAppService();

// await mongoLogger.info('Initializing WitService...');
const witService = new WitService();

// await mongoLogger.info('Initializing message handler...');
const messageHandler = new MessageHandler(whatsappService, witService.client);

// await mongoLogger.info('Services initialized successfully!');

// Initialize cron jobs
if (dbConnected) {
    try {
        cronManager.start();
        await mongoLogger.info('Cron jobs started successfully');
    } catch (error) {
        await mongoLogger.error('Failed to start cron jobs:', error);
    }
} else {
    await mongoLogger.warn('Cron jobs not started - database not connected');
}

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

// Authentication routes (no auth required)
app.use('/api/auth', authRoutes);

// Test API routes for the relational database
app.use('/api/test', testRoutes);

// Dashboard API routes (protected)
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Log API routes (protected)
app.use('/api/logs', authenticateToken, logRoutes);

app.use('/api/sync', erpSyncRoutes);

// Serve static files from public directory
app.use(express.static('public'));

// Specific routes for HTML files (fallback)
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/erd.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'erd.html'));
});

app.get('/erd-corrected.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'erd-corrected.html'));
});

// Test route to check if files exist
app.get('/test-files', (req, res) => {
    const fs = require('fs');
    const files = ['dashboard.html', 'login.html', 'erd.html', 'erd-corrected.html'];
    const results = {};
    
    files.forEach(file => {
        const filePath = path.join(__dirname, 'public', file);
        results[file] = fs.existsSync(filePath);
    });
    
    res.json({
        success: true,
        files: results,
        publicPath: path.join(__dirname, 'public'),
        timestamp: new Date().toISOString()
    });
});

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
app.get("/webhook", async (req, res) => {
    try {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        
        await mongoLogger.info('Webhook verification', { 
            mode, 
            token: token ? '***' : 'missing', 
            challenge,
            query: req.query 
        });
        
        if (mode === "subscribe" && token === "RfNsagTqlBrcnLpCyyMQRBICtBCYTLui") {
            await mongoLogger.info('Webhook verification successful');
            return res.status(200).send(challenge);
        }
        
        await mongoLogger.warn('Webhook verification failed', { mode, hasToken: !!token });
        return res.sendStatus(403);
        
    } catch (error) {
        await mongoLogger.logError(error, { endpoint: 'webhook-verification' });
        return res.sendStatus(403);
    }
});

// Create a Set to track processed message IDs (in-memory cache)
const processedMessageIds = new Set();

// Async function to process messages without blocking webhook response
async function processMessagesAsync(webhookData, startTime) {
    try {
        console.log('🔍 Starting processMessagesAsync with data:', JSON.stringify(webhookData, null, 2));
        
        // Check if this is a valid WhatsApp webhook with messages
        if (webhookData.entry && webhookData.entry.length > 0) {
            console.log('✅ Found entry data');
            const entry = webhookData.entry[0];
            if (entry.changes && entry.changes.length > 0) {
                console.log('✅ Found changes data');
                const change = entry.changes[0];
                if (change.value && change.value.messages && change.value.messages.length > 0) {
                    console.log(`✅ Found ${change.value.messages.length} messages to process`);
                    // Process each message in the webhook
                    for (const message of change.value.messages) {
                        const messageId = message.id;
                        const from = message.from;
                        const messageType = message.type;
                        
                        console.log(`🔄 Processing message: ${messageId} from ${from} type ${messageType}`);
                        
                        await mongoLogger.info('Processing individual message', { 
                            messageId, 
                            from, 
                            type: messageType 
                        });
                        
                        // Check if message has already been processed (in-memory check first)
                        if (processedMessageIds.has(messageId)) {
                            console.log(`⏭️ Message ${messageId} already processed (memory), skipping`);
                            await mongoLogger.info('Message already processed (memory), skipping', { 
                                messageId, 
                                from, 
                                type: messageType 
                            });
                            continue; // Skip this message
                        }
                        
                        // Check database for processed messages (in case server restarted)
                        if (dbConnected) {
                            try {
                                const existingMessage = await ProcessedMessage.findOne({ messageId });
                                if (existingMessage) {
                                    await mongoLogger.info('Message already processed (database), skipping', { 
                                        messageId, 
                                        from, 
                                        type: messageType,
                                        originallyProcessedAt: existingMessage.processedAt
                                    });
                                    // Add to memory cache for future quick checks
                                    processedMessageIds.add(messageId);
                                    continue; // Skip this message
                                }
                            } catch (dbError) {
                                await mongoLogger.warn('Error checking processed messages in database', { 
                                    messageId, 
                                    error: dbError.message 
                                });
                                // Continue processing even if DB check fails
                            }
                        }
                        
                        // Add message ID to processed set
                        processedMessageIds.add(messageId);
                        
                        // Store in database for persistence
                        if (dbConnected) {
                            try {
                                await ProcessedMessage.create({
                                    messageId,
                                    from,
                                    messageType,
                                    webhookData: message
                                });
                            } catch (dbError) {
                                await mongoLogger.warn('Error storing processed message in database', { 
                                    messageId, 
                                    error: dbError.message 
                                });
                                // Continue processing even if DB storage fails
                            }
                        }
                        
                        // Clean up old message IDs (keep only last 1000 to prevent memory issues)
                        if (processedMessageIds.size > 1000) {
                            const idsArray = Array.from(processedMessageIds);
                            processedMessageIds.clear();
                            // Keep the last 500 IDs
                            idsArray.slice(-500).forEach(id => processedMessageIds.add(id));
                        }
                        
                        // Process the message
                        console.log(`🚀 About to call messageHandler.handleIncomingMessage for ${messageId}`);
                        try {
                            const result = await messageHandler.handleIncomingMessage(message);
                            console.log(`✅ Successfully processed message ${messageId}:`, result);
                        } catch (messageError) {
                            console.error(`❌ Error processing message ${messageId}:`, messageError);
                            throw messageError;
                        }
                    }
                } else {
                    console.log('⚠️ No messages found in webhook data');
                    await mongoLogger.info('Webhook received but no messages found', { webhookData });
                }
            } else {
                console.log('⚠️ No changes found in webhook data');
                await mongoLogger.info('Webhook received but no changes found', { webhookData });
            }
        } else {
            console.log('⚠️ No entries found in webhook data');
            await mongoLogger.info('Webhook received but no entries found', { webhookData });
        }
        
        const processingTime = Date.now() - startTime;
        await mongoLogger.info('Async message processing completed', { 
            processingTime: `${processingTime}ms`,
            messageId: webhookData?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id,
            from: webhookData?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        await mongoLogger.logError(error, { 
            source: 'async-message-processing',
            processingTime: `${processingTime}ms`,
            webhookData: webhookData
        });
    }
}

// WhatsApp webhook for receiving messages
app.post('/webhook', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Log incoming webhook immediately
        console.log('📨 Webhook received:', JSON.stringify(req.body, null, 2));
        
        // IMMEDIATELY respond to WhatsApp to prevent retries
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ Immediate response sent to WhatsApp');
        
        // Force refresh connection status before logging webhook
        await mongoLogger.refreshConnection();
        await mongoLogger.logWebhook(req.body, 'webhook');
        
        // Extract message from webhook payload
        const webhookData = req.body;
        
        console.log('🔄 Starting async message processing...');
        
        // Process messages asynchronously (don't await - fire and forget)
        processMessagesAsync(webhookData, startTime).catch(error => {
            console.error('❌ Error in async processing:', error);
            mongoLogger.logError(error, { 
                source: 'webhook-async-processing',
                webhookData: req.body 
            }).catch(logError => {
                console.error('Failed to log error:', logError);
            });
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error('❌ Webhook error:', error);
        
        // Log the error
        await mongoLogger.logError(error, { 
            endpoint: 'webhook',
            processingTime: `${processingTime}ms`,
            requestBody: req.body
        });
        
        // Still respond with 200 to WhatsApp to avoid retries (if not already sent)
        if (!res.headersSent) {
            res.status(200).json({
                status: 'error',
                error: error.message,
                processingTime: `${processingTime}ms`,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Clear processed messages cache (for testing)
app.post('/clear-processed-messages', async (req, res) => {
    try {
        const memoryCount = processedMessageIds.size;
        processedMessageIds.clear();
        
        let dbCount = 0;
        if (dbConnected) {
            const result = await ProcessedMessage.deleteMany({});
            dbCount = result.deletedCount;
        }
        
        console.log(`🧹 Cleared ${memoryCount} messages from memory and ${dbCount} from database`);
        
        res.json({
            success: true,
            message: 'Processed messages cache cleared',
            clearedFromMemory: memoryCount,
            clearedFromDatabase: dbCount
        });
        
    } catch (error) {
        console.error('❌ Error clearing processed messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear processed messages',
            details: error.message
        });
    }
});

// Test endpoint to verify message processing
app.post('/test-message-processing', async (req, res) => {
    try {
        const testMessage = {
            id: 'test_' + Date.now(),
            from: '923260533337',
            type: 'text',
            text: {
                body: 'Hello test message'
            }
        };
        
        console.log('🧪 Testing message handler with:', testMessage);
        
        const result = await messageHandler.handleIncomingMessage(testMessage);
        
        console.log('✅ Test message processed successfully:', result);
        
        res.json({
            success: true,
            message: 'Message handler working correctly',
            testMessage,
            result
        });
        
    } catch (error) {
        console.error('❌ Test message processing failed:', error);
        res.status(500).json({
            success: false,
            error: 'Message handler test failed',
            details: error.message,
            stack: error.stack
        });
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
        await mongoLogger.logError(error, { endpoint: 'send-message' });
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
        await mongoLogger.logError(error, { endpoint: 'send-template' });
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
        await mongoLogger.logError(error, { endpoint: 'send-media' });
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
        await mongoLogger.logError(error, { endpoint: 'send-buttons' });
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

        await mongoLogger.info('Wit.ai testing request', { message });

        const result = await witService.processMessage(message, options);

        // Extract entities from the Wit.ai response
        const entitiesArray = witService.extractEntities(result.data);
        const data = witService.getRequiredDataFromEntities(entitiesArray);
        const dimensions = witService.getDimensionsFromEntities(entitiesArray);
        await mongoLogger.info('Wit.ai processing results', { requiredData: data, dimensions });

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
        await mongoLogger.logError(error, { endpoint: 'wit-testing' });
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
        await mongoLogger.logError(error, { endpoint: 'wit-status' });
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

// Cron jobs status endpoint
app.get('/cron/status', (req, res) => {
    try {
        const status = cronManager.getStatus();
        res.json({
            success: true,
            cronJobs: status,
            isRunning: cronManager.isRunning,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get cron status',
            details: error.message
        });
    }
});

// Manual cron job execution endpoint (for testing)
app.post('/cron/execute/:jobName', async (req, res) => {
    try {
        const { jobName } = req.params;
        const { cleanupLegacyConversations } = await import('./cron/jobs/cleanupJobs.js');
        
        if (jobName === 'cleanup-legacy-conversations') {
            const result = await cleanupLegacyConversations();
            res.json({
                success: true,
                jobName,
                result,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Job not found',
                availableJobs: ['cleanup-legacy-conversations']
            });
        }
    } catch (error) {
        await mongoLogger.logError(error, { endpoint: 'cron-execute' });
        res.status(500).json({
            success: false,
            error: 'Failed to execute cron job',
            details: error.message
        });
    }
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
        await mongoLogger.logError(error, { endpoint: 'analytics-webhooks' });
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
        await mongoLogger.logError(error, { endpoint: 'analytics-recent-calls' });
        res.status(500).json({
            error: 'Failed to get recent calls',
            details: error.message
        });
    }
});

// Error handling middleware
app.use(async (error, req, res, next) => {
    await mongoLogger.logError(error, { source: 'unhandled-error' });
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

// For Vercel serverless deployment or local development
// await mongoLogger.info('Environment check', { vercel: process.env.VERCEL, nodeEnv: process.env.NODE_ENV });

if (!process.env.VERCEL) {
    // await mongoLogger.info('Starting local development server...');
    // Start server for local development only
    const server = app.listen(PORT, () => {
        (async () => {
            // await mongoLogger.info('Server started successfully', {
            //     port: PORT,
            //     phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
            //     apiVersion: process.env.WHATSAPP_VERSION,
            //     webhookUrl: `http://localhost:${PORT}/webhook`,
            //     healthCheckUrl: `http://localhost:${PORT}/health`
            // });
        })();
    });

    server.on('error', async (error) => {
        await mongoLogger.logError(error, { source: 'server-startup' });
    });
} else {
    await mongoLogger.info('Running in Vercel environment, skipping server startup');
}

export default app;
