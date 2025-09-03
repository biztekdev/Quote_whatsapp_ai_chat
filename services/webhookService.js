import { WebhookCall, UserStats, SystemMetrics } from '../models/webhookModels.js';
import crypto from 'crypto';

class WebhookService {
    constructor() {
        this.processingQueue = new Map();
    }
    
    /**
     * Store webhook call data in MongoDB
     */
    async storeWebhookCall(req, res, processingResult = {}) {
        const startTime = Date.now();
        
        try {
            // Generate unique webhook ID
            const webhookId = this.generateWebhookId(req);
            
            // Extract WhatsApp data
            const whatsappData = this.extractWhatsAppData(req.body);
            
            // Analyze message
            const messageAnalysis = this.analyzeMessage(whatsappData);
            
            // Extract user info
            const userInfo = this.extractUserInfo(whatsappData);
            
            // Create webhook call record
            const webhookCall = new WebhookCall({
                webhookId,
                method: req.method,
                endpoint: req.path,
                headers: this.sanitizeHeaders(req.headers),
                body: req.body,
                query: req.query,
                whatsappData,
                messageAnalysis,
                userInfo,
                clientIP: this.getClientIP(req),
                userAgent: req.get('User-Agent'),
                processingStatus: 'completed',
                processingTime: Date.now() - startTime,
                responseStatus: res.statusCode || 200,
                responseBody: processingResult,
                receivedAt: new Date(),
                processedAt: new Date()
            });
            
            // Save to database
            const savedCall = await webhookCall.save();
            console.log(`📊 Webhook call stored: ${webhookId}`);
            
            // Update user statistics (async)
            this.updateUserStats(userInfo, messageAnalysis).catch(err => {
                console.error('Error updating user stats:', err);
            });
            
            // Update system metrics (async)
            this.updateSystemMetrics(messageAnalysis).catch(err => {
                console.error('Error updating system metrics:', err);
            });
            
            return savedCall;
            
        } catch (error) {
            console.error('❌ Error storing webhook call:', error);
            
            // Try to store error record
            try {
                const errorWebhook = new WebhookCall({
                    webhookId: this.generateWebhookId(req),
                    method: req.method,
                    endpoint: req.path,
                    body: req.body,
                    processingStatus: 'failed',
                    processingTime: Date.now() - startTime,
                    errors: [{
                        message: error.message,
                        stack: error.stack,
                        timestamp: new Date()
                    }],
                    receivedAt: new Date()
                });
                
                await errorWebhook.save();
            } catch (saveError) {
                console.error('❌ Failed to store error webhook:', saveError);
            }
            
            throw error;
        }
    }
    
    /**
     * Update AI processing results
     */
    async updateAIProcessing(webhookId, aiResult) {
        try {
            await WebhookCall.findOneAndUpdate(
                { webhookId },
                {
                    aiProcessing: {
                        processed: true,
                        intent: aiResult.intent,
                        entities: aiResult.entities,
                        confidence: aiResult.confidence,
                        witResponse: aiResult.fullResponse
                    }
                }
            );
            
            console.log(`🤖 AI processing updated for webhook: ${webhookId}`);
        } catch (error) {
            console.error('Error updating AI processing:', error);
        }
    }
    
    /**
     * Generate unique webhook ID
     */
    generateWebhookId(req) {
        const timestamp = Date.now();
        const hash = crypto.createHash('md5')
            .update(`${req.method}-${req.path}-${timestamp}-${Math.random()}`)
            .digest('hex')
            .substring(0, 8);
        return `webhook_${timestamp}_${hash}`;
    }
    
    /**
     * Extract WhatsApp specific data
     */
    extractWhatsAppData(body) {
        if (!body || typeof body !== 'object') {
            return {};
        }
        
        // Return the full body if it contains WhatsApp webhook structure
        if (body.object === 'whatsapp_business_account' || body.entry) {
            return body;
        }
        
        return {};
    }
    
    /**
     * Analyze message content and type
     */
    analyzeMessage(whatsappData) {
        const analysis = {
            messageType: 'unknown',
            messageLength: 0,
            hasMedia: false,
            keywords: []
        };
        
        try {
            if (whatsappData.entry && whatsappData.entry[0]) {
                const changes = whatsappData.entry[0].changes;
                if (changes && changes[0] && changes[0].value.messages) {
                    const message = changes[0].value.messages[0];
                    
                    if (message) {
                        analysis.messageType = message.type || 'unknown';
                        
                        // Analyze text messages
                        if (message.text && message.text.body) {
                            analysis.messageLength = message.text.body.length;
                            analysis.keywords = this.extractKeywords(message.text.body);
                        }
                        
                        // Check for media
                        analysis.hasMedia = !!(message.image || message.video || 
                                             message.audio || message.document);
                    }
                }
            }
        } catch (error) {
            console.error('Error analyzing message:', error);
        }
        
        return analysis;
    }
    
    /**
     * Extract user information
     */
    extractUserInfo(whatsappData) {
        const userInfo = {
            phone: null,
            name: null,
            isNewUser: false,
            messageCount: 1
        };
        
        try {
            if (whatsappData.entry && whatsappData.entry[0]) {
                const changes = whatsappData.entry[0].changes;
                if (changes && changes[0] && changes[0].value) {
                    const value = changes[0].value;
                    
                    // Extract phone number
                    if (value.messages && value.messages[0]) {
                        userInfo.phone = value.messages[0].from;
                    }
                    
                    // Extract name
                    if (value.contacts && value.contacts[0]) {
                        userInfo.name = value.contacts[0].profile?.name;
                    }
                }
            }
        } catch (error) {
            console.error('Error extracting user info:', error);
        }
        
        return userInfo;
    }
    
    /**
     * Update user statistics
     */
    async updateUserStats(userInfo, messageAnalysis) {
        if (!userInfo.phone) return;
        
        try {
            const now = new Date();
            
            await UserStats.findOneAndUpdate(
                { phone: userInfo.phone },
                {
                    $inc: {
                        totalMessages: 1,
                        [`messagesByType.${messageAnalysis.messageType}`]: 1
                    },
                    $set: {
                        lastMessageAt: now,
                        name: userInfo.name || undefined
                    },
                    $setOnInsert: {
                        firstMessageAt: now,
                        totalSessions: 1
                    }
                },
                { upsert: true, new: true }
            );
            
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }
    
    /**
     * Update system metrics
     */
    async updateSystemMetrics(messageAnalysis) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            await SystemMetrics.findOneAndUpdate(
                { date: today },
                {
                    $inc: {
                        totalWebhooks: 1,
                        totalMessages: 1,
                        [`messageTypes.${messageAnalysis.messageType}`]: 1
                    }
                },
                { upsert: true }
            );
            
        } catch (error) {
            console.error('Error updating system metrics:', error);
        }
    }
    
    /**
     * Sanitize headers (remove sensitive data)
     */
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        
        // Remove sensitive headers
        delete sanitized.authorization;
        delete sanitized.cookie;
        delete sanitized['x-forwarded-for'];
        
        return sanitized;
    }
    
    /**
     * Get client IP address
     */
    getClientIP(req) {
        return req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               'unknown';
    }
    
    /**
     * Extract keywords from text
     */
    extractKeywords(text) {
        if (!text || typeof text !== 'string') return [];
        
        // Simple keyword extraction
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 10); // Limit to 10 keywords
            
        return [...new Set(words)]; // Remove duplicates
    }
    
    /**
     * Get webhook statistics
     */
    async getWebhookStats(options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                endDate = new Date(),
                limit = 100
            } = options;
            
            const stats = await WebhookCall.aggregate([
                {
                    $match: {
                        receivedAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCalls: { $sum: 1 },
                        successfulCalls: {
                            $sum: { $cond: [{ $eq: ['$processingStatus', 'completed'] }, 1, 0] }
                        },
                        failedCalls: {
                            $sum: { $cond: [{ $eq: ['$processingStatus', 'failed'] }, 1, 0] }
                        },
                        averageProcessingTime: { $avg: '$processingTime' },
                        uniqueUsers: { $addToSet: '$userInfo.phone' }
                    }
                }
            ]);
            
            return stats[0] || {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageProcessingTime: 0,
                uniqueUsers: []
            };
            
        } catch (error) {
            console.error('Error getting webhook stats:', error);
            throw error;
        }
    }
    
    /**
     * Get recent webhook calls
     */
    async getRecentCalls(limit = 50) {
        try {
            return await WebhookCall.find()
                .sort({ receivedAt: -1 })
                .limit(limit)
                .select('webhookId method endpoint processingStatus userInfo.phone messageAnalysis.messageType receivedAt processingTime')
                .lean();
        } catch (error) {
            console.error('Error getting recent calls:', error);
            throw error;
        }
    }
}

export default new WebhookService();
