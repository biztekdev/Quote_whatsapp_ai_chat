import mongoose from 'mongoose';

// Material Schema
const materialSchema = new mongoose.Schema({
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
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductCategory',
        required: true,
        index: true
    },
    erp_category_id: {
        type: Number,
        required: true,
        index: true // ERP category reference
    },
    description: {
        type: String,
        trim: true
    },
    pricePerUnit: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    unit: {
        type: String,
        default: 'sq ft',
        enum: ['sq ft', 'sq inch', 'linear ft', 'piece', 'kg', 'gram']
    },
    thickness: {
        type: String, // e.g., "3.5 mil", "5 mil"
        trim: true
    },
    specifications: [{
        property: String,
        value: String
    }],
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
    collection: 'materials'
});

// Indexes for materials
materialSchema.index({ categoryId: 1, isActive: 1 });
materialSchema.index({ name: 1 });

export const Material = mongoose.model('Material', materialSchema);
