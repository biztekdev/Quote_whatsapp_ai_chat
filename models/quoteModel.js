import mongoose from 'mongoose';

// Quote Schema with proper relationships
const quoteSchema = new mongoose.Schema({
    quoteNumber: {
        type: String,
        required: true,
        unique: true,
        default: function() {
            return 'QT' + Date.now() + Math.floor(Math.random() * 1000);
        }
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Material',
        required: true
    },
    finishId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductFinish',
        required: true
    },
    dimensions: [{
        name: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            default: 'inches'
        }
    }],
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    pricing: {
        basePrice: {
            type: Number,
            required: true
        },
        materialCost: {
            type: Number,
            required: true
        },
        finishCost: {
            type: Number,
            required: true
        },
        quantityDiscount: {
            type: Number,
            default: 0
        },
        subtotal: {
            type: Number,
            required: true
        },
        tax: {
            type: Number,
            default: 0
        },
        shipping: {
            type: Number,
            default: 0
        },
        totalPrice: {
            type: Number,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled'],
        default: 'draft'
    },
    validUntil: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    notes: {
        type: String,
        trim: true
    },
    customerNotes: {
        type: String,
        trim: true
    },
    sentAt: Date,
    viewedAt: Date,
    respondedAt: Date
}, {
    timestamps: true,
    collection: 'quotes'
});

// Indexes for quotes
quoteSchema.index({ userId: 1, status: 1 });
quoteSchema.index({ quoteNumber: 1 });
quoteSchema.index({ status: 1, validUntil: 1 });
quoteSchema.index({ createdAt: -1 });

// Conversation State Schema for chat flow
const conversationStateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        index: true
    },
    currentStep: {
        type: String,
        enum: [
            'start',
            'greeting_response', 
            'product_category_selection',
            'product_selection', 
            'dimension_input', 
            'material_selection', 
            'finish_selection', 
            'quantity_input', 
            'quote_review',
            'quote_generation', 
            'completed'
        ],
        default: 'start'
    },
    conversationData: {
        wantsQuote: Boolean,
        selectedCategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProductCategory'
        },
        selectedProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        selectedMaterialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Material'
        },
        selectedFinishId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProductFinish'
        },
        dimensions: [{
            name: String,
            value: Number,
            unit: String
        }],
        quantity: Number,
        currentDimensionIndex: {
            type: Number,
            default: 0
        }
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    completedAt: Date
}, {
    timestamps: true,
    collection: 'conversation_states'
});

// Index for efficient querying
conversationStateSchema.index({ userId: 1, isActive: 1 });
conversationStateSchema.index({ phone: 1, isActive: 1 });
conversationStateSchema.index({ lastMessageAt: 1 });

export const Quote = mongoose.model('Quote', quoteSchema);
export const ConversationState = mongoose.model('ConversationState', conversationStateSchema);
