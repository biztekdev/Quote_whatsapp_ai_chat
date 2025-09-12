/**
 * Cron job schedules configuration
 * All schedules are in UTC timezone
 */

export const CRON_SCHEDULES = {
    // Cleanup jobs - Only inactive conversation state cleanup is active
    CLEANUP_LEGACY_CONVERSATIONS: '*/3 * * * *', // Every 3 minutes
    
    // Disabled jobs (commented out)
    // CLEANUP_OLD_QUOTES: '0 2 * * *', // Daily at 2 AM UTC
    // CLEANUP_LOGS: '0 3 * * *', // Daily at 3 AM UTC
    
    // Health checks
    // HEALTH_CHECK: '*/10 * * * *', // Every 10 minutes
    
    // Data synchronization
    // SYNC_ERP_DATA: '0 */6 * * *', // Every 6 hours
    
    // Backup jobs
    // BACKUP_DATABASE: '0 1 * * 0', // Weekly on Sunday at 1 AM UTC
    
    // Analytics
    // GENERATE_ANALYTICS: '0 4 * * *', // Daily at 4 AM UTC
};

/**
 * Job priorities (higher number = higher priority)
 */
export const JOB_PRIORITIES = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    BACKGROUND: 1
};

/**
 * Job categories for organization
 */
export const JOB_CATEGORIES = {
    CLEANUP: 'cleanup',
    HEALTH: 'health',
    SYNC: 'sync',
    BACKUP: 'backup',
    ANALYTICS: 'analytics',
    MAINTENANCE: 'maintenance'
};
