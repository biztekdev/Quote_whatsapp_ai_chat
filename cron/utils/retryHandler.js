import { createJobLogger } from './jobLogger.js';
import mongoLogger from '../../services/mongoLogger.js';

/**
 * Retry configuration for cron jobs
 */
export const RETRY_CONFIG = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000, // 1 second
    MAX_DELAY: 30000, // 30 seconds
    BACKOFF_MULTIPLIER: 2
};

/**
 * Calculate delay for retry attempts with exponential backoff
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attempt, config = RETRY_CONFIG) {
    const delay = Math.min(
        config.INITIAL_DELAY * Math.pow(config.BACKOFF_MULTIPLIER, attempt),
        config.MAX_DELAY
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
}

/**
 * Execute a function with retry logic
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @param {string} jobName - Name of the job for logging
 * @returns {Promise} Promise that resolves with function result
 */
export async function executeWithRetry(fn, options = {}, jobName = 'unknown') {
    const config = { ...RETRY_CONFIG, ...options };
    const logger = createJobLogger(jobName);
    let lastError;

    for (let attempt = 0; attempt < config.MAX_ATTEMPTS; attempt++) {
        try {
            if (attempt > 0) {
                const delay = calculateRetryDelay(attempt - 1, config);
                await logger.progress(`Retrying in ${delay}ms (attempt ${attempt + 1}/${config.MAX_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const result = await fn();
            await logger.complete({ attempts: attempt + 1 });
            return result;
        } catch (error) {
            lastError = error;
            await logger.warn(`Attempt ${attempt + 1} failed: ${error.message}`, {
                attempt: attempt + 1,
                maxAttempts: config.MAX_ATTEMPTS,
                error: error.message
            });

            // Don't retry on certain types of errors
            if (isNonRetryableError(error)) {
                await logger.error(error, { 
                    reason: 'Non-retryable error',
                    attempt: attempt + 1
                });
                throw error;
            }
        }
    }

    await logger.error(lastError, { 
        reason: 'Max retry attempts exceeded',
        attempts: config.MAX_ATTEMPTS
    });
    throw lastError;
}

/**
 * Check if an error should not be retried
 * @param {Error} error - Error to check
 * @returns {boolean} True if error should not be retried
 */
function isNonRetryableError(error) {
    // Add specific error types that should not be retried
    const nonRetryableErrors = [
        'ValidationError',
        'CastError',
        'SyntaxError',
        'TypeError'
    ];

    return nonRetryableErrors.some(errorType => 
        error.name === errorType || error.message.includes(errorType)
    );
}

/**
 * Create a retry wrapper for a cron job function
 * @param {Function} jobFunction - The job function to wrap
 * @param {Object} retryOptions - Retry configuration
 * @param {string} jobName - Name of the job
 * @returns {Function} Wrapped function with retry logic
 */
export function withRetry(jobFunction, retryOptions = {}, jobName = 'unknown') {
    return async (...args) => {
        return executeWithRetry(
            () => jobFunction(...args),
            retryOptions,
            jobName
        );
    };
}
