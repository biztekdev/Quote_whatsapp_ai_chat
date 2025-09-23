// Test the error handling fix for the ReferenceError: errorMessage is not defined
import MessageHandler from './handlers/messageHandler.js';

// Mock services
const mockWhatsappService = {
    sendMessage: async (to, message, type) => {
        console.log(`📤 Mock send message to ${to}: ${message.substring(0, 50)}...`);
        return { messages: [{ id: 'mock-message-id' }] };
    }
};

const mockAiService = {
    processMessage: async (messageText) => {
        // Simulate an error in AI processing
        throw new Error('AI service timeout error');
    }
};

async function testErrorHandling() {
    console.log('🧪 Testing error handling fix...\n');
    
    try {
        const handler = new MessageHandler(mockWhatsappService, mockAiService);
        
        // Create a mock message that will trigger an error
        const mockMessage = {
            id: 'test-error-message-123',
            type: 'text',
            from: '1234567890',
            text: {
                body: 'Test message that will cause an error'
            }
        };
        
        console.log('📨 Simulating message processing with AI error...');
        
        // This should trigger the error handling in handleTextMessage
        await handler.handleTextMessage(mockMessage, '1234567890');
        
        console.log('✅ Error handling completed successfully - no ReferenceError occurred!');
        
    } catch (error) {
        if (error.message.includes('errorMessage is not defined')) {
            console.log('❌ ReferenceError still exists:', error.message);
        } else {
            console.log('✅ Different error (expected):', error.message);
        }
    }
}

// Run the test
testErrorHandling().then(() => {
    console.log('\n🎯 Test completed');
}).catch(error => {
    console.error('❌ Test failed:', error);
});