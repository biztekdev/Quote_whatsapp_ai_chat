// Test complete material selection flow without null message errors
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MessageHandler from './handlers/messageHandler.js';
import ChatGPTService from './services/chatgptService.js';
import ConversationService from './services/conversationService.js';

dotenv.config();

class MockWhatsAppService {
    constructor() {
        this.sentMessages = [];
    }
    
    async sendMessage(to, message, type = 'text') {
        this.sentMessages.push({ to, message, type });
        console.log(`📤 WhatsApp Message to ${to}:`);
        console.log(`${message.substring(0, 150)}...`);
        return { messages: [{ id: 'mock-response-' + Date.now() }] };
    }
    
    getMessageCount() {
        return this.sentMessages.length;
    }
}

async function testMaterialSelectionFlow() {
    try {
        console.log('🧪 Testing material selection flow without null message errors...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const testPhone = '+1234567893';
        
        // Clean up any existing conversation for this test
        await ConversationService.resetConversation(testPhone);
        
        // Create conversation state ready for material selection
        const mockConversationState = {
            currentStep: 'material_selection',
            conversationData: {
                selectedCategory: {
                    id: "68c3615ffa22c9d78a93ec50",
                    name: "Mylor Bag"
                },
                selectedProduct: {
                    id: "68c361bafa22c9d78a93ef41",
                    name: "2 Side Gusset Pouch (Pillow Pouch)"
                },
                dimensions: [
                    { name: "W", value: 4 },
                    { name: "H", value: 5 },
                    { name: "G", value: 2 }
                ]
            }
        };

        // Set up the conversation state
        await ConversationService.updateConversationState(testPhone, mockConversationState);
        
        // Create mock services
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        // Create mock message for material selection
        const mockMessage = {
            id: 'test-material-msg-' + Date.now(),
            from: testPhone,
            text: { body: 'PET + White PE' }
        };

        console.log('🔍 Simulating material selection...');
        console.log('   User selects: PET + White PE');
        console.log('   Expected: Should move to next step without null message errors\n');

        // Process the material selection
        await messageHandler.handleMaterialSelection(
            mockMessage.text.body,
            testPhone,
            mockConversationState.conversationData
        );

        // Check that messages were sent without errors
        const messageCount = mockWhatsApp.getMessageCount();
        console.log(`📊 Results:`);
        console.log(`   - Messages sent: ${messageCount}`);
        console.log(`   - No "Message status not found" errors should appear above`);
        
        if (messageCount > 0) {
            console.log('✅ SUCCESS: Material selection completed and messages sent!');
        } else {
            console.log('🔍 INFO: No messages sent (might be internal processing)');
        }

        // Check the updated conversation state
        const updatedState = await ConversationService.getConversationState(testPhone);
        console.log(`   - Final step: ${updatedState.currentStep}`);
        console.log(`   - Material selected: ${updatedState.conversationData?.selectedMaterial?.length > 0 ? 'Yes' : 'No'}`);

        // Clean up
        await ConversationService.resetConversation(testPhone);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testMaterialSelectionFlow();