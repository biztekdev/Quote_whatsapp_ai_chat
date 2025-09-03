import mongoose from 'mongoose';

// Webhook Call Schema - stores each webhook request
const webhookCallSchema = new mongoose.Schema({
    // Basic webhook info
    webhookId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    
    // Request details
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE']
    },
    
    endpoint: {
        type: String,
        required: true
    },
    
    // Headers
    headers: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Request body
    body: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Query parameters
    query: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // WhatsApp specific data
    whatsappData: {
        // From WhatsApp webhook
        object: String,
        entry: [{
            id: String,
            changes: [{
                value: {
                    messaging_product: String,
                    metadata: {
                        display_phone_number: String,
                        phone_number_id: String
                    },
                    contacts: [{
                        profile: {
                            name: String
                        },
                        wa_id: String
                    }],
                    messages: [{
                        from: String,
                        id: String,
                        timestamp: String,
                        text: {
                            body: String
                        },
                        type: String,
                        interactive: mongoose.Schema.Types.Mixed,
                        button: mongoose.Schema.Types.Mixed,
                        image: mongoose.Schema.Types.Mixed,
                        video: mongoose.Schema.Types.Mixed,
                        audio: mongoose.Schema.Types.Mixed,
                        document: mongoose.Schema.Types.Mixed
                    }],
                    statuses: [{
                        id: String,
                        status: String,
                        timestamp: String,
                        recipient_id: String,
                        conversation: mongoose.Schema.Types.Mixed,
                        pricing: mongoose.Schema.Types.Mixed
                    }]
                },
                field: String
            }]
        }]
    },
    
    // Processing details
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    
    processingTime: {
        type: Number, // milliseconds
        default: 0
    },
    
    responseStatus: {
        type: Number,
        default: 200
    },
    
    responseBody: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Error handling
    errorLogs: [{
        message: String,
        stack: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // AI Processing (Wit.ai)
    aiProcessing: {
        processed: {
            type: Boolean,
            default: false
        },
        intent: String,
        entities: mongoose.Schema.Types.Mixed,
        confidence: Number,
        witResponse: mongoose.Schema.Types.Mixed
    },
    
    // Message analysis
    messageAnalysis: {
        messageType: {
            type: String,
            enum: ['text', 'image', 'video', 'audio', 'document', 'interactive', 'button', 'location', 'contact']
        },
        messageLength: Number,
        hasMedia: Boolean,
        language: String,
        sentiment: String,
        keywords: [String]
    },
    
    // User information
    userInfo: {
        phone: String,
        name: String,
        isNewUser: Boolean,
        lastSeen: Date,
        messageCount: {
            type: Number,
            default: 1
        }
    },
    
    // IP and location
    clientIP: String,
    userAgent: String,
    location: {
        country: String,
        city: String,
        timezone: String
    },
    
    // Timestamps
    receivedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    processedAt: Date,
    
    // Metadata
    version: {
        type: String,
        default: '1.0'
    },
    
    tags: [String],
    
    notes: String
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'webhook_calls'
});

// Indexes for better performance
webhookCallSchema.index({ receivedAt: -1 });
webhookCallSchema.index({ 'userInfo.phone': 1 });
webhookCallSchema.index({ processingStatus: 1 });
webhookCallSchema.index({ 'whatsappData.entry.changes.value.messages.from': 1 });
webhookCallSchema.index({ 'aiProcessing.intent': 1 });

// User Stats Schema - aggregated user statistics
const userStatsSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    name: String,
    
    // Message statistics
    totalMessages: {
        type: Number,
        default: 0
    },
    
    messagesByType: {
        text: { type: Number, default: 0 },
        image: { type: Number, default: 0 },
        video: { type: Number, default: 0 },
        audio: { type: Number, default: 0 },
        document: { type: Number, default: 0 },
        interactive: { type: Number, default: 0 },
        button: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    
    // Intent statistics
    intentStats: {
        type: Map,
        of: Number,
        default: new Map()
    },
    
    // Engagement metrics
    firstMessageAt: Date,
    lastMessageAt: Date,
    
    averageResponseTime: Number, // milliseconds
    
    // Session information
    totalSessions: {
        type: Number,
        default: 1
    },
    
    averageMessagesPerSession: Number,
    
    // Preferences (learned from interactions)
    preferences: {
        language: String,
        timezone: String,
        preferredContactTime: String,
        topics: [String]
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    isBlocked: {
        type: Boolean,
        default: false
    },
    
    // Tags for categorization
    tags: [String],
    
    // Custom fields
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    collection: 'user_stats'
});

// System Metrics Schema - overall system statistics
const systemMetricsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true,
        index: true
    },
    
    // Daily totals
    totalWebhooks: {
        type: Number,
        default: 0
    },
    
    totalMessages: {
        type: Number,
        default: 0
    },
    
    uniqueUsers: {
        type: Number,
        default: 0
    },
    
    // Message type breakdown
    messageTypes: {
        text: { type: Number, default: 0 },
        image: { type: Number, default: 0 },
        video: { type: Number, default: 0 },
        audio: { type: Number, default: 0 },
        document: { type: Number, default: 0 },
        interactive: { type: Number, default: 0 },
        button: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    
    // Processing metrics
    averageProcessingTime: Number,
    successfulProcessing: Number,
    failedProcessing: Number,
    
    // Intent statistics
    topIntents: [{
        intent: String,
        count: Number
    }],
    
    // Error tracking
    errorStats: {
        total: { type: Number, default: 0 },
        byType: {
            type: Map,
            of: Number,
            default: new Map()
        }
    },
    
    // Performance metrics
    peakHour: String,
    averageResponseTime: Number
}, {
    timestamps: true,
    collection: 'system_metrics'
});

// Create models
const WebhookCall = mongoose.model('WebhookCall', webhookCallSchema);
const UserStats = mongoose.model('UserStats', userStatsSchema);
const SystemMetrics = mongoose.model('SystemMetrics', systemMetricsSchema);

export { WebhookCall, UserStats, SystemMetrics };
export default { WebhookCall, UserStats, SystemMetrics };
