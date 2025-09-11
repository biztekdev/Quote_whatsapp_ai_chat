import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
    level: {
        type: String,
        required: true,
        enum: ['info', 'error', 'warn', 'debug'],
        index: true
    },
    message: {
        type: String,
        required: true,
        index: true
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    source: {
        type: String,
        default: 'application',
        index: true
    },
    userId: {
        type: String,
        index: true,
        sparse: true
    },
    sessionId: {
        type: String,
        index: true,
        sparse: true
    },
    requestId: {
        type: String,
        index: true,
        sparse: true
    },
    // For performance optimization
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
        expires: 2592000 // 30 days TTL
    }
}, {
    timestamps: true,
    collection: 'logs'
});

// Indexes for better query performance
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ message: 'text' });
logSchema.index({ timestamp: -1, level: 1 });
logSchema.index({ source: 1, timestamp: -1 });

// Static methods for querying logs
logSchema.statics.getLogsPaginated = async function(page = 1, limit = 50, filters = {}) {
    const skip = (page - 1) * limit;
    const query = this.find(filters)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const [logs, total] = await Promise.all([
        query.exec(),
        this.countDocuments(filters)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

logSchema.statics.getLogsByLevel = async function(level, page = 1, limit = 50) {
    return this.getLogsPaginated(page, limit, { level });
};

logSchema.statics.searchLogs = async function(searchTerm, page = 1, limit = 50) {
    const query = {
        $or: [
            { message: { $regex: searchTerm, $options: 'i' } },
            { 'meta.error': { $regex: searchTerm, $options: 'i' } }
        ]
    };
    return this.getLogsPaginated(page, limit, query);
};

logSchema.statics.getLogStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$level',
                count: { $sum: 1 }
            }
        }
    ]);

    const total = await this.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await this.countDocuments({
        timestamp: { $gte: today }
    });

    return {
        total,
        todayCount,
        byLevel: stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {}),
        lastUpdated: new Date()
    };
};

logSchema.statics.getRecentLogs = async function(limit = 10) {
    return this.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
};

logSchema.statics.clearOldLogs = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await this.deleteMany({
        timestamp: { $lt: cutoffDate }
    });
    
    return result.deletedCount;
};

const Log = mongoose.model('Log', logSchema);

export default Log;
