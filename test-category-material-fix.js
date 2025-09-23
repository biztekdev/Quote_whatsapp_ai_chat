// Test the category-material filtering fix
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MessageHandler from './handlers/messageHandler.js';
import ChatGPTService from './services/chatgptService.js';

dotenv.config();

class MockWhatsAppService {
    async sendMessage(to, message, type = 'text') {
        console.log(`📤 Mock WhatsApp message to ${to}:`);
        console.log(`   ${message.substring(0, 200)}...\n`);
        return { messages: [{ id: 'mock-id' }] };
    }
}

async function testCategoryMaterialFix() {
    try {
        console.log('🧪 Testing category-material filtering fix...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Create mock services and handler
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        // Test the problematic message
        const testMessage = "Need 5k quantity, 4*5inches size, Pillow pouch (holographic material), number of designs 5, finish will be Matt + spot uv";
        
        console.log('📝 Testing message:', testMessage);
        console.log('\n🔍 Expected behavior:');
        console.log('   1. Category: "Mylor Bag" (from "Pillow pouch")');
        console.log('   2. Material: "holographic" should NOT find "PP Holographic Sticker" (Label category)');
        console.log('   3. Should only find materials from Mylor Bag category or store as requested\n');

        // Simulate entity extraction result (what ChatGPT would return)
        const mockEntities = {
            'category:category': [{
                body: 'mylor bag',
                value: 'mylor bag',
                confidence: 0.9
            }],
            'product:product': [{
                body: 'pillow pouch',
                value: 'pillow pouch',
                confidence: 0.9
            }],
            'material:material': [{
                body: 'holographic',
                value: 'holographic',
                confidence: 0.8
            }],
            'quantities:quantities': [{
                body: '5000',
                value: 5000,
                confidence: 0.9
            }],
            'skus:skus': [{
                body: '5',
                value: 5,
                confidence: 0.8
            }]
        };

        // Test the entity extraction and update function
        console.log('🔄 Processing entities...');
        const updatedData = await messageHandler.extractAndUpdateConversationData(
            mockEntities,
            {}, // empty current conversation data
            testMessage
        );

        console.log('\n📊 Results:');
        console.log('✅ Selected Category:', updatedData.selectedCategory?.name);
        console.log('✅ Selected Product:', updatedData.selectedProduct?.name);
        console.log('✅ Selected Material:', updatedData.selectedMaterial?.map(m => `${m.name} (ERP: ${m.erp_id})`));
        console.log('✅ Requested Material:', updatedData.requestedMaterial);
        console.log('✅ Quantities:', updatedData.quantity);
        console.log('✅ SKUs:', updatedData.skus);

        // Verify the fix worked
        if (updatedData.selectedMaterial && updatedData.selectedMaterial.length > 0) {
            const wrongMaterial = updatedData.selectedMaterial.find(m => m.name === 'PP Holographic Sticker');
            if (wrongMaterial) {
                console.log('\n❌ FAILURE: PP Holographic Sticker was still selected (wrong category)');
            } else {
                console.log('\n✅ SUCCESS: No wrong materials from other categories selected');
            }
        } else {
            console.log('\n✅ SUCCESS: Material stored as requested (no wrong category matches)');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testCategoryMaterialFix();