import mongoose from 'mongoose';

// Product Categories Schema
const productCategorySchema = new mongoose.Schema({
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
    collection: 'product_categories'
});

// Products Schema
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductCategory',
        required: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    basePrice: {
        type: Number,
        required: true,
        min: 0
    },
    dimensionFields: [{
        name: {
            type: String,
            required: true
        },
        unit: {
            type: String,
            default: 'inches'
        },
        isRequired: {
            type: Boolean,
            default: true
        },
        minValue: {
            type: Number,
            default: 0
        },
        maxValue: Number
    }],
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
    collection: 'products'
});

// Indexes for products
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ name: 1 });

export const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);
export const Product = mongoose.model('Product', productSchema);
