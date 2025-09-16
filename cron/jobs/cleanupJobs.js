import { LegacyConversationState } from '../../models/conversationModels.js';
import mongoLogger from '../../services/mongoLogger.js';
import messageStatusService from '../../services/messageStatusService.js';

/**
 * Update legacy conversation states that are older than 10 minutes to set isActive: false
 * This job runs every 3 minutes to ensure timely updates
 */
export async function cleanupLegacyConversations() {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        // Find and update conversation states older than 10 minutes to set isActive: false
        const result = await LegacyConversationState.updateMany({
            isActive: true, // Only update active conversations
            createdAt: { $lt: tenMinutesAgo }
        }, {
            $set: { 
                isActive: false,
                updatedAt: new Date()
            }
        });

        if (result.modifiedCount > 0) {
            await mongoLogger.info(`🔄 Updated ${result.modifiedCount} legacy conversation states to inactive (older than 10 minutes)`);
        } else {
            await mongoLogger.debug('🔍 No legacy conversation states found for update');
        }

        return {
            success: true,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        await mongoLogger.error('❌ Error updating legacy conversation states:', error);
        throw error;
    }
}

/**
 * Update legacy conversation states with custom time threshold to set isActive: false
 * @param {number} minutesOld - Number of minutes old to consider for update
 */
export async function cleanupLegacyConversationsCustom(minutesOld = 10) {
    try {
        const cutoffTime = new Date(Date.now() - minutesOld * 60 * 1000);
        await mongoLogger.info(`🔄 cutoffTime ${cutoffTime} minutes`);

        const result = await LegacyConversationState.updateMany({
            isActive: true, // Only update active conversations
            createdAt: { $lt: cutoffTime }
        }, {
            $set: { 
                isActive: false,
                updatedAt: new Date()
            }
        });

        await mongoLogger.info(`🔄 Updated ${result.modifiedCount} legacy conversation states to inactive (older than ${minutesOld} minutes)`);
        
        return {
            success: true,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount,
            minutesOld,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        await mongoLogger.error('❌ Error updating legacy conversation states with custom threshold:', error);
        throw error;
    }
}

/**
 * Get statistics about legacy conversation states
 */
export async function getLegacyConversationStats() {
    try {
        const totalCount = await LegacyConversationState.countDocuments();
        const activeCount = await LegacyConversationState.countDocuments({ isActive: true });
        const inactiveCount = await LegacyConversationState.countDocuments({ isActive: false });
        
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const oldInactiveCount = await LegacyConversationState.countDocuments({
            isActive: false,
            createdAt: { $lt: tenMinutesAgo }
        });

        return {
            total: totalCount,
            active: activeCount,
            inactive: inactiveCount,
            oldInactive: oldInactiveCount,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        await mongoLogger.error('❌ Error getting legacy conversation stats:', error);
        throw error;
    }
}

/**
 * Clean up old message status entries
 * This job runs daily to remove message status entries older than 7 days
 */
export async function cleanupMessageStatus(daysOld = 7) {
    try {
        const result = await messageStatusService.cleanupOldEntries(daysOld);

        if (result.deletedCount > 0) {
            await mongoLogger.info(`🧹 Cleaned up ${result.deletedCount} message status entries older than ${daysOld} days`);
        } else {
            await mongoLogger.debug('🔍 No old message status entries found for cleanup');
        }

        return {
            success: true,
            deletedCount: result.deletedCount,
            daysOld,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        await mongoLogger.error('❌ Error cleaning up message status entries:', error);
        throw error;
    }
}

/**
 * Get message status statistics
 */
export async function getMessageStatusStats() {
    try {
        const stats = await messageStatusService.getStatistics(24); // Last 24 hours

        return {
            ...stats,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        await mongoLogger.error('❌ Error getting message status stats:', error);
        throw error;
    }
}
