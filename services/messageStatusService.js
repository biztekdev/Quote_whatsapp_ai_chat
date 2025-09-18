import { MessageStatus } from '../models/messageStatusModel.js';
import mongoLogger from './mongoLogger.js';

class MessageStatusService {
    constructor() {
        // No caching - direct database operations only
    }

    /**
     * Initialize message status tracking for a new message
     */
    async initializeMessageStatus(messageId, from, messageType, webhookData = null, conversationId = null) {
        try {
            // Check database directly
            let existingStatus = await MessageStatus.findByMessageId(messageId);

            if (existingStatus) {
                console.log(`📋 Message ${messageId} already exists in database`);
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
     * Atomically check if message can be processed and initialize if it can
     * This prevents race conditions in webhook processing
     */
    async atomicCheckAndInitialize(messageId, from, messageType, webhookData = null, conversationId = null) {
        try {
            // Use findOneAndUpdate with upsert to atomically check and initialize
            const result = await MessageStatus.findOneAndUpdate(
                { messageId: messageId },
                {
                    $setOnInsert: {
                        messageId,
                        from,
                        messageType,
                        webhookData,
                        conversationId,
                        processingStatus: 'pending',
                        responseStatus: 'not_sent',
                        receivedAt: new Date()
                    }
                },
                { 
                    upsert: true, 
                    new: true,
                    runValidators: true
                }
            );

            // Check if this was a new document (upserted) or existing
            const isNew = result.isNew || !result.createdAt || result.createdAt === result.updatedAt;
            
            if (isNew) {
                console.log(`✅ Atomically initialized status tracking for message ${messageId}`);
                await mongoLogger.info('Message status atomically initialized', {
                    messageId,
                    from,
                    messageType,
                    conversationId
                });
                return { canProcess: true, status: result };
            } else {
                // Document already existed, check if it can be processed
                const canProcess = !result.hasBeenProcessed();
                console.log(`🔍 Message ${messageId} already exists, can process: ${canProcess} (status: ${result.processingStatus})`);
                return { canProcess, status: result };
            }

        } catch (error) {
            console.error(`❌ Error in atomic check and initialize for ${messageId}:`, error);
            await mongoLogger.logError(error, {
                source: 'message-status-service',
                operation: 'atomic-check-initialize',
                messageId,
                from,
                error: error.message
            });
            return { canProcess: false, status: null };
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
     * Get message status from database
     */
    async getMessageStatus(messageId) {
        try {
            // Check database directly
            const status = await MessageStatus.findByMessageId(messageId);
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