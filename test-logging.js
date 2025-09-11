import mongoLogger from './services/mongoLogger.js';
import { connectDB } from './config/database.js';

async function testLogging() {
    try {
        console.log('Testing MongoDB logging system...');
        
        // Connect to database
        await connectDB();
        console.log('✅ Database connected');
        
        // Test different log levels
        await mongoLogger.info('Test info message', { test: true, timestamp: new Date() });
        await mongoLogger.warn('Test warning message', { test: true, level: 'warning' });
        await mongoLogger.error('Test error message', { test: true, error: 'test error' });
        await mongoLogger.debug('Test debug message', { test: true, debug: 'debug info' });
        
        console.log('✅ Log messages sent to MongoDB');
        
        // Test querying logs
        const stats = await mongoLogger.getLogStats();
        console.log('📊 Log stats:', stats);
        
        const recentLogs = await mongoLogger.getRecentLogs(5);
        console.log('📋 Recent logs:', recentLogs.length, 'entries');
        
        const paginatedLogs = await mongoLogger.getLogsPaginated(1, 10);
        console.log('📄 Paginated logs:', paginatedLogs.logs.length, 'entries');
        
        console.log('✅ All logging tests passed!');
        
    } catch (error) {
        console.error('❌ Logging test failed:', error.message);
    }
}

// Run the test
testLogging().then(() => {
    console.log('Test completed');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
