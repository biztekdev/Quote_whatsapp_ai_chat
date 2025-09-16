import mongoose from 'mongoose';

// Schema for tracking message status to prevent duplicate responses
const messageStatusSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    from: {
        type: String,
        required: true,
        index: true
    },
    messageType: {
        type: String,
        required: true
    },
    // Processing status
    processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'processed', 'failed'],
        default: 'pending',
        index: true
    },
    // Response status
    responseStatus: {
        type: String,
        enum: ['not_sent', 'sending', 'sent', 'failed'],
        default: 'not_sent',
        index: true
    },
    // Timestamps
    receivedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    processedAt: {
        type: Date
    },
    respondedAt: {
        type: Date
    },
    // Response details
    responseMessageId: {
        type: String
    },
    responseType: {
        type: String // text, image, document, etc.
    },
    // Error tracking
    processingError: {
        type: String
    },
    responseError: {
        type: String
    },
    // Retry tracking
    retryCount: {
        type: Number,
        default: 0
    },
    lastRetryAt: {
        type: Date
    },
    // Webhook data for reference
    webhookData: {
        type: mongoose.Schema.Types.Mixed
    },
    // Conversation context
    conversationId: {
        type: String,
        index: true
    }
}, {
    timestamps: true,
    collection: 'message_status'
});

// Indexes for efficient queries
messageStatusSchema.index({ messageId: 1, from: 1 });
messageStatusSchema.index({ processingStatus: 1, responseStatus: 1 });
messageStatusSchema.index({ receivedAt: 1 }); // For cleanup
messageStatusSchema.index({ conversationId: 1 });

// TTL index - auto-delete after 7 days
messageStatusSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 604800 });

// Instance methods
messageStatusSchema.methods.markAsProcessing = function() {
    this.processingStatus = 'processing';
    this.processedAt = new Date();
    return this.save();
};

messageStatusSchema.methods.markAsProcessed = function() {
    this.processingStatus = 'processed';
    this.processedAt = new Date();
    return this.save();
};

messageStatusSchema.methods.markAsFailed = function(error) {
    this.processingStatus = 'failed';
    this.processingError = error;
    this.processedAt = new Date();
    return this.save();
};

messageStatusSchema.methods.markResponseAsSending = function() {
    this.responseStatus = 'sending';
    return this.save();
};

messageStatusSchema.methods.markResponseAsSent = function(responseMessageId, responseType) {
    this.responseStatus = 'sent';
    this.respondedAt = new Date();
    this.responseMessageId = responseMessageId;
    this.responseType = responseType;
    return this.save();
};

messageStatusSchema.methods.markResponseAsFailed = function(error) {
    this.responseStatus = 'failed';
    this.responseError = error;
    return this.save();
};

messageStatusSchema.methods.canSendResponse = function() {
    return this.responseStatus === 'not_sent' || this.responseStatus === 'failed';
};

messageStatusSchema.methods.hasBeenProcessed = function() {
    return this.processingStatus === 'processed';
};

messageStatusSchema.methods.hasResponseBeenSent = function() {
    return this.responseStatus === 'sent';
};

// Static methods
messageStatusSchema.statics.findByMessageId = function(messageId) {
    return this.findOne({ messageId });
};

messageStatusSchema.statics.findUnprocessedMessages = function(limit = 100) {
    return this.find({
        processingStatus: { $in: ['pending', 'failed'] },
        receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ receivedAt: 1 }).limit(limit);
};

messageStatusSchema.statics.findUnrespondedMessages = function(limit = 100) {
    return this.find({
        processingStatus: 'processed',
        responseStatus: { $in: ['not_sent', 'failed'] },
        receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ receivedAt: 1 }).limit(limit);
};

messageStatusSchema.statics.cleanupOldEntries = function(daysOld = 7) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    return this.deleteMany({ receivedAt: { $lt: cutoffDate } });
};

export const MessageStatus = mongoose.model('MessageStatus', messageStatusSchema);