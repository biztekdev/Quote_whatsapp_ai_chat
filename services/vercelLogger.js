// In-memory logger for Vercel serverless environment
class VercelLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // Maximum number of logs to keep in memory
    }

    /**
     * Format timestamp for log entries
     * @returns {string} - Formatted timestamp
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace('T', ' ').replace('Z', '');
    }

    /**
     * Add log entry to memory
     * @param {string} level - Log level (info, error, warn, debug)
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata (optional)
     */
    addLog(level, message, meta = {}) {
        const timestamp = this.getTimestamp();
        const metaString = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
        const logEntry = {
            id: Date.now() + Math.random(), // Unique ID
            timestamp,
            level: level.toUpperCase(),
            message: message + metaString,
            raw: `${timestamp} : [${level.toUpperCase()}] ${message}${metaString}`
        };

        // Add to beginning of array (newest first)
        this.logs.unshift(logEntry);

        // Keep only the most recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Also log to console for Vercel logs
        console.log(`[${level.toUpperCase()}] ${message}`, meta);
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} meta - Additional metadata (optional)
     */
    info(message, meta = {}) {
        this.addLog('info', message, meta);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} meta - Additional metadata (optional)
     */
    error(message, meta = {}) {
        this.addLog('error', message, meta);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata (optional)
     */
    warn(message, meta = {}) {
        this.addLog('warn', message, meta);
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata (optional)
     */
    debug(message, meta = {}) {
        this.addLog('debug', message, meta);
    }

    /**
     * Get all logs
     * @returns {Array} - Array of log entries
     */
    getAllLogs() {
        return this.logs;
    }

    /**
     * Get logs with pagination
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Number of logs per page
     * @returns {Object} - Paginated log results
     */
    getLogsPaginated(page = 1, limit = 50) {
        const totalLogs = this.logs.length;
        const totalPages = Math.ceil(totalLogs / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const logs = this.logs.slice(startIndex, endIndex);
        
        return {
            logs,
            pagination: {
                currentPage: page,
                totalPages,
                totalLogs,
                limit,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Filter logs by level
     * @param {string} level - Log level to filter by
     * @returns {Array} - Filtered log entries
     */
    filterLogsByLevel(level) {
        return this.logs.filter(log => log.level.toLowerCase() === level.toLowerCase());
    }

    /**
     * Search logs by message content
     * @param {string} searchTerm - Term to search for
     * @returns {Array} - Matching log entries
     */
    searchLogs(searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(lowerSearchTerm)
        );
    }

    /**
     * Clear all logs
     * @returns {boolean} - Success status
     */
    clearLogs() {
        this.logs = [];
        return true;
    }

    /**
     * Get log statistics
     * @returns {Object} - Log statistics
     */
    getLogStats() {
        const levelCounts = {};
        this.logs.forEach(log => {
            levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
        });

        return {
            totalLogs: this.logs.length,
            maxLogs: this.maxLogs,
            levelCounts,
            oldestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
            newestLog: this.logs.length > 0 ? this.logs[0].timestamp : null,
            memoryUsage: JSON.stringify(this.logs).length
        };
    }

    /**
     * Get raw log content as string
     * @returns {string} - Raw log content
     */
    getRawLogs() {
        return this.logs.map(log => log.raw).join('\n');
    }

    /**
     * Export logs as JSON
     * @returns {string} - JSON string of logs
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}

// Create singleton instance
const vercelLogger = new VercelLogger();

export default vercelLogger;
