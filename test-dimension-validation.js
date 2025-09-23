// Test dimension validation fix
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MessageHandler from './handlers/messageHandler.js';
import ChatGPTService from './services/chatgptService.js';

dotenv.config();

class MockWhatsAppService {
    async sendMessage(to, message, type = 'text') {
        console.log(`📤 Mock WhatsApp message to ${to}:`);
        console.log(`   ${message.substring(0, 300)}...\n`);
        return { messages: [{ id: 'mock-id' }] };
    }
}

async function testDimensionValidation() {
    try {
        console.log('🧪 Testing dimension validation fix...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Create mock services and handler
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        // Test case: 2 Side Gusset Pouch (Pillow Pouch) needs 3 dimensions: W, H, G
        // But user provides only 2: "4x5"
        console.log('🔍 Test Case: 2 Side Gusset Pouch with incomplete dimensions');
        console.log('   Product needs: W, H, G (3 dimensions)');
        console.log('   User provides: 4x5 (2 dimensions)');
        console.log('   Expected: System should ask for missing G dimension\n');

        // Mock conversation data with incomplete dimensions
        const mockConversationData = {
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
            dimensions: [
                { name: "W", value: 4 },
                { name: "H", value: 5 }
                // Missing G dimension!
            ],
            selectedMaterial: [{ name: "PET + White PE", erp_id: 53 }],
            selectedFinish: [{ name: "Matte Finish" }],
            quantity: [5000]
        };

        // Test getNextStepAfterBypass function
        console.log('🔄 Testing getNextStepAfterBypass with incomplete dimensions...');
        const nextStep = messageHandler.getNextStepAfterBypass('dimension_input', mockConversationData);
        
        console.log(`📊 Result: Next step = "${nextStep}"`);
        
        if (nextStep === 'dimension_input') {
            console.log('✅ SUCCESS: System correctly identified missing dimensions!');
            console.log('   - Will stay in dimension_input step');
            console.log('   - Will ask user for missing G dimension');
        } else if (nextStep === 'quote_generation') {
            console.log('❌ FAILURE: System incorrectly thinks all data is complete!');
            console.log('   - Would skip asking for G dimension');
            console.log('   - Would generate quote with incomplete dimensions');
        } else {
            console.log(`🟡 PARTIAL: System moved to "${nextStep}" step`);
            console.log('   - Not quote_generation (good)');
            console.log('   - But not staying in dimension_input either');
        }

        // Test with complete dimensions
        console.log('\n🔍 Test Case: Complete dimensions');
        const completeConversationData = {
            ...mockConversationData,
            dimensions: [
                { name: "W", value: 4 },
                { name: "H", value: 5 },
                { name: "G", value: 2 } // Added missing G dimension
            ]
        };

        const nextStepComplete = messageHandler.getNextStepAfterBypass('dimension_input', completeConversationData);
        console.log(`📊 Result with complete dimensions: Next step = "${nextStepComplete}"`);
        
        if (nextStepComplete === 'quote_generation') {
            console.log('✅ SUCCESS: System correctly identified complete data!');
        } else {
            console.log(`🟡 System moved to "${nextStepComplete}" step (expected material_selection or quote_generation)`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testDimensionValidation();