// Test material filtering by category
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Material } from './models/materialModel.js';
import { ProductCategory } from './models/productModel.js';

dotenv.config();

async function testMaterialFiltering() {
    try {
        console.log('🧪 Testing material filtering by category...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all categories
        const categories = await ProductCategory.find({ isActive: true }).sort({ name: 1 });
        console.log('📂 Available categories:');
        categories.forEach(cat => {
            console.log(`   ${cat.name} (ID: ${cat._id})`);
        });

        if (categories.length === 0) {
            console.log('❌ No categories found!');
            return;
        }

        // Test filtering for each category
        for (const category of categories.slice(0, 3)) { // Test first 3 categories
            console.log(`\n🔍 Testing materials for category: ${category.name}`);
            
            // Get materials for this category
            const categoryMaterials = await Material.find({
                categoryId: category._id,
                isActive: true
            }).sort({ name: 1 });

            console.log(`   Found ${categoryMaterials.length} materials:`);
            categoryMaterials.forEach(material => {
                console.log(`   • ${material.name} (ERP ID: ${material.erp_id})`);
            });

            if (categoryMaterials.length === 0) {
                console.log('   ⚠️ No materials found for this category');
            }
        }

        // Test the sample material you provided
        console.log('\n🎯 Testing the PP Silver Sticker material:');
        const ppSilverSticker = await Material.findOne({ 
            name: 'PP Silver Sticker',
            erp_id: 48 
        });

        if (ppSilverSticker) {
            console.log(`✅ Found: ${ppSilverSticker.name}`);
            console.log(`   Category ID: ${ppSilverSticker.categoryId}`);
            console.log(`   ERP ID: ${ppSilverSticker.erp_id}`);
            
            // Find the category name
            const materialCategory = await ProductCategory.findById(ppSilverSticker.categoryId);
            console.log(`   Category Name: ${materialCategory?.name || 'Not found'}`);
        } else {
            console.log('❌ PP Silver Sticker not found');
        }

        // Test cross-category search (what was happening before)
        console.log('\n🚨 Testing cross-category search (old behavior):');
        const allMaterials = await Material.find({ isActive: true }).sort({ name: 1 });
        console.log(`   Total materials across all categories: ${allMaterials.length}`);
        
        const searchTerm = 'silver';
        const matchingMaterials = allMaterials.filter(m => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log(`   Materials matching "${searchTerm}" across all categories:`);
        matchingMaterials.forEach(material => {
            console.log(`   • ${material.name} (Category: ${material.categoryId})`);
        });

        console.log('\n✅ Material filtering test completed!');
        console.log('   - The system should now only show materials from the selected category');
        console.log('   - Cross-category material searches should be prevented');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

testMaterialFiltering();