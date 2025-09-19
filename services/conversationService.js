import { LegacyConversationState, MylarBagProduct, LegacyQuote } from '../models/conversationModels.js';
import { ProductCategory, Product } from '../models/productModel.js';
import crypto from 'crypto';

class ConversationService {
    constructor() {
        // Initialize default products (non-blocking)
        // this.initializeDefaultProducts().catch(error => {
        //     console.error('Failed to initialize default products:', error);
        // });
    }

    /**
     * Get or create conversation state for a user
     */
    async getConversationState(phone) {
        try {
            // Add timeout to prevent hanging
            let state = await Promise.race([
                LegacyConversationState.findOne({ 
                    phone, 
                    isActive: true 
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database timeout')), 5000)
                )
            ]);

            
            if (!state) {
                state = new LegacyConversationState({
                    phone,
                    currentStep: 'start',
                    conversationData: {},
                    isActive: true
                });
                await state.save();
            }

            return state;
        } catch (error) {
            console.error('Error getting conversation state:', error);
            // If database timeout, return a default state instead of throwing
            if (error.message === 'Database timeout') {
                console.log('Database timeout, returning default conversation state');
                return {
                    phone,
                    currentStep: 'start',
                    conversationData: {},
                    isActive: true
                };
            }
            throw error;
        }
    }

    /**
     * Update conversation state
     */
    async updateConversationState(phone, updates) {
        try {
            console.log(`🔄 Updating conversation state for ${phone}:`, JSON.stringify(updates, null, 2));
            
            const state = await LegacyConversationState.findOneAndUpdate(
                { phone, isActive: true },
                { 
                    ...updates, 
                    lastMessageAt: new Date() 
                },
                { new: true, upsert: true }
            );

            console.log(`✅ Conversation state updated successfully for ${phone}:`, {
                currentStep: state.currentStep,
                selectedCategory: state.conversationData?.selectedCategory,
                hasCategory: !!state.conversationData?.selectedCategory?.id,
                fullConversationData: Object.keys(state.conversationData || {})
            });
            
            // Verify the update was persisted by querying again
            const verifyState = await LegacyConversationState.findOne({ phone, isActive: true });
            console.log(`🔍 Verification query result for ${phone}:`, {
                currentStep: verifyState.currentStep,
                selectedCategory: verifyState.conversationData?.selectedCategory,
                hasCategory: !!verifyState.conversationData?.selectedCategory?.id
            });
            
            return state;
        } catch (error) {
            console.error('❌ Error updating conversation state:', error);
            throw error;
        }
    }

    /**
     * Reset conversation for a user
     */
    async resetConversation(phone) {
        console.log(`🔄 Resetting conversation for ${phone}`);
        try {
            await LegacyConversationState.findOneAndUpdate(
                { phone, isActive: true },
                { 
                    isActive: false,
                    completedAt: new Date()
                }
            );

            // Create new conversation state
            const newState = new LegacyConversationState({
                phone,
                currentStep: 'start',
                conversationData: {},
                isActive: true
            });

            await newState.save();
            console.log(`🔄 Conversation reset for ${phone}`);
            return newState;
        } catch (error) {
            console.error('Error resetting conversation:', error);
            throw error;
        }
    }

    /**
     * Get all active product categories
     */
    async getProductCategories() {
        try {
            return await ProductCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            console.error('Error getting product categories:', error);
            throw error;
        }
    }

    /**
     * Get products by category ID
     */
    async getProductsByCategory(categoryId) {
        try {
            return await Product.find({ 
                categoryId: categoryId,
                isActive: true 
            }).sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            console.error('Error getting products by category:', error);
            throw error;
        }
    }

    /**
     * Get all mylar bag products
     */
    async getMylarBagProducts() {
        try {
            return await MylarBagProduct.find({ isActive: true });
        } catch (error) {
            console.error('Error getting products:', error);
            throw error;
        }
    }

    /**
     * Get product by ID
     */
    async getProductById(productId) {
        try {
            return await Product.findOne({ _id: productId, isActive: true });
        } catch (error) {
            console.error('Error getting product by ID:', error);
            throw error;
        }
    }

    /**
     * Generate quote
     */
    async generateQuote(phone, conversationData) {
        try {
            const quoteId = this.generateQuoteId();
            
            // Get product details
            const product = await this.getProductById(conversationData.selectedProduct.id);
            if (!product) {
                throw new Error('Product not found');
            }

            // Find selected material and finish
            const selectedMaterial = product.availableMaterials.find(
                m => m.name === conversationData.selectedMaterial
            );
            const selectedFinish = product.availableFinishes.find(
                f => f.name === conversationData.selectedFinish
            );

            // Calculate pricing
            const basePrice = product.basePrice;
            const materialCost = selectedMaterial ? selectedMaterial.pricePerUnit * conversationData.quantity : 0;
            const finishCost = selectedFinish ? selectedFinish.pricePerUnit * conversationData.quantity : 0;
            const subtotal = basePrice + materialCost + finishCost;
            const tax = subtotal * 0.1; // 10% tax
            const totalPrice = subtotal + tax;

            // Create quote
            const quote = new LegacyQuote({
                quoteId,
                phone,
                product: {
                    id: product.id,
                    name: product.name
                },
                dimensions: conversationData.dimensions,
                material: {
                    name: selectedMaterial?.name,
                    price: selectedMaterial?.pricePerUnit
                },
                finish: {
                    name: selectedFinish?.name,
                    price: selectedFinish?.pricePerUnit
                },
                quantity: conversationData.quantity,
                pricing: {
                    basePrice,
                    materialCost,
                    finishCost,
                    subtotal,
                    tax,
                    totalPrice
                },
                status: 'pending'
            });

            await quote.save();
            console.log(`💰 Quote generated: ${quoteId} for ${phone}`);
            
            return quote;
        } catch (error) {
            console.error('Error generating quote:', error);
            throw error;
        }
    }

    /**
     * Get quotes for a user
     */
    async getUserQuotes(phone, limit = 10) {
        try {
            return await Quote.find({ phone })
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error getting user quotes:', error);
            throw error;
        }
    }

    /**
     * Generate unique quote ID
     */
    generateQuoteId() {
        const timestamp = Date.now();
        const hash = crypto.createHash('md5')
            .update(`quote-${timestamp}-${Math.random()}`)
            .digest('hex')
            .substring(0, 8);
        return `Q${timestamp.toString().slice(-6)}${hash.toUpperCase()}`;
    }

    /**
     * Format quote for display
     */
    formatQuoteMessage(quote) {
        const dimensionsText = quote.dimensions
            .map(d => `${d.name}: ${d.value}`)
            .join(', ');

        return `📋 *Quote Details*

🆔 Quote ID: ${quote.quoteId}
📦 Product: ${quote.product.name}
📏 Dimensions: ${dimensionsText}
🎨 Material: ${quote.material.name}
✨ Finish: ${quote.finish.name}
📊 Quantity: ${quote.quantity}

💰 *Pricing Breakdown*
Base Price: $${quote.pricing.basePrice.toFixed(2)}
Material Cost: $${quote.pricing.materialCost.toFixed(2)}
Finish Cost: $${quote.pricing.finishCost.toFixed(2)}
Subtotal: $${quote.pricing.subtotal.toFixed(2)}
Tax (10%): $${quote.pricing.tax.toFixed(2)}

🎯 *Total Price: $${quote.pricing.totalPrice.toFixed(2)}*

📅 Valid until: ${quote.validUntil.toLocaleDateString()}

Thank you for choosing our mylar bags! 🌟`;
    }


    /**
     * Clean up old inactive conversations
     */
    async cleanupOldConversations(daysOld = 7) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
            
            const result = await ConversationState.deleteMany({
                isActive: false,
                completedAt: { $lt: cutoffDate }
            });

            console.log(`🧹 Cleaned up ${result.deletedCount} old conversations`);
            return result.deletedCount;
        } catch (error) {
            console.error('Error cleaning up conversations:', error);
            throw error;
        }
    }
}

export default new ConversationService();
