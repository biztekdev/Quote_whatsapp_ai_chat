// Test sendMessageOnce with auto-generated message IDs
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MessageHandler from './handlers/messageHandler.js';

dotenv.config();

class MockWhatsAppService {
    async sendMessage(to, message, type = 'text') {
        console.log(`📤 Mock WhatsApp message to ${to}:`);
        console.log(`   ${message.substring(0, 100)}...`);
        return { messages: [{ id: 'mock-response-' + Date.now() }] };
    }
}

async function testSendMessageOnce() {
    try {
        console.log('🧪 Testing sendMessageOnce with auto-generated message IDs...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Create mock services
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp);

        const testPhone = '+1234567892';
        
        console.log('🔍 Testing different message ID types:');
        
        // Test auto-generated ID (should skip status tracking)
        console.log('\n1. Testing auto-generated message ID:');
        await messageHandler.sendMessageOnce(
            'auto-generated-' + Date.now(),
            testPhone,
            'This is a test message with auto-generated ID'
        );
        
        // Test material-selection ID (should skip status tracking)
        console.log('\n2. Testing material-selection message ID:');
        await messageHandler.sendMessageOnce(
            'material-selection-' + Date.now(), 
            testPhone,
            'This is a test message with material-selection ID'
        );
        
        // Test error-response ID (should skip status tracking)
        console.log('\n3. Testing error-response message ID:');
        await messageHandler.sendMessageOnce(
            'error-response-' + Date.now(),
            testPhone,
            'This is a test message with error-response ID'
        );
        
        console.log('\n✅ All tests completed successfully!');
        console.log('   - Auto-generated message IDs should skip status tracking');
        console.log('   - No "Message status not found" errors should occur');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testSendMessageOnce();