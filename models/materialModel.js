import mongoose from 'mongoose';

// Material Schema
const materialSchema = new mongoose.Schema({
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
    pricePerUnit: {
        type: Number,
        required: true,
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
