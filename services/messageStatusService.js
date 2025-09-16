import { MessageStatus } from '../models/messageStatusModel.js';
import mongoLogger from './mongoLogger.js';

class MessageStatusService {
    constructor() {
        this.memoryCache = new Map(); // For fast lookups
        this.maxCacheSize = 10000; // Maximum entries in memory cache
    }

    /**
     * Initialize message status tracking for a new message
     */
    async initializeMessageStatus(messageId, from, messageType, webhookData = null, conversationId = null) {
        try {
            // Check memory cache first
            if (this.memoryCache.has(messageId)) {
                console.log(`📋 Message ${messageId} already in memory cache`);
                return this.memoryCache.get(messageId);
            }

            // Check database
            let existingStatus = await MessageStatus.findByMessageId(messageId);

            if (existingStatus) {
                console.log(`📋 Message ${messageId} already exists in database`);
                // Update memory cache
                this.memoryCache.set(messageId, existingStatus);
                return existingStatus;
            }

            // Create new status entry
            const newStatus = new MessageStatus({
                messageId,
                from,
                messageType,
                webhookData,
                conversationId,
                processingStatus: 'pending',
                responseStatus: 'not_sent'
            });

            await newStatus.save();

            // Add to memory cache
            this.memoryCache.set(messageId, newStatus);

            // Clean up memory cache if it's getting too large
            this.cleanupMemoryCache();

            console.log(`✅ Initialized status tracking for message ${messageId}`);
            await mongoLogger.info('Message status initialized', {
                messageId,
                from,
                messageType,
                conversationId
            });

            return newStatus;

        } catch (error) {
            console.error(`❌ Error initializing message status for ${messageId}:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'initialize',
                messageId,
                from,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Mark message as being processed
     */
    async markAsProcessing(messageId) {
        try {
            const status = await this.getMessageStatus(messageId);
            if (!status) {
                throw new Error(`Message status not found for ${messageId}`);
            }

            await status.markAsProcessing();

            // Update memory cache
            this.memoryCache.set(messageId, status);

            console.log(`🔄 Marked message ${messageId} as processing`);
            await mongoLogger.info('Message marked as processing', { messageId });

            return status;

        } catch (error) {
            console.error(`❌ Error marking message ${messageId} as processing:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'mark-processing',
                messageId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Mark message as processed
     */
    async markAsProcessed(messageId) {
        try {
            const status = await this.getMessageStatus(messageId);
            if (!status) {
                throw new Error(`Message status not found for ${messageId}`);
            }

            await status.markAsProcessed();

            // Update memory cache
            this.memoryCache.set(messageId, status);

            console.log(`✅ Marked message ${messageId} as processed`);
            await mongoLogger.info('Message marked as processed', { messageId });

            return status;

        } catch (error) {
            console.error(`❌ Error marking message ${messageId} as processed:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'mark-processed',
                messageId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Mark message processing as failed
     */
    async markAsFailed(messageId, error) {
        try {
            const status = await this.getMessageStatus(messageId);
            if (!status) {
                throw new Error(`Message status not found for ${messageId}`);
            }

            await status.markAsFailed(error);

            // Update memory cache
            this.memoryCache.set(messageId, status);

            console.log(`❌ Marked message ${messageId} as failed: ${error}`);
            await mongoLogger.error('Message processing failed', {
                messageId,
                error: error
            });

            return status;

        } catch (err) {
            console.error(`❌ Error marking message ${messageId} as failed:`, err);
            await mongoLogger.logError(err, {
                source: 'message-status-service',
                operation: 'mark-failed',
                messageId,
                error: err.message
            });
            throw err;
        }
    }

    /**
     * Check if message can be processed (not already processed)
     */
    async canProcessMessage(messageId) {
        try {
            const status = await this.getMessageStatus(messageId);

            if (!status) {
                return true; // New message, can process
            }

            const canProcess = !status.hasBeenProcessed();
            console.log(`🔍 Message ${messageId} can be processed: ${canProcess} (status: ${status.processingStatus})`);

            return canProcess;

        } catch (error) {
            console.error(`❌ Error checking if message ${messageId} can be processed:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'can-process',
                messageId,
                error: error.message
            });
            return false; // Err on the side of caution
        }
    }

    /**
     * Mark response as being sent
     */
    async markResponseAsSending(messageId) {
        try {
            const status = await this.getMessageStatus(messageId);
            if (!status) {
                throw new Error(`Message status not found for ${messageId}`);
            }

            await status.markResponseAsSending();

            // Update memory cache
            this.memoryCache.set(messageId, status);

            console.log(`📤 Marked response for message ${messageId} as sending`);
            await mongoLogger.info('Response marked as sending', { messageId });

            return status;

        } catch (error) {
            console.error(`❌ Error marking response for ${messageId} as sending:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'mark-response-sending',
                messageId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Mark response as sent
     */
    async markResponseAsSent(messageId, responseMessageId = null, responseType = 'text') {
        try {
            const status = await this.getMessageStatus(messageId);
            if (!status) {
                throw new Error(`Message status not found for ${messageId}`);
            }

            await status.markResponseAsSent(responseMessageId, responseType);

            // Update memory cache
            this.memoryCache.set(messageId, status);

            console.log(`✅ Marked response for message ${messageId} as sent`);
            await mongoLogger.info('Response marked as sent', {
                messageId,
                responseMessageId,
                responseType
            });

            return status;

        } catch (error) {
            console.error(`❌ Error marking response for ${messageId} as sent:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'mark-response-sent',
                messageId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Mark response as failed
     */
    async markResponseAsFailed(messageId, error) {
        try {
            const status = await this.getMessageStatus(messageId);
            if (!status) {
                throw new Error(`Message status not found for ${messageId}`);
            }

            await status.markResponseAsFailed(error);

            // Update memory cache
            this.memoryCache.set(messageId, status);

            console.log(`❌ Marked response for message ${messageId} as failed: ${error}`);
            await mongoLogger.error('Response marked as failed', {
                messageId,
                error: error
            });

            return status;

        } catch (err) {
            console.error(`❌ Error marking response for ${messageId} as failed:`, err);
            await mongoLogger.logError(err, {
                source: 'message-status-service',
                operation: 'mark-response-failed',
                messageId,
                error: err.message
            });
            throw err;
        }
    }

    /**
     * Check if response can be sent (not already sent)
     */
    async canSendResponse(messageId) {
        try {
            const status = await this.getMessageStatus(messageId);

            if (!status) {
                return true; // New message, can send response
            }

            const canSend = status.canSendResponse();
            console.log(`🔍 Can send response for message ${messageId}: ${canSend} (status: ${status.responseStatus})`);

            return canSend;

        } catch (error) {
            console.error(`❌ Error checking if response can be sent for ${messageId}:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'can-send-response',
                messageId,
                error: error.message
            });
            return false; // Err on the side of caution
        }
    }

    /**
     * Check if response has already been sent
     */
    async hasResponseBeenSent(messageId) {
        try {
            const status = await this.getMessageStatus(messageId);

            if (!status) {
                return false; // New message, no response sent yet
            }

            const hasBeenSent = status.hasResponseBeenSent();
            console.log(`🔍 Response already sent for message ${messageId}: ${hasBeenSent}`);

            return hasBeenSent;

        } catch (error) {
            console.error(`❌ Error checking if response has been sent for ${messageId}:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'has-response-been-sent',
                messageId,
                error: error.message
            });
            return true; // Err on the side of caution - assume response was sent
        }
    }

    /**
     * Get message status (from cache or database)
     */
    async getMessageStatus(messageId) {
        try {
            // Check memory cache first
            if (this.memoryCache.has(messageId)) {
                return this.memoryCache.get(messageId);
            }

            // Check database
            const status = await MessageStatus.findByMessageId(messageId);

            if (status) {
                // Update memory cache
                this.memoryCache.set(messageId, status);
            }

            return status;

        } catch (error) {
            console.error(`❌ Error getting message status for ${messageId}:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'get-status',
                messageId,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get all unprocessed messages
     */
    async getUnprocessedMessages(limit = 100) {
        try {
            return await MessageStatus.findUnprocessedMessages(limit);
        } catch (error) {
            console.error('❌ Error getting unprocessed messages:', error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'get-unprocessed',
                error: error.message
            });
            return [];
        }
    }

    /**
     * Get all messages that haven't received responses
     */
    async getUnrespondedMessages(limit = 100) {
        try {
            return await MessageStatus.findUnrespondedMessages(limit);
        } catch (error) {
            console.error('❌ Error getting unresponded messages:', error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'get-unresponded',
                error: error.message
            });
            return [];
        }
    }

    /**
     * Clean up old entries from database
     */
    async cleanupOldEntries(daysOld = 7) {
        try {
            const result = await MessageStatus.cleanupOldEntries(daysOld);
            console.log(`🧹 Cleaned up ${result.deletedCount} old message status entries`);
            await mongoLogger.info('Message status cleanup completed', {
                deletedCount: result.deletedCount,
                daysOld
            });
            return result;
        } catch (error) {
            console.error('❌ Error cleaning up old message status entries:', error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'cleanup',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Clean up memory cache to prevent memory leaks
     */
    cleanupMemoryCache() {
        if (this.memoryCache.size > this.maxCacheSize) {
            // Remove oldest entries (simple FIFO)
            const entries = Array.from(this.memoryCache.entries());
            const toRemove = entries.slice(0, this.memoryCache.size - this.maxCacheSize + 100);

            toRemove.forEach(([key]) => {
                this.memoryCache.delete(key);
            });

            console.log(`🧹 Cleaned up ${toRemove.length} entries from memory cache`);
        }
    }

    /**
     * Get statistics about message processing
     */
    async getStatistics(hoursBack = 24) {
        try {
            const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

            const stats = await MessageStatus.aggregate([
                { $match: { receivedAt: { $gte: since } } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        processed: {
                            $sum: { $cond: [{ $eq: ['$processingStatus', 'processed'] }, 1, 0] }
                        },
                        responded: {
                            $sum: { $cond: [{ $eq: ['$responseStatus', 'sent'] }, 1, 0] }
                        },
                        failed: {
                            $sum: { $cond: [{ $eq: ['$processingStatus', 'failed'] }, 1, 0] }
                        },
                        responseFailed: {
                            $sum: { $cond: [{ $eq: ['$responseStatus', 'failed'] }, 1, 0] }
                        }
                    }
                }
            ]);

            const result = stats[0] || {
                total: 0,
                processed: 0,
                responded: 0,
                failed: 0,
                responseFailed: 0
            };

            result.memoryCacheSize = this.memoryCache.size;

            return result;

        } catch (error) {
            console.error('❌ Error getting message status statistics:', error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'get-statistics',
                error: error.message
            });
            return {
                total: 0,
                processed: 0,
                responded: 0,
                failed: 0,
                responseFailed: 0,
                memoryCacheSize: this.memoryCache.size
            };
        }
    }

    /**
     * Reset message status (for testing/debugging)
     */
    async resetMessageStatus(messageId) {
        try {
            const status = await this.getMessageStatus(messageId);
            if (!status) {
                throw new Error(`Message status not found for ${messageId}`);
            }

            status.processingStatus = 'pending';
            status.responseStatus = 'not_sent';
            status.processedAt = undefined;
            status.respondedAt = undefined;
            status.processingError = undefined;
            status.responseError = undefined;
            status.retryCount = 0;

            await status.save();

            // Update memory cache
            this.memoryCache.set(messageId, status);

            console.log(`🔄 Reset status for message ${messageId}`);
            await mongoLogger.info('Message status reset', { messageId });

            return status;

        } catch (error) {
            console.error(`❌ Error resetting message status for ${messageId}:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'reset',
                messageId,
                error: error.message
            });
            throw error;
        }
    }
}

export default new MessageStatusService();