import mongoose from 'mongoose';

// Finish Categories Schema
const finishCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'finish_categories'
});

// Product Finishes Schema
const productFinishSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FinishCategory',
        required: true,
        index: true
    },
    productCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductCategory',
        required: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    priceType: {
        type: String,
        enum: ['fixed', 'percentage', 'per_unit'],
        default: 'fixed'
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        default: 'piece' // for per_unit pricing
    },
    specifications: [{
        property: String,
        value: String
    }],
    processingTime: {
        type: String, // e.g., "2-3 business days"
        default: "Standard"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    imageUrl: String
}, {
    timestamps: true,
    collection: 'product_finishes'
});

// Indexes for product finishes
productFinishSchema.index({ categoryId: 1, productCategoryId: 1, isActive: 1 });
productFinishSchema.index({ productCategoryId: 1, isActive: 1 });
productFinishSchema.index({ name: 1 });

export const FinishCategory = mongoose.model('FinishCategory', finishCategorySchema);
export const ProductFinish = mongoose.model('ProductFinish', productFinishSchema);
