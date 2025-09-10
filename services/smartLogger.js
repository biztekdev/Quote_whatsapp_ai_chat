import customLogger from './customLogger.js';
import vercelLogger from './vercelLogger.js';

class SmartLogger {
    constructor() {
        // Detect if we're running on Vercel
        this.isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
        this.logger = this.isVercel ? vercelLogger : customLogger;
        
        console.log(`SmartLogger initialized for ${this.isVercel ? 'Vercel' : 'Local'} environment`);
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} meta - Additional metadata (optional)
     */
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} meta - Additional metadata (optional)
     */
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata (optional)
     */
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata (optional)
     */
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    /**
     * Get all logs (works for both environments)
     * @returns {Array} - Array of log entries
     */
    getAllLogs() {
        if (this.isVercel) {
            return this.logger.getAllLogs();
        } else {
            return this.logger.readLogs();
        }
    }

    /**
     * Get logs with pagination
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Number of logs per page
     * @returns {Object} - Paginated log results
     */
    getLogsPaginated(page = 1, limit = 50) {
        if (this.isVercel) {
            return this.logger.getLogsPaginated(page, limit);
        } else {
            return this.logger.readLogsPaginated(page, limit);
        }
    }

    /**
     * Filter logs by level
     * @param {string} level - Log level to filter by
     * @returns {Array} - Filtered log entries
     */
    filterLogsByLevel(level) {
        if (this.isVercel) {
            return this.logger.filterLogsByLevel(level);
        } else {
            return this.logger.filterLogsByLevel(level);
        }
    }

    /**
     * Search logs by message content
     * @param {string} searchTerm - Term to search for
     * @returns {Array} - Matching log entries
     */
    searchLogs(searchTerm) {
        if (this.isVercel) {
            return this.logger.searchLogs(searchTerm);
        } else {
            return this.logger.searchLogs(searchTerm);
        }
    }

    /**
     * Clear all logs
     * @returns {boolean} - Success status
     */
    clearLogs() {
        if (this.isVercel) {
            return this.logger.clearLogs();
        } else {
            return this.logger.clearLogs();
        }
    }

    /**
     * Get log statistics
     * @returns {Object} - Log statistics
     */
    getLogStats() {
        if (this.isVercel) {
            return this.logger.getLogStats();
        } else {
            return this.logger.getLogStats();
        }
    }

    /**
     * Get raw log content as string
     * @returns {string} - Raw log content
     */
    async getRawLogs() {
        if (this.isVercel) {
            return this.logger.getRawLogs();
        } else {
            // For file-based logger, read from file
            const fs = await import('fs');
            const path = await import('path');
            const logPath = path.join('temp', 'log.txt');
            
            if (fs.existsSync(logPath)) {
                return fs.readFileSync(logPath, 'utf8');
            }
            return '';
        }
    }

    /**
     * Get environment info
     * @returns {Object} - Environment information
     */
    getEnvironmentInfo() {
        return {
            isVercel: this.isVercel,
            loggerType: this.isVercel ? 'in-memory' : 'file-based',
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL
        };
    }
}

// Create singleton instance
const smartLogger = new SmartLogger();

export default smartLogger;
