// Test quote validation with missing dimensions
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MessageHandler from './handlers/messageHandler.js';
import ChatGPTService from './services/chatgptService.js';

dotenv.config();

class MockWhatsAppService {
    async sendMessage(to, message, type = 'text') {
        console.log(`📤 Mock WhatsApp message to ${to}:`);
        console.log(`   ${message.substring(0, 200)}...`);
        console.log(`   [Full message length: ${message.length} chars]\n`);
        return { messages: [{ id: 'mock-id' }] };
    }
}

async function testQuoteValidation() {
    try {
        console.log('🧪 Testing quote validation with missing dimensions...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Create mock services and handler
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        // Test case: Same data that's causing the issue
        console.log('🔍 Test Case: 2 Side Gusset Pouch with incomplete dimensions');
        console.log('   Product needs: W, H, G (3 dimensions)');
        console.log('   User provides: W: 4, H: 5 (missing G)');
        console.log('   Expected: Should NOT show quote confirmation\n');

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
            selectedMaterial: [{ name: "PET + CD holographic PET + PE", erp_id: 123 }],
            selectedFinish: [{ name: "Matte Finish" }, { name: "Spot UV" }],
            dimensions: [
                { name: "W", value: 4 },
                { name: "H", value: 5 }
                // Missing G dimension!
            ],
            quantity: [5000],
            skus: 5
        };

        // Test validateQuoteData function
        console.log('🔄 Testing validateQuoteData with incomplete dimensions...');
        const validationResult = messageHandler.validateQuoteData(mockConversationData);
        
        console.log(`📊 Validation Result:`);
        console.log(`   - Is Valid: ${validationResult.isValid}`);
        console.log(`   - Missing Fields: ${validationResult.missingFields.length}`);
        
        if (validationResult.missingFields.length > 0) {
            console.log(`   - Details:`);
            validationResult.missingFields.forEach(field => {
                console.log(`     * ${field}`);
            });
        }
        
        if (!validationResult.isValid) {
            console.log('✅ SUCCESS: validateQuoteData correctly identified missing dimensions!');
            console.log('   - System should NOT show quote confirmation');
            console.log('   - System should ask for missing G dimension instead');
        } else {
            console.log('❌ FAILURE: validateQuoteData incorrectly thinks all data is complete!');
            console.log('   - Would show quote confirmation with incomplete dimensions');
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

        const completeValidationResult = messageHandler.validateQuoteData(completeConversationData);
        console.log(`📊 Complete Validation Result:`);
        console.log(`   - Is Valid: ${completeValidationResult.isValid}`);
        console.log(`   - Missing Fields: ${completeValidationResult.missingFields.length}`);
        
        if (completeValidationResult.isValid) {
            console.log('✅ SUCCESS: validateQuoteData correctly identified complete data!');
            console.log('   - System should now show quote confirmation');
        } else {
            console.log('🟡 PARTIAL: Still finding issues with complete data:');
            completeValidationResult.missingFields.forEach(field => {
                console.log(`     * ${field}`);
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testQuoteValidation();