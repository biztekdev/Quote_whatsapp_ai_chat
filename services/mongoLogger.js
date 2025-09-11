import Log from '../models/logModel.js';

class MongoLogger {
    constructor() {
        this.isConnected = false;
        this.checkConnection();
    }

    async checkConnection() {
        try {
            const mongoose = await import('mongoose');
            this.isConnected = mongoose.connection.readyState === 1;
        } catch (error) {
            this.isConnected = false;
        }
    }


    async log(level, message, meta = {}) {
        try {
            await this.checkConnection();
            
            if (!this.isConnected) {
                // Fallback to console if MongoDB is not connected
                console[level === 'warn' ? 'warn' : level](`[${level.toUpperCase()}] ${message}`, meta);
                return;
            }

            const logEntry = new Log({
                level,
                message,
                meta,
                timestamp: new Date(),
                source: meta.source || 'application',
                userId: meta.userId,
                sessionId: meta.sessionId,
                requestId: meta.requestId
            });

            await logEntry.save();
        } catch (error) {
            // Fallback to console if logging fails
            console.error('Failed to save log to MongoDB:', error.message);
            console[level === 'warn' ? 'warn' : level](`[${level.toUpperCase()}] ${message}`, meta);
        }
    }

    async info(message, meta = {}) {
        await this.log('info', message, meta);
    }

    async error(message, meta = {}) {
        await this.log('error', message, meta);
    }

    async warn(message, meta = {}) {
        await this.log('warn', message, meta);
    }

    async debug(message, meta = {}) {
        await this.log('debug', message, meta);
    }

    // Query methods
    async getLogsPaginated(page = 1, limit = 50, filters = {}) {
        try {
            await this.checkConnection();
            if (!this.isConnected) {
                return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
            }
            return await Log.getLogsPaginated(page, limit, filters);
        } catch (error) {
            console.error('Error getting paginated logs:', error.message);
            return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
        }
    }

    async getLogsByLevel(level, page = 1, limit = 50) {
        try {
            await this.checkConnection();
            if (!this.isConnected) {
                return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
            }
            return await Log.getLogsByLevel(level, page, limit);
        } catch (error) {
            console.error('Error getting logs by level:', error.message);
            return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
        }
    }

    async searchLogs(searchTerm, page = 1, limit = 50) {
        try {
            await this.checkConnection();
            if (!this.isConnected) {
                return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
            }
            return await Log.searchLogs(searchTerm, page, limit);
        } catch (error) {
            console.error('Error searching logs:', error.message);
            return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
        }
    }

    async getLogStats() {
        try {
            await this.checkConnection();
            if (!this.isConnected) {
                return { total: 0, todayCount: 0, byLevel: {}, lastUpdated: new Date() };
            }
            return await Log.getLogStats();
        } catch (error) {
            console.error('Error getting log stats:', error.message);
            return { total: 0, todayCount: 0, byLevel: {}, lastUpdated: new Date() };
        }
    }

    async getRecentLogs(limit = 10) {
        try {
            await this.checkConnection();
            if (!this.isConnected) {
                return [];
            }
            return await Log.getRecentLogs(limit);
        } catch (error) {
            console.error('Error getting recent logs:', error.message);
            return [];
        }
    }

    async clearOldLogs(daysOld = 30) {
        try {
            await this.checkConnection();
            if (!this.isConnected) {
                return 0;
            }
            return await Log.clearOldLogs(daysOld);
        } catch (error) {
            console.error('Error clearing old logs:', error.message);
            return 0;
        }
    }

    async clearAllLogs() {
        try {
            await this.checkConnection();
            if (!this.isConnected) {
                return false;
            }
            await Log.deleteMany({});
            return true;
        } catch (error) {
            console.error('Error clearing all logs:', error.message);
            return false;
        }
    }

    // Utility methods for common logging patterns
    async logRequest(req, res, next) {
        const startTime = Date.now();
        const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        req.requestId = requestId;
        
        await this.info('Request started', {
            method: req.method,
            url: req.url,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            requestId,
            source: 'http'
        });

        res.on('finish', async () => {
            const duration = Date.now() - startTime;
            await this.info('Request completed', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                requestId,
                source: 'http'
            });
        });

        next();
    }

    async logError(error, context = {}) {
        await this.error('Application error', {
            message: error.message,
            stack: error.stack,
            ...context,
            source: 'error'
        });
    }

    async logWebhook(webhookData, source = 'webhook') {
        await this.info('Webhook received', {
            data: webhookData,
            source
        });
    }

    async logMessage(messageData, userId = null) {
        await this.info('Message processed', {
            messageId: messageData.id,
            from: messageData.from,
            type: messageData.type,
            userId,
            source: 'whatsapp'
        });
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            timestamp: new Date()
        };
    }
}

// Create singleton instance
const mongoLogger = new MongoLogger();

export default mongoLogger;
