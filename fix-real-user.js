// Fix the real user's conversation with incomplete dimensions
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ConversationService from './services/conversationService.js';

dotenv.config();

async function fixRealUserConversation() {
    try {
        console.log('🛠️ Fixing real user conversation with incomplete dimensions...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const realUserPhone = '923260533337';
        
        // Check current state
        const currentState = await ConversationService.getConversationState(realUserPhone);
        console.log('📊 Current user state:');
        console.log(`   - Phone: ${realUserPhone}`);
        console.log(`   - Current step: ${currentState.currentStep}`);
        console.log(`   - Product: ${currentState.conversationData?.selectedProduct?.name}`);
        console.log(`   - Dimensions: ${currentState.conversationData?.dimensions?.length || 0} provided`);
        console.log(`   - quoteAcknowledged: ${currentState.conversationData?.quoteAcknowledged}`);
        
        if (currentState.conversationData?.dimensions) {
            console.log('   - Dimension details:');
            currentState.conversationData.dimensions.forEach(dim => {
                console.log(`     * ${dim.name}: ${dim.value}`);
            });
        }
        
        // Check if product requires more dimensions
        const product = currentState.conversationData?.selectedProduct;
        if (product && product.dimensionFields) {
            console.log(`\n🔍 Product dimension requirements:`);
            console.log(`   - Product: ${product.name}`);
            console.log(`   - Required dimensions: ${product.dimensionFields.length}`);
            product.dimensionFields.forEach(field => {
                console.log(`     * ${field.name} (${field.unit}) - Required: ${field.isRequired}`);
            });
            
            const providedDimensions = currentState.conversationData?.dimensions || [];
            const missingDimensions = product.dimensionFields.filter(reqDim => 
                reqDim.isRequired && !providedDimensions.some(provDim => provDim.name === reqDim.name)
            );
            
            if (missingDimensions.length > 0) {
                console.log(`\n❌ MISSING DIMENSIONS DETECTED:`);
                missingDimensions.forEach(dim => {
                    console.log(`   * ${dim.name} (${dim.unit})`);
                });
                
                console.log(`\n🛠️ Fixing conversation state...`);
                
                // Reset the conversation to dimension_input and clear quoteAcknowledged
                await ConversationService.updateConversationState(realUserPhone, {
                    currentStep: 'dimension_input',
                    'conversationData.quoteAcknowledged': false
                });
                
                console.log('✅ Fixed! The user will now be prompted for missing dimensions.');
                console.log('   - Reset step to: dimension_input');
                console.log('   - Cleared quoteAcknowledged flag');
                console.log('   - Next message will ask for missing G dimension');
                
            } else {
                console.log('\n✅ All required dimensions are provided!');
            }
        }

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n📤 Disconnected from MongoDB');
    }
}

fixRealUserConversation();