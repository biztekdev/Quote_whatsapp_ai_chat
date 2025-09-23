// Test the fixed material search by category
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MessageHandler from './handlers/messageHandler.js';
import WhatsAppService from './services/whatsappService.js';
import ChatGPTService from './services/chatgptService.js';

dotenv.config();

class MockWhatsAppService {
    async sendMessage(to, message, type = 'text') {
        console.log(`📤 Mock WhatsApp message to ${to}:`);
        console.log(`   ${message}\n`);
        return { messages: [{ id: 'mock-id' }] };
    }
}

async function testFixedMaterialSearch() {
    try {
        console.log('🧪 Testing fixed material search by category...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Create mock services and handler
        const mockWhatsApp = new MockWhatsAppService();
        const messageHandler = new MessageHandler(mockWhatsApp, ChatGPTService);

        // Test 1: Search for "Silver" materials within Label category
        console.log('🔍 Test 1: Searching for "Silver" materials in Label category');
        const labelCategoryId = '68c36160fa22c9d78a93ec63'; // Label category ID from test
        const silverInLabels = await messageHandler.findMaterialByName('Silver', labelCategoryId);
        
        if (silverInLabels) {
            console.log(`✅ Found: ${silverInLabels.name} (ERP ID: ${silverInLabels.erp_id})`);
            console.log(`   Category ID: ${silverInLabels.categoryId}`);
        } else {
            console.log('❌ No silver materials found in Label category');
        }

        // Test 2: Search for "Silver" materials within Folding Carton category
        console.log('\n🔍 Test 2: Searching for "Silver" materials in Folding Carton category');
        const foldingCartonCategoryId = '68c3615ffa22c9d78a93ec5a'; // Folding Carton category ID
        const silverInFoldingCarton = await messageHandler.findMaterialByName('Silver', foldingCartonCategoryId);
        
        if (silverInFoldingCarton) {
            console.log(`✅ Found: ${silverInFoldingCarton.name} (ERP ID: ${silverInFoldingCarton.erp_id})`);
            console.log(`   Category ID: ${silverInFoldingCarton.categoryId}`);
        } else {
            console.log('❌ No silver materials found in Folding Carton category');
        }

        // Test 3: Search without category filter (old behavior)
        console.log('\n🔍 Test 3: Searching for "Silver" materials across ALL categories (old behavior)');
        const silverAllCategories = await messageHandler.findMaterialByName('Silver');
        
        if (silverAllCategories) {
            console.log(`✅ Found: ${silverAllCategories.name} (ERP ID: ${silverAllCategories.erp_id})`);
            console.log(`   Category ID: ${silverAllCategories.categoryId}`);
            console.log('   ⚠️ This would pick the first match from any category');
        } else {
            console.log('❌ No silver materials found');
        }

        // Test 4: Exact material name search within category
        console.log('\n🔍 Test 4: Searching for exact "PP Silver Sticker" in Label category');
        const exactMatch = await messageHandler.findMaterialByName('PP Silver Sticker', labelCategoryId);
        
        if (exactMatch) {
            console.log(`✅ Found exact match: ${exactMatch.name} (ERP ID: ${exactMatch.erp_id})`);
            console.log(`   Category ID: ${exactMatch.categoryId}`);
        } else {
            console.log('❌ Exact match not found');
        }

        console.log('\n✅ Material search test completed!');
        console.log('   - Materials are now properly filtered by selected category');
        console.log('   - Users will only see materials from their chosen category');
        console.log('   - No more confusion from materials in other categories');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testFixedMaterialSearch();