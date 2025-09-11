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
    erp_id: {
        type: Number,
        required: true,
        unique: true,
        index: true // Index for fast lookups by ERP ID
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    productCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductCategory',
        required: true,
        index: true
    },
    erp_product_category_id: {
        type: Number,
        required: true,
        index: true // ERP product category reference
    },
    description: {
        type: String,
        trim: true
    },
    attribute: {
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
    },
    imageUrl: String
}, {
    timestamps: true,
    collection: 'product_finishes'
});

// Indexes for product finishes
productFinishSchema.index({ erp_id: 1 }); // ERP ID index
productFinishSchema.index({ productCategoryId: 1, isActive: 1 });
productFinishSchema.index({ erp_product_category_id: 1, isActive: 1 });
productFinishSchema.index({ name: 1 });

export const FinishCategory = mongoose.model('FinishCategory', finishCategorySchema);
export const ProductFinish = mongoose.model('ProductFinish', productFinishSchema);
