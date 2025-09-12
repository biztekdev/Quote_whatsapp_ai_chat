import mongoLogger from '../../services/mongoLogger.js';

/**
 * Enhanced logging utility for cron jobs
 */
export class JobLogger {
    constructor(jobName) {
        this.jobName = jobName;
        this.startTime = null;
    }

    /**
     * Start job execution logging
     */
    async start() {
        this.startTime = Date.now();
        await mongoLogger.info(`🔄 Starting cron job: ${this.jobName}`, {
            jobName: this.jobName,
            startTime: new Date().toISOString(),
            timestamp: this.startTime
        });
    }

    /**
     * Log job completion
     * @param {Object} result - Job execution result
     */
    async complete(result = {}) {
        const duration = this.startTime ? Date.now() - this.startTime : 0;
        await mongoLogger.info(`✅ Cron job completed: ${this.jobName}`, {
            jobName: this.jobName,
            duration: `${duration}ms`,
            result,
            endTime: new Date().toISOString()
        });
    }

    /**
     * Log job error
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    async error(error, context = {}) {
        const duration = this.startTime ? Date.now() - this.startTime : 0;
        await mongoLogger.error(`❌ Cron job failed: ${this.jobName}`, {
            jobName: this.jobName,
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`,
            context,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log job progress
     * @param {string} message - Progress message
     * @param {Object} data - Additional data
     */
    async progress(message, data = {}) {
        await mongoLogger.info(`📊 ${this.jobName}: ${message}`, {
            jobName: this.jobName,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log job warning
     * @param {string} message - Warning message
     * @param {Object} data - Additional data
     */
    async warn(message, data = {}) {
        await mongoLogger.warn(`⚠️ ${this.jobName}: ${message}`, {
            jobName: this.jobName,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Create a job logger instance
 * @param {string} jobName - Name of the job
 * @returns {JobLogger} Job logger instance
 */
export function createJobLogger(jobName) {
    return new JobLogger(jobName);
}
