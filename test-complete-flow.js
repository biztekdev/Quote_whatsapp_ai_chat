// Test complete flow with missing dimensions
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
        console.log(`${message}\n`);
        return { messages: [{ id: 'mock-id-' + Date.now() }] };
    }
    
    getLastMessage() {
        return this.sentMessages[this.sentMessages.length - 1];
    }
}

async function testCompleteFlow() {
    try {
        console.log('🧪 Testing complete WhatsApp flow with missing dimensions...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const testPhone = '+1234567890';
        
        // Clean up any existing conversation for this test
        await ConversationService.resetConversation(testPhone);
        
        // Create mock conversation state with incomplete dimensions
        const mockConversationState = {
            currentStep: 'quote_generation',
            conversationData: {
                selectedCategory: {
                    id: "68c3615ffa22c9d78a93ec50",
                    name: "Mylor Bag"
                },
                selectedProduct: {
                    id: "68c361bafa22c9d78a93ef41",
                    name: "2 Side Gusset Pouch (Pillow Pouch)",
                    dimensionFields: [
                        { name: "W", unit: "inches", isRequired: true },
                        { name: "H", unit: "inches", isRequired: true },
                        { name: "G", unit: "inches", isRequired: true }
                    ]
                },
                selectedMaterial: [{ name: "PET + CD holographic PET + PE", erp_id: 123 }],
                selectedFinish: [{ name: "Matte Finish" }, { name: "Spot UV" }],
                dimensions: [
                    { name: "W", value: 4 },
                    { name: "H", value: 5 }
                    // Missing G dimension!
                ],
                quantity: [5000],
                skus: 5
            }
        };

        // Set up the conversation state
        await ConversationService.updateConversationState(testPhone, mockConversationState);
        
        // Create mock services
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        // Create mock message
        const mockMessage = {
            id: 'test-msg-' + Date.now(),
            from: testPhone,
            text: { body: 'test trigger' }
        };

        console.log('🔍 Simulating quote generation attempt with incomplete dimensions...');
        console.log('   Current step: quote_generation');
        console.log('   Dimensions provided: W: 4, H: 5');
        console.log('   Dimensions missing: G');
        console.log('   Expected: Should ask for G dimension, NOT show quote confirmation\n');

        // Process the message
        await messageHandler.processConversationFlow(
            mockMessage, 
            'test trigger', 
            testPhone, 
            mockConversationState, 
            false
        );

        // Check what message was sent
        const lastMessage = mockWhatsApp.getLastMessage();
        if (lastMessage) {
            const message = lastMessage.message;
            
            // Check if it's asking for dimensions vs showing quote confirmation
            if (message.includes('Perfect! 🎯 Let me confirm your selections')) {
                console.log('❌ FAILURE: System showed quote confirmation with incomplete dimensions!');
                console.log('   This is the bug - it should ask for G dimension instead.');
            } else if (message.includes('dimensions') || message.includes('size') || message.includes('G')) {
                console.log('✅ SUCCESS: System correctly asked for missing dimensions!');
                console.log('   The system detected incomplete dimensions and asked for more info.');
            } else if (message.includes('need more information')) {
                console.log('✅ SUCCESS: System correctly identified missing data!');
                console.log('   The validation worked and prevented quote confirmation.');
            } else {
                console.log('🟡 PARTIAL: System sent a different message:');
                console.log(`   First 200 chars: "${message.substring(0, 200)}..."`);
            }
        }

        // Check the updated conversation state
        const updatedState = await ConversationService.getConversationState(testPhone);
        console.log(`\n📊 Updated conversation state:`);
        console.log(`   - Current step: ${updatedState.currentStep}`);
        console.log(`   - Dimensions count: ${updatedState.conversationData?.dimensions?.length || 0}`);
        
        if (updatedState.currentStep === 'dimension_input') {
            console.log('✅ System correctly reset to dimension_input step!');
        } else if (updatedState.currentStep === 'quote_generation') {
            console.log('🟡 System stayed in quote_generation step (might be waiting for user confirmation)');
        } else {
            console.log(`🔍 System moved to: ${updatedState.currentStep}`);
        }

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

testCompleteFlow();