import fs from 'fs';
import path from 'path';

class CustomLogger {
    constructor() {
        this.logDir = 'temp';
        this.logFile = 'log.txt';
        this.logPath = path.join(this.logDir, this.logFile);
        this.initializeLogDirectory();
    }

    /**
     * Initialize log directory if it doesn't exist
     */
    initializeLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                console.log(`Created log directory: ${this.logDir}`);
            }
        } catch (error) {
            console.error('Error creating log directory:', error);
        }
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
     * Write log entry to file
     * @param {string} level - Log level (info, error, warn, debug)
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata (optional)
     */
    writeLog(level, message, meta = {}) {
        try {
            const timestamp = this.getTimestamp();
            const metaString = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
            const logEntry = `${timestamp} : [${level.toUpperCase()}] ${message}${metaString}\n`;
            
            fs.appendFileSync(this.logPath, logEntry, 'utf8');
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} meta - Additional metadata (optional)
     */
    info(message, meta = {}) {
        this.writeLog('info', message, meta);
        console.log(`[INFO] ${message}`, meta);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Object} meta - Additional metadata (optional)
     */
    error(message, meta = {}) {
        this.writeLog('error', message, meta);
        console.error(`[ERROR] ${message}`, meta);
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata (optional)
     */
    warn(message, meta = {}) {
        this.writeLog('warn', message, meta);
        console.warn(`[WARN] ${message}`, meta);
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata (optional)
     */
    debug(message, meta = {}) {
        this.writeLog('debug', message, meta);
        console.log(`[DEBUG] ${message}`, meta);
    }

    /**
     * Read all logs from file
     * @returns {Array} - Array of log entries
     */
    readLogs() {
        try {
            if (!fs.existsSync(this.logPath)) {
                return [];
            }

            const logContent = fs.readFileSync(this.logPath, 'utf8');
            const logLines = logContent.trim().split('\n').filter(line => line.trim());
            
            return logLines.map((line, index) => {
                const match = line.match(/^(.+?) : \[(.+?)\] (.+)$/);
                if (match) {
                    const [, timestamp, level, message] = match;
                    return {
                        id: index + 1,
                        timestamp,
                        level,
                        message: message.trim()
                    };
                }
                return {
                    id: index + 1,
                    timestamp: 'Unknown',
                    level: 'UNKNOWN',
                    message: line
                };
            });
        } catch (error) {
            console.error('Error reading log file:', error);
            return [];
        }
    }

    /**
     * Read logs with pagination
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Number of logs per page
     * @returns {Object} - Paginated log results
     */
    readLogsPaginated(page = 1, limit = 50) {
        try {
            const allLogs = this.readLogs();
            const totalLogs = allLogs.length;
            const totalPages = Math.ceil(totalLogs / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            
            const logs = allLogs.slice(startIndex, endIndex);
            
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
        } catch (error) {
            console.error('Error reading paginated logs:', error);
            return {
                logs: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalLogs: 0,
                    limit,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }
    }

    /**
     * Clear all logs
     * @returns {boolean} - Success status
     */
    clearLogs() {
        try {
            if (fs.existsSync(this.logPath)) {
                fs.writeFileSync(this.logPath, '', 'utf8');
                return true;
            }
            return true;
        } catch (error) {
            console.error('Error clearing logs:', error);
            return false;
        }
    }

    /**
     * Get log file statistics
     * @returns {Object} - Log file statistics
     */
    getLogStats() {
        try {
            if (!fs.existsSync(this.logPath)) {
                return {
                    fileExists: false,
                    fileSize: 0,
                    totalLines: 0,
                    lastModified: null
                };
            }

            const stats = fs.statSync(this.logPath);
            const allLogs = this.readLogs();
            
            return {
                fileExists: true,
                fileSize: stats.size,
                totalLines: allLogs.length,
                lastModified: stats.mtime.toISOString(),
                logPath: this.logPath
            };
        } catch (error) {
            console.error('Error getting log stats:', error);
            return {
                fileExists: false,
                fileSize: 0,
                totalLines: 0,
                lastModified: null,
                error: error.message
            };
        }
    }

    /**
     * Filter logs by level
     * @param {string} level - Log level to filter by
     * @returns {Array} - Filtered log entries
     */
    filterLogsByLevel(level) {
        try {
            const allLogs = this.readLogs();
            return allLogs.filter(log => log.level.toLowerCase() === level.toLowerCase());
        } catch (error) {
            console.error('Error filtering logs by level:', error);
            return [];
        }
    }

    /**
     * Search logs by message content
     * @param {string} searchTerm - Term to search for
     * @returns {Array} - Matching log entries
     */
    searchLogs(searchTerm) {
        try {
            const allLogs = this.readLogs();
            const lowerSearchTerm = searchTerm.toLowerCase();
            return allLogs.filter(log => 
                log.message.toLowerCase().includes(lowerSearchTerm)
            );
        } catch (error) {
            console.error('Error searching logs:', error);
            return [];
        }
    }
}

// Create singleton instance
const customLogger = new CustomLogger();

export default customLogger;
