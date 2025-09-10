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
        index: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true, // allows multiple null values
        validate: {
            validator: function(email) {
                if (!email) return true; // email is optional
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Please enter a valid email'
        }
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
