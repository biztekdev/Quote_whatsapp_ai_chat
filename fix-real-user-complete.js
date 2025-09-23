// Fix the real user's conversation by fetching complete product data
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ConversationService from './services/conversationService.js';
import { Product } from './models/productModel.js';

dotenv.config();

async function fixRealUserConversationWithProductLookup() {
    try {
        console.log('🛠️ Fixing real user conversation with complete product lookup...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const realUserPhone = '923260533337';
        
        // Check current state
        const currentState = await ConversationService.getConversationState(realUserPhone);
        console.log('📊 Current user state:');
        console.log(`   - Phone: ${realUserPhone}`);
        console.log(`   - Current step: ${currentState.currentStep}`);
        console.log(`   - Product ID: ${currentState.conversationData?.selectedProduct?.id}`);
        console.log(`   - Product Name: ${currentState.conversationData?.selectedProduct?.name}`);
        console.log(`   - Dimensions: ${currentState.conversationData?.dimensions?.length || 0} provided`);
        console.log(`   - quoteAcknowledged: ${currentState.conversationData?.quoteAcknowledged}`);
        
        if (currentState.conversationData?.dimensions) {
            console.log('   - Dimension details:');
            currentState.conversationData.dimensions.forEach(dim => {
                console.log(`     * ${dim.name}: ${dim.value}`);
            });
        }
        
        // Fetch complete product data from database
        const productId = currentState.conversationData?.selectedProduct?.id;
        if (productId) {
            console.log(`\n🔍 Fetching complete product data for ID: ${productId}`);
            const product = await Product.findById(productId);
            
            if (product) {
                console.log(`📦 Product details:`);
                console.log(`   - Name: ${product.name}`);
                console.log(`   - Required dimensions: ${product.dimensionFields?.length || 0}`);
                
                if (product.dimensionFields) {
                    product.dimensionFields.forEach(field => {
                        console.log(`     * ${field.name} (${field.unit}) - Required: ${field.isRequired}`);
                    });
                    
                    const providedDimensions = currentState.conversationData?.dimensions || [];
                    const requiredDimensions = product.dimensionFields.filter(field => field.isRequired);
                    const missingDimensions = requiredDimensions.filter(reqDim => 
                        !providedDimensions.some(provDim => provDim.name === reqDim.name)
                    );
                    
                    if (missingDimensions.length > 0) {
                        console.log(`\n❌ MISSING DIMENSIONS DETECTED:`);
                        missingDimensions.forEach(dim => {
                            console.log(`   * ${dim.name} (${dim.unit})`);
                        });
                        
                        console.log(`\n🛠️ Fixing conversation state...`);
                        
                        // Update the selectedProduct to include dimensionFields for future validation
                        const updatedProduct = {
                            ...currentState.conversationData.selectedProduct,
                            dimensionFields: product.dimensionFields
                        };
                        
                        // Reset the conversation to dimension_input and clear quoteAcknowledged
                        await ConversationService.updateConversationState(realUserPhone, {
                            currentStep: 'dimension_input',
                            'conversationData.quoteAcknowledged': false,
                            'conversationData.selectedProduct': updatedProduct
                        });
                        
                        console.log('✅ FIXED! The user conversation has been corrected:');
                        console.log('   - Reset step to: dimension_input');
                        console.log('   - Cleared quoteAcknowledged flag');
                        console.log('   - Updated product with dimensionFields');
                        console.log('   - Next message will ask for missing dimension(s)');
                        
                        // Verify the fix
                        const verifyState = await ConversationService.getConversationState(realUserPhone);
                        console.log(`\n🔍 Verification:`);
                        console.log(`   - Current step: ${verifyState.currentStep}`);
                        console.log(`   - quoteAcknowledged: ${verifyState.conversationData?.quoteAcknowledged}`);
                        console.log(`   - Product has dimensionFields: ${verifyState.conversationData?.selectedProduct?.dimensionFields ? 'Yes' : 'No'}`);
                        
                    } else {
                        console.log('\n✅ All required dimensions are already provided!');
                    }
                } else {
                    console.log('\n⚠️ Product has no dimension requirements defined.');
                }
            } else {
                console.log('\n❌ Product not found in database!');
            }
        } else {
            console.log('\n❌ No product ID found in conversation data!');
        }

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

fixRealUserConversationWithProductLookup();