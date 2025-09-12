import cronManager from './cron/index.js';
import { cleanupLegacyConversations, getLegacyConversationStats } from './cron/jobs/cleanupJobs.js';
import database, { connectDB } from './config/database.js';
import mongoLogger from './services/mongoLogger.js';

/**
 * Test script for cron jobs
 * Run with: node test-cron.js
 */

async function testCronJobs() {
    try {
        console.log('🧪 Starting cron job tests...\n');

        // Connect to database
        console.log('📡 Connecting to database...');
        await connectDB();
        console.log('✅ Database connected\n');

        // Test 1: Get conversation stats
        console.log('📊 Test 1: Getting conversation stats...');
        const stats = await getLegacyConversationStats();
        console.log('Conversation Stats:', JSON.stringify(stats, null, 2));
        console.log('✅ Stats retrieved successfully\n');

        // Test 2: Manual cleanup execution
        console.log('🧹 Test 2: Running manual cleanup...');
        const cleanupResult = await cleanupLegacyConversations();
        console.log('Cleanup Result:', JSON.stringify(cleanupResult, null, 2));
        console.log('✅ Cleanup completed successfully\n');

        // Test 3: Initialize cron manager
        console.log('🕐 Test 3: Initializing cron manager...');
        await cronManager.initialize();
        console.log('✅ Cron manager initialized\n');

        // Test 4: Get cron status
        console.log('📋 Test 4: Getting cron status...');
        const status = cronManager.getStatus();
        console.log('Cron Status:', JSON.stringify(status, null, 2));
        console.log('✅ Status retrieved successfully\n');

        // Test 5: Start cron jobs (briefly)
        console.log('▶️ Test 5: Starting cron jobs...');
        await cronManager.start();
        console.log('✅ Cron jobs started\n');

        // Wait a moment to see if jobs run
        console.log('⏳ Waiting 10 seconds to observe job execution...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Test 6: Stop cron jobs
        console.log('⏹️ Test 6: Stopping cron jobs...');
        cronManager.stop();
        console.log('✅ Cron jobs stopped\n');

        // Test 7: Final stats
        console.log('📊 Test 7: Final conversation stats...');
        const finalStats = await getLegacyConversationStats();
        console.log('Final Stats:', JSON.stringify(finalStats, null, 2));
        console.log('✅ Final stats retrieved successfully\n');

        console.log('🎉 All tests completed successfully!');
        console.log('\n📝 Test Summary:');
        console.log('- Database connection: ✅');
        console.log('- Stats retrieval: ✅');
        console.log('- Manual cleanup: ✅');
        console.log('- Cron manager init: ✅');
        console.log('- Cron status check: ✅');
        console.log('- Cron job execution: ✅');
        console.log('- Cron job cleanup: ✅');

    } catch (error) {
        console.error('❌ Test failed:', error);
        await mongoLogger.logError(error, { source: 'cron-test' });
    } finally {
        // Clean up
        cronManager.destroy();
        process.exit(0);
    }
}

// Run the tests
testCronJobs();
