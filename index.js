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
import messageStatusService from './services/messageStatusService.js';
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

// Async function to process messages without blocking webhook response
async function processMessagesAsync(webhookData, startTime) {
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        console.log(`🔄 Processing messages`);

        // Check if this is a valid WhatsApp webhook with messages
        if (webhookData.entry && webhookData.entry.length > 0) {

            const entry = webhookData.entry[0];
            if (entry.changes && entry.changes.length > 0) {

                const change = entry.changes[0];
                if (change.value && change.value.messages && change.value.messages.length > 0) {

                    // Filter out messages that are from us (our own sent messages)
                    const userMessages = change.value.messages.filter(message => {
                        // Skip messages that don't have a 'from' field or are from our number
                        if (!message.from) return false;

                        // Skip messages that are status updates or sent by us
                        // WhatsApp sometimes sends webhooks with our own messages
                        const isFromUs = message.from === process.env.WHATSAPP_PHONE_NUMBER_ID ||
                                       message.from === change.value.metadata?.phone_number_id;

                        if (isFromUs) {
                            console.log(`⏭️ [${processingId}] Skipping our own message: ${message.id}`);
                            return false;
                        }

                        return true;
                    });

                    if (userMessages.length === 0) {
                        console.log(`⚠️ [${processingId}] No user messages found in webhook data - all messages filtered out`);
                        return;
                    }

                    // Process each user message in the webhook
                    for (let i = 0; i < userMessages.length; i++) {
                        const message = userMessages[i];
                        const messageId = message.id;
                        const from = message.from;
                        const messageType = message.type;
                        const messageBody = message.text?.body || message.caption || `[${messageType} message]`;

                        const messageProcessingId = `${processingId}_msg_${i}`;

                        console.log(`🔄 [${messageProcessingId}] Processing user message: ${messageId} from ${from} type ${messageType}`);

                        // Initialize message status tracking
                        await messageStatusService.initializeMessageStatus(
                            messageId,
                            from,
                            messageType,
                            message, // webhookData
                            null // conversationId
                        );

                        // Check if message can be processed
                        const canProcess = await messageStatusService.canProcessMessage(messageId);
                        if (!canProcess) {
                            console.log(`⏭️ [${messageProcessingId}] Message already processed, skipping`);
                            continue; // Skip this message
                        }

                        // Mark message as processing
                        await messageStatusService.markAsProcessing(messageId);

                        // Process the message
                        console.log(`🚀 [${messageProcessingId}] About to call messageHandler.handleIncomingMessage`);

                        try {
                            const handlerStartTime = Date.now();
                            const result = await messageHandler.handleIncomingMessage(message);
                            const handlerEndTime = Date.now();

                            // Mark message as processed successfully
                            await messageStatusService.markAsProcessed(messageId);

                            console.log(`✅ [${messageProcessingId}] Message handler completed successfully in ${handlerEndTime - handlerStartTime}ms`);

                        } catch (messageError) {
                            console.error(`❌ [${messageProcessingId}] Message handler failed:`, messageError);

                            // Mark message processing as failed
                            await messageStatusService.markAsFailed(messageId, messageError.message);

                            throw messageError;
                        }
                    }
                } else if (change.value && change.value.statuses && change.value.statuses.length > 0) {
                    // This is a status update webhook - ignore it
                    console.log(`ℹ️ [${processingId}] Status update webhook received - ignoring`);
                    return;
                } else {
                    console.log(`⚠️ [${processingId}] No messages or statuses found in webhook data - skipping`);
                }
            } else {
                console.log(`⚠️ [${processingId}] No changes found in webhook data`);
            }
        } else {
            console.log(`⚠️ [${processingId}] No entries found in webhook data`);
        }

        const processingTime = Date.now() - startTime;
        console.log(`🎯 [${processingId}] Processing completed in ${processingTime}ms`);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        // Async message processing failed
        console.error(`💥 [${processingId}] Processing failed:`, error);
        throw error; // Re-throw so webhook knows processing failed
    }
}

// WhatsApp webhook for receiving messages
app.post('/webhook', async (req, res) => {
    const startTime = Date.now();
    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        const responseDelay = Date.now() - startTime;
        
        // try {
        //     await webhookService.storeWebhookCall(req, res);
        //     console.log(`📝 [${webhookId}] Webhook stored in service`);
        // } catch (storeError) {
        //     console.error(`❌ [${webhookId}] Failed to store webhook:`, storeError);
        // }
        
        const webhookData = req.body;
        
        // Log webhook data analysis
        const messageCount = webhookData?.entry?.[0]?.changes?.[0]?.value?.messages?.length || 0;
        const hasMessages = messageCount > 0;
        const firstMessage = hasMessages ? webhookData.entry[0].changes[0].value.messages[0] : null;
       console.log("firstMessage ", firstMessage);
        // if (!hasMessages) {
        //     console.log(`⚠️ No messages found, skipping`);
        //     return res.status(200).json({
        //         status: 'success',
        //         message: 'No messages to process',
        //         processingTime: `${responseDelay}ms`,
        //         timestamp: new Date().toISOString(),
        //         webhookId: webhookId
        //     });
        // }
        
        // Process messages and wait for completion before responding
        try {
            // Add timeout to prevent hanging (30 seconds)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Webhook processing timeout after 20 seconds')), 20000);
            });
            
            await Promise.race([
                processMessagesAsync(webhookData, startTime),
                timeoutPromise
            ]);
            
            const totalProcessingTime = Date.now() - startTime;
            console.log(`✅ [${webhookId}] Webhook processing completed in ${totalProcessingTime}ms`);
            
            // Return response after processing is complete
            return res.status(200).json({
                status: 'success',
                message: 'Webhook received and processing completed',
                messageCount: messageCount,
                processingTime: `${totalProcessingTime}ms`,
                timestamp: new Date().toISOString(),
                webhookId: webhookId
            });
            
        } catch (processingError) {
            console.error(`❌ [${webhookId}] Processing error:`, processingError);
            
            const totalProcessingTime = Date.now() - startTime;
            
            // Return error response after processing fails
            return res.status(200).json({
                status: 'error',
                message: 'Webhook received but processing failed',
                error: processingError.message,
                messageCount: messageCount,
                processingTime: `${totalProcessingTime}ms`,
                timestamp: new Date().toISOString(),
                webhookId: webhookId
            });
        }

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        if (!res.headersSent) {
            res.status(200).json({
                status: 'error',
                error: error.message,
                processingTime: `${processingTime}ms`,
                timestamp: new Date().toISOString(),
                webhookId: webhookId
            });
        }
    }
});

// Clear processed messages cache (for testing)
app.post('/clear-processed-messages', async (req, res) => {
    try {
        // Clear database entries only
        let dbCount = 0;
        if (dbConnected) {
            const result = await messageStatusService.cleanupOldEntries(0); // Delete all entries
            dbCount = result.deletedCount;
        }

        console.log(`🧹 Cleared ${dbCount} messages from database`);

        res.json({
            success: true,
            message: 'All processed messages cleared successfully',
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

// Reset conversation for a specific phone number
app.post('/reset-conversation', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required',
                example: { phone: "923260533337" }
            });
        }
        
        // Import conversation service
        const conversationService = (await import('./services/conversationService.js')).default;
        
        // Reset the conversation
        const result = await conversationService.resetConversation(phone);
        
        console.log(`🔄 Conversation reset for phone: ${phone}`);
        
        res.json({
            success: true,
            message: `Conversation reset successfully for ${phone}`,
            phone: phone,
            newConversationState: result
        });
        
    } catch (error) {
        console.error('❌ Error resetting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset conversation',
            details: error.message
        });
    }
});

// Get detailed logs from database
app.get('/webhook-logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const step = req.query.step; // Optional filter by step
        const processingId = req.query.processingId; // Optional filter by processing ID
        
        let query = {};
        if (step) query['metadata.step'] = step;
        if (processingId) {
            query.$or = [
                { 'metadata.processingId': processingId },
                { 'metadata.webhookId': processingId },
                { 'metadata.messageProcessingId': processingId }
            ];
        }
        
        // Import the Log model
        let Log;
        try {
            const logModule = await import('./models/logModel.js');
            Log = logModule.Log || logModule.default;
        } catch (importError) {
            console.error('Failed to import Log model:', importError);
            return res.status(500).json({
                success: false,
                error: 'Log model not available',
                details: importError.message
            });
        }
        
        const logs = await Log.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
        
        res.json({
            success: true,
            count: logs.length,
            logs: logs,
            filters: { step, processingId, limit }
        });
        
    } catch (error) {
        console.error('❌ Error fetching webhook logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch webhook logs',
            details: error.message
        });
    }
});

// Check webhook configuration and recent calls
app.get('/webhook-config-check', async (req, res) => {
    try {
        const recentCalls = await webhookService.getRecentCalls(5);
        
        res.json({
            success: true,
            webhookUrl: 'https://quote-whatsapp-ai-chat.vercel.app/webhook',
            verifyToken: process.env.WEBHOOK_VERIFY_TOKEN ? 'Set' : 'Missing',
            recentCalls: recentCalls.length,
            lastCall: recentCalls[0]?.receivedAt || 'None',
            webhookTypes: recentCalls.map(call => ({
                timestamp: call.receivedAt,
                hasMessages: !!(call.whatsappData?.entry?.[0]?.changes?.[0]?.value?.messages?.length),
                messageCount: call.whatsappData?.entry?.[0]?.changes?.[0]?.value?.messages?.length || 0,
                field: call.whatsappData?.entry?.[0]?.changes?.[0]?.field,
                webhookType: call.whatsappData?.entry?.[0]?.changes?.[0]?.value?.statuses ? 'status' : 'message'
            })),
            instructions: {
                step1: 'Go to WhatsApp Business API Manager',
                step2: 'Check your webhook configuration',
                step3: 'Make sure you subscribed to "messages" field',
                step4: 'Verify webhook URL is correct',
                step5: 'Test by sending a message from WhatsApp'
            }
        });
        
    } catch (error) {
        console.error('❌ Error in webhook-config-check:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check webhook configuration',
            details: error.message
        });
    }
});

// Check if webhooks are being received in real-time
app.get('/webhook-status', async (req, res) => {
    try {
        const recentCalls = await webhookService.getRecentCalls(5);
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        const recentWebhooks = recentCalls.filter(call => 
            new Date(call.receivedAt) > fiveMinutesAgo
        );
        
        res.json({
            success: true,
            status: {
                totalWebhooks: recentCalls.length,
                recentWebhooks: recentWebhooks.length,
                lastWebhook: recentCalls[0]?.receivedAt || 'None',
                lastWebhookAge: recentCalls[0] ? 
                    Math.round((now - new Date(recentCalls[0].receivedAt)) / 1000 / 60) + ' minutes ago' : 
                    'Never',
                hasMessages: recentCalls[0]?.whatsappData?.entry?.[0]?.changes?.[0]?.value?.messages?.length > 0,
                messageCount: recentCalls[0]?.whatsappData?.entry?.[0]?.changes?.[0]?.value?.messages?.length || 0
            },
            recentWebhooks: recentWebhooks.map(call => ({
                timestamp: call.receivedAt,
                hasMessages: !!(call.whatsappData?.entry?.[0]?.changes?.[0]?.value?.messages?.length),
                messageCount: call.whatsappData?.entry?.[0]?.changes?.[0]?.value?.messages?.length || 0
            }))
        });
        
    } catch (error) {
        console.error('❌ Error in webhook-status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get webhook status',
            details: error.message
        });
    }
});

// Get latest webhook data with full details
app.get('/latest-webhook', async (req, res) => {
    try {
        if (!dbConnected) {
            return res.json({
                success: false,
                error: 'Database not connected'
            });
        }

        const recentCalls = await webhookService.getRecentCalls(1);
        
        if (recentCalls.length === 0) {
            return res.json({
                success: true,
                message: 'No webhooks received yet',
                count: 0
            });
        }

        const latestCall = recentCalls[0];
        const webhookData = latestCall.whatsappData;
        
        res.json({
            success: true,
            latestWebhook: {
                timestamp: latestCall.receivedAt,
                rawData: webhookData,
                analysis: {
                    hasObject: !!webhookData?.object,
                    hasEntry: !!webhookData?.entry,
                    entryLength: webhookData?.entry?.length || 0,
                    hasChanges: !!webhookData?.entry?.[0]?.changes,
                    changesLength: webhookData?.entry?.[0]?.changes?.length || 0,
                    hasValue: !!webhookData?.entry?.[0]?.changes?.[0]?.value,
                    hasMessages: !!webhookData?.entry?.[0]?.changes?.[0]?.value?.messages,
                    messageCount: webhookData?.entry?.[0]?.changes?.[0]?.value?.messages?.length || 0,
                    hasStatuses: !!webhookData?.entry?.[0]?.changes?.[0]?.value?.statuses,
                    statusCount: webhookData?.entry?.[0]?.changes?.[0]?.value?.statuses?.length || 0,
                    firstMessage: webhookData?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] || null,
                    field: webhookData?.entry?.[0]?.changes?.[0]?.field
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error in latest-webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get latest webhook data',
            details: error.message
        });
    }
});

// Detailed webhook analysis
app.get('/debug-webhooks', async (req, res) => {
    try {
        // Get recent webhook calls from the webhook service
        if (!dbConnected) {
            return res.json({
                success: false,
                error: 'Database not connected',
                message: 'Cannot retrieve webhook data without database'
            });
        }

        const recentCalls = await webhookService.getRecentCalls(5);
        
        res.json({
            success: true,
            count: recentCalls.length,
            webhooks: recentCalls.map(call => {
                const entry = call.whatsappData?.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                
                return {
                    timestamp: call.receivedAt,
                    // Raw webhook structure analysis
                    hasEntry: !!entry,
                    hasChanges: !!changes,
                    hasValue: !!value,
                    field: changes?.field,
                    // Message analysis
                    hasMessages: !!(value?.messages?.length),
                    messageCount: value?.messages?.length || 0,
                    // Status analysis
                    hasStatuses: !!(value?.statuses?.length),
                    statusCount: value?.statuses?.length || 0,
                    // Raw data for debugging
                    rawStructure: {
                        object: call.whatsappData?.object,
                        entryId: entry?.id,
                        changesField: changes?.field,
                        valueKeys: value ? Object.keys(value) : [],
                        messages: value?.messages || [],
                        statuses: value?.statuses || []
                    }
                };
            }),
            environment: {
                verifyToken: process.env.WEBHOOK_VERIFY_TOKEN ? 'Set' : 'Missing',
                webhookUrl: 'https://quote-whatsapp-ai-chat.vercel.app/webhook'
            }
        });
        
    } catch (error) {
        console.error('❌ Error in debug-webhooks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get debug webhook data',
            details: error.message
        });
    }
});

// Get processing pipeline status
app.get('/processing-status', async (req, res) => {
    try {
        // Get message status statistics
        const messageStats = await messageStatusService.getStatistics(24); // Last 24 hours

        const status = {
            messageStatus: {
                total: messageStats.total,
                processed: messageStats.processed,
                responded: messageStats.responded,
                failed: messageStats.failed,
                responseFailed: messageStats.responseFailed,
                memoryCacheSize: messageStats.memoryCacheSize
            },
            database: {
                connected: dbConnected,
                status: dbConnected ? 'Connected' : 'Disconnected'
            },
            server: {
                uptime: process.uptime(),
                nodeVersion: process.version,
                platform: process.platform
            },
            whatsapp: {
                accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'Present' : 'Missing',
                phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'Missing'
            }
        };

        res.json({
            success: true,
            status,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get processing status',
            details: error.message
        });
    }
});

// Get conversation status for a phone number
app.get('/conversation-status/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        // Import conversation service
        const conversationService = (await import('./services/conversationService.js')).default;
        
        // Get conversation state
        const conversationState = await conversationService.getConversationState(phone);
        
        res.json({
            success: true,
            phone: phone,
            conversationState: {
                currentStep: conversationState.currentStep,
                isActive: conversationState.isActive,
                lastMessageAt: conversationState.lastMessageAt,
                conversationData: conversationState.conversationData,
                createdAt: conversationState.createdAt,
                updatedAt: conversationState.updatedAt
            }
        });
        
    } catch (error) {
        console.error('❌ Error getting conversation status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get conversation status',
            details: error.message
        });
    }
});

// Diagnostic endpoint to check WhatsApp configuration
app.get('/whatsapp-config-check', async (req, res) => {
    try {
        const config = {
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'Present' : 'Missing',
            phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'Missing',
            version: process.env.WHATSAPP_VERSION || 'v23.0',
            baseURL: process.env.WHATSAPP_PHONE_NUMBER_ID ? 
                `https://graph.facebook.com/${process.env.WHATSAPP_VERSION || 'v23.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}` : 
                'Cannot construct - missing phone number ID'
        };
        
        console.log('🔧 WhatsApp Configuration Check:', config);
        
        // Test WhatsApp service initialization
        let serviceStatus = 'Unknown';
        try {
            const testService = new WhatsAppService();
            serviceStatus = testService.accessToken && testService.phoneNumberId ? 'Properly configured' : 'Missing credentials';
        } catch (error) {
            serviceStatus = `Error: ${error.message}`;
        }
        
        res.json({
            success: true,
            configuration: config,
            serviceStatus: serviceStatus,
            recommendations: [
                config.accessToken === 'Missing' ? 'Set WHATSAPP_ACCESS_TOKEN environment variable' : null,
                !config.phoneNumberId || config.phoneNumberId === 'Missing' ? 'Set WHATSAPP_PHONE_NUMBER_ID environment variable' : null,
                'Make sure your webhook URL is configured in Facebook Developer Console',
                'Verify webhook verification token matches your server'
            ].filter(Boolean)
        });
        
    } catch (error) {
        console.error('❌ Error checking WhatsApp config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check WhatsApp configuration',
            details: error.message
        });
    }
});

// Test webhook verification
app.get('/test-webhook-verification', async (req, res) => {
    const testQuery = {
        'hub.mode': 'subscribe',
        'hub.verify_token': process.env.WEBHOOK_VERIFY_TOKEN,
        'hub.challenge': 'test_challenge_123'
    };
    
    res.json({
        success: true,
        message: 'Webhook verification test',
        testUrl: `https://quote-whatsapp-ai-chat.vercel.app/webhook?${new URLSearchParams(testQuery).toString()}`,
        environment: {
            verifyToken: process.env.WEBHOOK_VERIFY_TOKEN ? 'Set' : 'Missing',
            webhookUrl: 'https://quote-whatsapp-ai-chat.vercel.app/webhook'
        },
        instructions: [
            '1. Copy the testUrl above',
            '2. Paste it in your browser',
            '3. You should see "test_challenge_123" as response',
            '4. If you see "Forbidden", check your WEBHOOK_VERIFY_TOKEN'
        ]
    });
});

// Test webhook endpoint
app.post('/test-webhook', async (req, res) => {
    console.log('🧪 Test webhook called with:', req.body);
    
    // Simulate a real WhatsApp webhook
    const testWebhookData = {
        object: "whatsapp_business_account",
        entry: [{
            id: "489160957621782",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: {
                        display_phone_number: "15550000000",
                        phone_number_id: "489160957621782"
                    },
                    contacts: [{
                        profile: {
                            name: "Test User"
                        },
                        wa_id: "923260533337"
                    }],
                    messages: [{
                        from: "923260533337",
                        id: `test_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        text: {
                            body: "Test message from webhook"
                        },
                        type: "text"
                    }]
                },
                field: "messages"
            }]
        }]
    };
    
    try {
        // Process the test webhook
        await processMessagesAsync(testWebhookData, Date.now());
        
        res.json({
            success: true,
            message: 'Test webhook processed successfully',
            webhookData: testWebhookData
        });
    } catch (error) {
        console.error('❌ Test webhook error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            webhookData: testWebhookData
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

        // Clear any existing response tracking for this test message
        if (messageHandler && messageHandler.responseTracker) {
            messageHandler.responseTracker.delete(testMessage.id);
        }

        const result = await messageHandler.handleIncomingMessage(testMessage);

        console.log('✅ Test message processed successfully:', result);

        // Check if response was sent using MessageStatusService
        const hasResponded = await messageStatusService.hasResponseBeenSent(testMessage.id);

        res.json({
            success: true,
            message: 'Message handler working correctly',
            testMessage,
            result,
            responsesSent: hasResponded ? 1 : 0
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
        const { cleanupLegacyConversations, cleanupMessageStatus } = await import('./cron/jobs/cleanupJobs.js');
        
        if (jobName === 'cleanup-legacy-conversations') {
            const result = await cleanupLegacyConversations();
            res.json({
                success: true,
                jobName,
                result,
                timestamp: new Date().toISOString()
            });
        } else if (jobName === 'cleanup-message-status') {
            const result = await cleanupMessageStatus();
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
                availableJobs: ['cleanup-legacy-conversations', 'cleanup-message-status']
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

// Message Status Management Endpoints

// Get message status by message ID
app.get('/message-status/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const status = await messageStatusService.getMessageStatus(messageId);

        if (!status) {
            return res.status(404).json({
                success: false,
                error: 'Message status not found'
            });
        }

        res.json({
            success: true,
            messageStatus: {
                messageId: status.messageId,
                from: status.from,
                messageType: status.messageType,
                processingStatus: status.processingStatus,
                responseStatus: status.responseStatus,
                receivedAt: status.receivedAt,
                processedAt: status.processedAt,
                respondedAt: status.respondedAt,
                responseMessageId: status.responseMessageId,
                responseType: status.responseType,
                processingError: status.processingError,
                responseError: status.responseError,
                retryCount: status.retryCount
            }
        });

    } catch (error) {
        console.error('❌ Error getting message status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get message status',
            details: error.message
        });
    }
});

// Get unprocessed messages
app.get('/message-status/unprocessed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const unprocessedMessages = await messageStatusService.getUnprocessedMessages(limit);

        res.json({
            success: true,
            count: unprocessedMessages.length,
            unprocessedMessages: unprocessedMessages.map(msg => ({
                messageId: msg.messageId,
                from: msg.from,
                messageType: msg.messageType,
                receivedAt: msg.receivedAt,
                processingStatus: msg.processingStatus,
                retryCount: msg.retryCount
            }))
        });

    } catch (error) {
        console.error('❌ Error getting unprocessed messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unprocessed messages',
            details: error.message
        });
    }
});

// Get unresponded messages
app.get('/message-status/unresponded', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const unrespondedMessages = await messageStatusService.getUnrespondedMessages(limit);

        res.json({
            success: true,
            count: unrespondedMessages.length,
            unrespondedMessages: unrespondedMessages.map(msg => ({
                messageId: msg.messageId,
                from: msg.from,
                messageType: msg.messageType,
                receivedAt: msg.receivedAt,
                processedAt: msg.processedAt,
                responseStatus: msg.responseStatus,
                retryCount: msg.retryCount
            }))
        });

    } catch (error) {
        console.error('❌ Error getting unresponded messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unresponded messages',
            details: error.message
        });
    }
});

// Reset message status (for debugging/testing)
app.post('/message-status/reset/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const status = await messageStatusService.resetMessageStatus(messageId);

        res.json({
            success: true,
            message: 'Message status reset successfully',
            messageId,
            newStatus: {
                processingStatus: status.processingStatus,
                responseStatus: status.responseStatus,
                retryCount: status.retryCount
            }
        });

    } catch (error) {
        console.error('❌ Error resetting message status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset message status',
            details: error.message
        });
    }
});

// Get message status statistics
app.get('/message-status/stats', async (req, res) => {
    try {
        const hoursBack = parseInt(req.query.hours) || 24;
        const stats = await messageStatusService.getStatistics(hoursBack);

        res.json({
            success: true,
            statistics: stats,
            timeRange: `${hoursBack} hours`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting message status statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get message status statistics',
            details: error.message
        });
    }
});

// Cleanup old message status entries
app.post('/message-status/cleanup', async (req, res) => {
    try {
        const daysOld = parseInt(req.query.days) || 7;
        const result = await messageStatusService.cleanupOldEntries(daysOld);

        res.json({
            success: true,
            message: `Cleaned up ${result.deletedCount} old message status entries`,
            deletedCount: result.deletedCount,
            daysOld
        });

    } catch (error) {
        console.error('❌ Error cleaning up message status entries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup message status entries',
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
