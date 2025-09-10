import express from 'express';
import smartLogger from '../services/smartLogger.js';

const router = express.Router();

// Get all logs with pagination, filtering, and search
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, level, search, raw } = req.query;
        
        // If raw=true, return the raw log content
        if (raw === 'true') {
            const logContent = await smartLogger.getRawLogs();
            
            if (!logContent) {
                return res.status(404).send('No logs available');
            }
            
            // Set content type to plain text for browser display
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            
            return res.send(logContent);
        }
        
        let logs;
        if (level) {
            logs = smartLogger.filterLogsByLevel(level);
        } else if (search) {
            logs = smartLogger.searchLogs(search);
        } else {
            const result = smartLogger.getLogsPaginated(parseInt(page), parseInt(limit));
            return res.json({
                success: true,
                data: result.logs,
                pagination: result.pagination,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: logs,
            total: logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error reading logs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to read logs',
            details: error.message
        });
    }
});

// Get log statistics
router.get('/stats', (req, res) => {
    try {
        const stats = smartLogger.getLogStats();
        const envInfo = smartLogger.getEnvironmentInfo();
        res.json({
            success: true,
            data: stats,
            environment: envInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting log stats', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get log statistics',
            details: error.message
        });
    }
});

// Filter logs by level
router.get('/level/:level', (req, res) => {
    try {
        const { level } = req.params;
        const logs = smartLogger.filterLogsByLevel(level);
        
        res.json({
            success: true,
            data: logs,
            total: logs.length,
            level: level,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error filtering logs by level', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to filter logs by level',
            details: error.message
        });
    }
});

// Search logs by message content
router.get('/search', (req, res) => {
    try {
        const { q: searchTerm } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                error: 'Search term is required. Use ?q=searchterm'
            });
        }
        
        const logs = smartLogger.searchLogs(searchTerm);
        
        res.json({
            success: true,
            data: logs,
            total: logs.length,
            searchTerm: searchTerm,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error searching logs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to search logs',
            details: error.message
        });
    }
});

// Test logger endpoint
router.post('/test', (req, res) => {
    try {
        const { message, level = 'info', meta = {} } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        smartLogger[level](message, meta);
        
        res.json({
            success: true,
            message: `Log entry created with level: ${level}`,
            data: { message, level, meta },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error creating test log', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to create log entry',
            details: error.message
        });
    }
});

// Clear all logs
router.delete('/', (req, res) => {
    try {
        const success = smartLogger.clearLogs();
        if (success) {
            smartLogger.info('Logs cleared via API');
            res.json({
                success: true,
                message: 'All logs cleared successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to clear logs'
            });
        }
    } catch (error) {
        smartLogger.error('Error clearing logs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to clear logs',
            details: error.message
        });
    }
});

// Get recent logs (last 10)
router.get('/recent', (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const result = smartLogger.readLogsPaginated(1, parseInt(limit));
        
        res.json({
            success: true,
            data: result.logs,
            total: result.logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting recent logs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get recent logs',
            details: error.message
        });
    }
});

// View raw log file in browser
router.get('/raw', async (req, res) => {
    try {
        const logContent = await smartLogger.getRawLogs();
        const envInfo = smartLogger.getEnvironmentInfo();
        
        if (!logContent) {
            return res.status(404).send(`
                <html>
                    <head><title>No Logs Available</title></head>
                    <body>
                        <h1>No Logs Available</h1>
                        <p>No logs have been created yet. Create some logs first!</p>
                        <p><a href="/api/logs/test">Create Test Log</a></p>
                        <p><strong>Environment:</strong> ${envInfo.loggerType} (${envInfo.isVercel ? 'Vercel' : 'Local'})</p>
                    </body>
                </html>
            `);
        }
        
        // Set content type to HTML for better browser display
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Create HTML page with the log content
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Log File Viewer</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        margin: 20px; 
                        background-color: #1e1e1e; 
                        color: #d4d4d4;
                    }
                    .header { 
                        background-color: #2d2d30; 
                        padding: 15px; 
                        margin-bottom: 20px; 
                        border-radius: 5px;
                        border: 1px solid #3e3e42;
                    }
                    .log-content { 
                        background-color: #0d1117; 
                        padding: 15px; 
                        border-radius: 5px; 
                        border: 1px solid #3e3e42;
                        white-space: pre-wrap; 
                        word-wrap: break-word;
                        max-height: 80vh;
                        overflow-y: auto;
                    }
                    .controls {
                        margin-bottom: 15px;
                    }
                    .btn {
                        background-color: #238636;
                        color: white;
                        padding: 8px 16px;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        margin-right: 10px;
                        text-decoration: none;
                        display: inline-block;
                    }
                    .btn:hover {
                        background-color: #2ea043;
                    }
                    .btn-danger {
                        background-color: #da3633;
                    }
                    .btn-danger:hover {
                        background-color: #f85149;
                    }
                    .stats {
                        color: #8b949e;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 Log File Viewer</h1>
                    <div class="controls">
                        <a href="/api/logs/export" class="btn">💾 Download</a>
                        <button onclick="clearLogs()" class="btn btn-danger">🗑️ Clear Logs</button>
                    </div>
                    <div class="stats">
                        Environment: ${envInfo.loggerType} (${envInfo.isVercel ? 'Vercel' : 'Local'}) | 
                        Size: ${(logContent.length / 1024).toFixed(2)} KB | 
                        Lines: ${logContent.split('\n').length} | 
                        Order: Newest First ⬇️ | 
                        Last Updated: ${new Date().toLocaleString()}
                    </div>
                </div>
                <div class="log-content">${logContent || 'No logs available yet.'}</div>
                <script>
                    // Auto-refresh every 5 seconds
                    setTimeout(() => {
                        window.location.reload();
                    }, 5000);
                    
                    // Clear logs function
                    async function clearLogs() {
                        if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
                            try {
                                const response = await fetch('/api/logs', {
                                    method: 'DELETE',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                });
                                
                                const result = await response.json();
                                
                                if (result.success) {
                                    alert('Logs cleared successfully!');
                                    window.location.reload();
                                } else {
                                    alert('Error clearing logs: ' + result.error);
                                }
                            } catch (error) {
                                alert('Error clearing logs: ' + error.message);
                            }
                        }
                    }
                </script>
            </body>
            </html>
        `;
        
        res.send(htmlContent);
    } catch (error) {
        smartLogger.error('Error viewing raw logs', { error: error.message });
        res.status(500).send(`
            <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Error Reading Log File</h1>
                    <p>${error.message}</p>
                </body>
            </html>
        `);
    }
});

// Export logs as text file
router.get('/export', (req, res) => {
    try {
        const logs = smartLogger.readLogs();
        const logText = logs.map(log => 
            `${log.timestamp} : [${log.level}] ${log.message}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=logs.txt');
        res.send(logText);
    } catch (error) {
        smartLogger.error('Error exporting logs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to export logs',
            details: error.message
        });
    }
});

export default router;
