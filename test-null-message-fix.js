// Test null message handling
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
        console.log(`${message.substring(0, 100)}...`);
        return { messages: [{ id: 'mock-id-' + Date.now() }] };
    }
}

async function testNullMessageHandling() {
    try {
        console.log('🧪 Testing null message handling in quote generation...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const testPhone = '+1234567892';
        
        // Clean up any existing conversation for this test
        await ConversationService.resetConversation(testPhone);
        
        // Create conversation state that would trigger the error
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
                selectedMaterial: [{ name: "PET + CD holographic PET + PE", erp_id: 65 }],
                selectedFinish: [{ name: "Spot UV" }, { name: "Hot Foil" }],
                dimensions: [
                    { name: "W", value: 4 },
                    { name: "H", value: 5 },
                    { name: "G", value: 2 }
                ],
                quantity: [20000],
                skus: 4,
                quoteAcknowledged: false // Will trigger the acknowledgment flow
            }
        };

        // Set up the conversation state
        await ConversationService.updateConversationState(testPhone, mockConversationState);
        
        // Create mock services
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        console.log('🔍 Testing quote generation with null message (similar to material selection trigger)...');
        
        // This simulates what happens when handleMaterialSelection calls processConversationFlow with null
        const mockMessage = null; // This used to cause the error
        
        try {
            await messageHandler.processConversationFlow(
                mockMessage, 
                'test trigger', 
                testPhone, 
                mockConversationState, 
                false
            );
            
            console.log('✅ SUCCESS: No error thrown with null message!');
            console.log('   The system handled null message gracefully');
            
        } catch (error) {
            if (error.message.includes("Cannot read properties of null")) {
                console.log('❌ FAILURE: Still getting null reference error');
                console.log(`   Error: ${error.message}`);
            } else {
                console.log('🟡 Different error occurred (might be unrelated):');
                console.log(`   Error: ${error.message}`);
            }
        }

        // Clean up
        await ConversationService.resetConversation(testPhone);

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testNullMessageHandling();