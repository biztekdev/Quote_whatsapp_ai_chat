// Check material category issue
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Material } from './models/materialModel.js';
import { ProductCategory } from './models/productModel.js';

dotenv.config();

async function checkMaterialCategoryIssue() {
    try {
        console.log('🔍 Checking PP Holographic Sticker category issue...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check PP Holographic Sticker
        const holographicMaterial = await Material.findOne({ name: 'PP Holographic Sticker' });
        if (holographicMaterial) {
            console.log('📋 PP Holographic Sticker details:');
            console.log(`   Name: ${holographicMaterial.name}`);
            console.log(`   ERP ID: ${holographicMaterial.erp_id}`);
            console.log(`   Category ID: ${holographicMaterial.categoryId}`);
            
            // Get the category name
            const holographicCategory = await ProductCategory.findById(holographicMaterial.categoryId);
            console.log(`   Category Name: ${holographicCategory?.name || 'Not found'}`);
        } else {
            console.log('❌ PP Holographic Sticker not found');
        }

        // Check Mylor Bag category and materials
        console.log('\n📦 Mylor Bag category details:');
        const mylorCategory = await ProductCategory.findOne({ name: 'Mylor Bag' });
        if (mylorCategory) {
            console.log(`   Category Name: ${mylorCategory.name}`);
            console.log(`   Category ID: ${mylorCategory._id}`);
            
            const mylorMaterials = await Material.find({ 
                categoryId: mylorCategory._id,
                isActive: true 
            }).sort({ name: 1 });
            
            console.log(`   Materials in Mylor Bag category (${mylorMaterials.length} total):`);
            mylorMaterials.forEach(m => {
                console.log(`   • ${m.name} (ERP ID: ${m.erp_id})`);
            });
        } else {
            console.log('❌ Mylor Bag category not found');
        }

        // Check if PP Holographic Sticker is wrongly in Mylor Bag
        console.log('\n🚨 Issue Analysis:');
        if (holographicMaterial && mylorCategory) {
            if (holographicMaterial.categoryId.toString() === mylorCategory._id.toString()) {
                console.log('❌ PROBLEM: PP Holographic Sticker IS in Mylor Bag category (incorrect)');
            } else {
                console.log('✅ CORRECT: PP Holographic Sticker is NOT in Mylor Bag category');
                console.log('   🤔 BUT the system is still showing it - this means the AI entity extraction');
                console.log('      is not properly filtering by category or there\'s a bug in the flow');
            }
        }

    } catch (error) {
        console.error('❌ Check failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

checkMaterialCategoryIssue();