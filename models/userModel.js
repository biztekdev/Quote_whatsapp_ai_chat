import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
        validate: {
            validator: function(phone) {
                if (!phone) return false;
                // Skip validation for encrypted data (contains = and is longer)
                if (phone.includes('=') && phone.length > 20) return true;
                return /^[0-9+\-\s()]+$/.test(phone);
            },
            message: 'Please enter a valid phone number'
        }
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        required: false // Make email optional
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastInteraction: {
        type: Date,
        default: Date.now
    },
    totalQuotes: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model('User', userSchema);
