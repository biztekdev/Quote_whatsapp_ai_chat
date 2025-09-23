// Test fix for existing conversation with incomplete dimensions
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

async function testExistingConversationFix() {
    try {
        console.log('🧪 Testing fix for existing conversation with incomplete dimensions...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const testPhone = '+1234567891';
        
        // Clean up any existing conversation for this test
        await ConversationService.resetConversation(testPhone);
        
        // Create conversation state that mimics the real user issue:
        // - quoteAcknowledged: true (already sent confirmation)
        // - Missing G dimension 
        const mockConversationState = {
            currentStep: 'quote_generation',
            conversationData: {
                wantsQuote: true,
                requestedCategory: "mylar bag",
                selectedCategory: {
                    id: "68c3615ffa22c9d78a93ec50",
                    erp_id: 1,
                    name: "Mylor Bag",
                    description: ""
                },
                selectedProduct: {
                    id: "68c361bafa22c9d78a93ef41",
                    erp_id: 172,
                    name: "2 Side Gusset Pouch (Pillow Pouch)",
                    description: "",
                    basePrice: 0,
                    dimensionFields: [
                        { name: "W", unit: "inches", isRequired: true, minValue: 0 },
                        { name: "H", unit: "inches", isRequired: true, minValue: 0 },
                        { name: "G", unit: "inches", isRequired: true, minValue: 0 }
                    ]
                },
                dimensions: [
                    { name: "W", value: 4 },
                    { name: "H", value: 5 }
                    // Missing G dimension!
                ],
                selectedMaterial: [
                    { _id: "65", name: "PET + CD holographic PET + PE", erp_id: 65 }
                ],
                selectedFinish: [
                    { _id: "6", name: "Matte Finish" },
                    { _id: "9", name: "Spot UV" }
                ],
                quantity: [5000],
                skus: 5,
                pricingData: { qty: [], unit_cost: [] },
                quoteData: {},
                quoteAcknowledged: true // This was the problem!
            }
        };

        // Set up the conversation state
        await ConversationService.updateConversationState(testPhone, mockConversationState);
        
        // Create mock services
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        // Create mock message - user tries to proceed
        const mockMessage = {
            id: 'test-msg-' + Date.now(),
            from: testPhone,
            text: { body: 'yes' }
        };

        console.log('🔍 Simulating user response "yes" to quote with incomplete dimensions...');
        console.log('   Current state: quoteAcknowledged: true');
        console.log('   Dimensions provided: W: 4, H: 5');
        console.log('   Dimensions missing: G');
        console.log('   Expected: Should detect incomplete data and ask for G dimension\n');

        // Process the message
        await messageHandler.processConversationFlow(
            mockMessage, 
            'yes', 
            testPhone, 
            mockConversationState, 
            false
        );

        // Check what message was sent
        const lastMessage = mockWhatsApp.getLastMessage();
        if (lastMessage) {
            const message = lastMessage.message;
            
            // Check if it detected the missing dimension
            if (message.includes('Missing required dimensions: G')) {
                console.log('✅ SUCCESS: System detected missing G dimension!');
                console.log('   Even with quoteAcknowledged: true, validation caught the issue.');
            } else if (message.includes('need more information')) {
                console.log('✅ SUCCESS: System detected incomplete data!');
            } else if (message.includes('pricing') || message.includes('quote')) {
                console.log('❌ FAILURE: System proceeded with pricing despite missing dimension!');
                console.log(`   Message: "${message.substring(0, 200)}..."`);
            } else {
                console.log('🟡 PARTIAL: System sent a different message:');
                console.log(`   First 200 chars: "${message.substring(0, 200)}..."`);
            }
        }

        // Check the updated conversation state
        const updatedState = await ConversationService.getConversationState(testPhone);
        console.log(`\n📊 Updated conversation state:`);
        console.log(`   - Current step: ${updatedState.currentStep}`);
        console.log(`   - quoteAcknowledged: ${updatedState.conversationData?.quoteAcknowledged}`);
        console.log(`   - Dimensions count: ${updatedState.conversationData?.dimensions?.length || 0}`);
        
        if (updatedState.currentStep === 'dimension_input') {
            console.log('✅ System correctly reset to dimension_input step!');
        } else {
            console.log(`🔍 System is in: ${updatedState.currentStep} step`);
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

testExistingConversationFix();