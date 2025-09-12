import { LegacyConversationState } from '../../models/conversationModels.js';
import mongoLogger from '../../services/mongoLogger.js';

/**
 * Clean up legacy conversation states that are inactive and older than 10 minutes
 * This job runs every minute to ensure timely cleanup
 */
export async function cleanupLegacyConversations() {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        // Find and delete inactive conversation states older than 10 minutes
        const result = await LegacyConversationState.deleteMany({
            isActive: false,
            createdAt: { $lt: tenMinutesAgo }
        });

        if (result.deletedCount > 0) {
            await mongoLogger.info(`🧹 Cleaned up ${result.deletedCount} legacy conversation states older than 10 minutes`);
        } else {
            await mongoLogger.debug('🔍 No legacy conversation states found for cleanup');
        }

        return {
            success: true,
            deletedCount: result.deletedCount,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        await mongoLogger.error('❌ Error cleaning up legacy conversation states:', error);
        throw error;
    }
}

/**
 * Clean up legacy conversation states with custom time threshold
 * @param {number} minutesOld - Number of minutes old to consider for cleanup
 */
export async function cleanupLegacyConversationsCustom(minutesOld = 10) {
    try {
        const cutoffTime = new Date(Date.now() - minutesOld * 60 * 1000);
        
        const result = await LegacyConversationState.deleteMany({
            isActive: false,
            createdAt: { $lt: cutoffTime }
        });

        await mongoLogger.info(`🧹 Cleaned up ${result.deletedCount} legacy conversation states older than ${minutesOld} minutes`);
        
        return {
            success: true,
            deletedCount: result.deletedCount,
            minutesOld,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        await mongoLogger.error('❌ Error cleaning up legacy conversation states with custom threshold:', error);
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
