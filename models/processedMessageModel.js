import mongoose from 'mongoose';


// Schema for tracking processed messages to prevent duplicates
const processedMessageSchema = new mongoose.Schema({
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
    processedAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Auto-delete after 24 hours (TTL index)
    },
    webhookData: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    collection: 'processed_messages'
});

// Compound index for efficient queries
processedMessageSchema.index({ messageId: 1, from: 1 });
processedMessageSchema.index({ processedAt: 1 }); // For TTL

export const ProcessedMessage = mongoose.model('ProcessedMessage', processedMessageSchema);
