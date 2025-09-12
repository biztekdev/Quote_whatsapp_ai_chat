import mongoose from 'mongoose';

// Conversation State Schema
const conversationStateSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        index: true
    },
    currentStep: {
        type: String,
        enum: ['start', 'greeting_response', 'category_selection','product_selection', 'dimension_input', 'material_selection', 'finish_selection', 'quantity_input', 'quote_generation', 'completed'],
        default: 'start'
    },
    conversationData: {
        wantsQuote: Boolean,
        requestedCategory: String,
        requestedProductName: String,
        selectedCategory: {
            id: String,
            erp_id: Number,
            name: String,
            description: String
        },
        selectedProduct: {
            id: String,
            erp_id: Number,
            name: String,
            description: String,
            basePrice: Number,
            dimensionFields: [{
                name: String,
                unit: String,
                isRequired: Boolean,
                minValue: Number,
                maxValue: Number
            }]
        },
        dimensions: [{
            name: String,
            value: Number
        }],
        selectedMaterial: String,
        selectedFinish: String,
        quantity: Number,
        quoteData: {
            basePrice: Number,
            materialPrice: Number,
            finishPrice: Number,
            totalPrice: Number,
            generatedAt: Date
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
conversationStateSchema.index({ phone: 1, isActive: 1 });
conversationStateSchema.index({ lastMessageAt: 1 });

// Mylar Bag Products Schema
const mylarBagProductSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    dimensionNames: {
        type: [String],
        required: true,
        default: ['Length', 'Width', 'Height']
    },
    availableMaterials: [{
        name: {
            type: String,
            required: true
        },
        pricePerUnit: {
            type: Number,
            required: true
        },
        description: String
    }],
    availableFinishes: [{
        name: {
            type: String,
            required: true
        },
        pricePerUnit: {
            type: Number,
            required: true
        },
        description: String
    }],
    basePrice: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    collection: 'mylar_bag_products'
});

// Quote Schema
const quoteSchema = new mongoose.Schema({
    quoteId: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        index: true
    },
    customerName: String,
    product: {
        id: String,
        name: String
    },
    dimensions: [{
        name: String,
        value: Number
    }],
    material: {
        name: String,
        price: Number
    },
    finish: {
        name: String,
        price: Number
    },
    quantity: Number,
    pricing: {
        basePrice: Number,
        materialCost: Number,
        finishCost: Number,
        subtotal: Number,
        tax: Number,
        totalPrice: Number
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'accepted', 'rejected', 'expired'],
        default: 'pending'
    },
    validUntil: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    notes: String
}, {
    timestamps: true,
    collection: 'quotes'
});

// Indexes for quotes
quoteSchema.index({ phone: 1, status: 1 });
quoteSchema.index({ validUntil: 1 });
quoteSchema.index({ createdAt: -1 });

// Models (Legacy - renamed to avoid conflicts)
export const LegacyConversationState = mongoose.model('LegacyConversationState', conversationStateSchema);
export const MylarBagProduct = mongoose.model('MylarBagProduct', mylarBagProductSchema);
export const LegacyQuote = mongoose.model('LegacyQuote', quoteSchema);
