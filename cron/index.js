import cron from 'node-cron';
import { cleanupLegacyConversations } from './jobs/cleanupJobs.js';
import mongoLogger from '../services/mongoLogger.js';

class CronManager {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
    }

    /**
     * Initialize all cron jobs
     */
    async initialize() {
        try {
            await mongoLogger.info('🕐 Initializing cron jobs...');
            
            // Register only the inactive conversation state cleanup job
            this.registerJob('cleanup-legacy-conversations', '*/3 * * * *', cleanupLegacyConversations);
            
            this.isRunning = true;
            await mongoLogger.info('✅ Cron job initialized successfully - only inactive conversation state cleanup');
        } catch (error) {
            await mongoLogger.error('❌ Failed to initialize cron jobs:', error);
            throw error;
        }
    }

    /**
     * Register a cron job
     * @param {string} name - Job name
     * @param {string} schedule - Cron schedule expression
     * @param {Function} jobFunction - Function to execute
     * @param {Object} options - Additional options
     */
    registerJob(name, schedule, jobFunction, options = {}) {
        try {
            const job = cron.schedule(schedule, async () => {
                const startTime = Date.now();
                await mongoLogger.info(`🔄 Starting cron job: ${name}`);
                
                try {
                    await jobFunction();
                    const duration = Date.now() - startTime;
                    await mongoLogger.info(`✅ Cron job completed: ${name} (${duration}ms)`);
                } catch (error) {
                    await mongoLogger.error(`❌ Cron job failed: ${name}`, error);
                }
            }, {
                scheduled: false,
                timezone: 'UTC',
                ...options
            });

            this.jobs.set(name, job);
            mongoLogger.info(`📝 Registered cron job: ${name} (${schedule})`);
        } catch (error) {
            mongoLogger.error(`❌ Failed to register cron job: ${name}`, error);
            throw error;
        }
    }

    /**
     * Start all registered cron jobs
     */
    async start() {
        if (!this.isRunning) {
            await this.initialize();
        }

        this.jobs.forEach((job, name) => {
            job.start();
            mongoLogger.info(`▶️ Started cron job: ${name}`);
        });
    }

    /**
     * Stop all cron jobs
     */
    stop() {
        this.jobs.forEach((job, name) => {
            job.stop();
            mongoLogger.info(`⏹️ Stopped cron job: ${name}`);
        });
    }

    /**
     * Stop a specific cron job
     * @param {string} name - Job name
     */
    stopJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.stop();
            mongoLogger.info(`⏹️ Stopped cron job: ${name}`);
        } else {
            mongoLogger.warn(`⚠️ Cron job not found: ${name}`);
        }
    }

    /**
     * Start a specific cron job
     * @param {string} name - Job name
     */
    startJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.start();
            mongoLogger.info(`▶️ Started cron job: ${name}`);
        } else {
            mongoLogger.warn(`⚠️ Cron job not found: ${name}`);
        }
    }

    /**
     * Get status of all cron jobs
     */
    getStatus() {
        const status = {};
        this.jobs.forEach((job, name) => {
            status[name] = {
                running: job.running,
                scheduled: job.scheduled
            };
        });
        return status;
    }

    /**
     * Destroy all cron jobs
     */
    destroy() {
        this.jobs.forEach((job, name) => {
            job.destroy();
            mongoLogger.info(`🗑️ Destroyed cron job: ${name}`);
        });
        this.jobs.clear();
        this.isRunning = false;
    }
}

export default new CronManager();
