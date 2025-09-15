import { LegacyConversationState, MylarBagProduct, LegacyQuote } from '../models/conversationModels.js';
import { ProductCategory, Product } from '../models/productModel.js';
import crypto from 'crypto';

class ConversationService {
    constructor() {
        // Initialize default products (non-blocking)
        this.initializeDefaultProducts().catch(error => {
            console.error('Failed to initialize default products:', error);
        });
    }

    /**
     * Get or create conversation state for a user
     */
    async getConversationState(phone) {
        try {
            let state = await LegacyConversationState.findOne({ 
                phone, 
                isActive: true 
            });

            
            console.log('state found', state);
            if (!state) {
                console.log('No state found for phone', phone);
                state = new LegacyConversationState({
                    phone,
                    currentStep: 'start',
                    conversationData: {},
                    isActive: true
                });
                await state.save();
                console.log(`📱 New conversation started for ${phone}`);
            }

            return state;
        } catch (error) {
            console.error('Error getting conversation state:', error);
            throw error;
        }
    }

    /**
     * Update conversation state
     */
    async updateConversationState(phone, updates) {
        try {
            const state = await LegacyConversationState.findOneAndUpdate(
                { phone, isActive: true },
                { 
                    ...updates, 
                    lastMessageAt: new Date() 
                },
                { new: true, upsert: true }
            );

            console.log(`🔄 Conversation state updated for ${phone}: ${state.currentStep}`);
            return state;
        } catch (error) {
            console.error('Error updating conversation state:', error);
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
     * Initialize default products in database
     */
    async initializeDefaultProducts() {
        try {
            // Add timeout to prevent hanging
            const productCount = await Promise.race([
                MylarBagProduct.countDocuments(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database timeout')), 5000)
                )
            ]);
            if (productCount === 0) {
                const defaultProducts = [
                    {
                        id: 'MYLAR_STAND_UP',
                        name: 'Stand-Up Mylar Bags',
                        description: 'Resealable stand-up mylar bags with zip closure',
                        dimensionNames: ['Length', 'Width', 'Gusset'],
                        availableMaterials: [
                            { name: 'Standard Mylar (3.5 mil)', pricePerUnit: 0.15, description: 'Basic protection' },
                            { name: 'Heavy Duty Mylar (5 mil)', pricePerUnit: 0.25, description: 'Enhanced durability' },
                            { name: 'Premium Mylar (7 mil)', pricePerUnit: 0.35, description: 'Maximum protection' }
                        ],
                        availableFinishes: [
                            { name: 'Clear', pricePerUnit: 0.00, description: 'Transparent finish' },
                            { name: 'Silver', pricePerUnit: 0.05, description: 'Metallic silver' },
                            { name: 'Gold', pricePerUnit: 0.08, description: 'Metallic gold' },
                            { name: 'Black', pricePerUnit: 0.06, description: 'Matte black' }
                        ],
                        basePrice: 0.50
                    },
                    {
                        id: 'MYLAR_FLAT',
                        name: 'Flat Mylar Bags',
                        description: 'Heat-sealable flat mylar bags',
                        dimensionNames: ['Length', 'Width'],
                        availableMaterials: [
                            { name: 'Standard Mylar (3.5 mil)', pricePerUnit: 0.12, description: 'Basic protection' },
                            { name: 'Heavy Duty Mylar (5 mil)', pricePerUnit: 0.20, description: 'Enhanced durability' },
                            { name: 'Premium Mylar (7 mil)', pricePerUnit: 0.28, description: 'Maximum protection' }
                        ],
                        availableFinishes: [
                            { name: 'Clear', pricePerUnit: 0.00, description: 'Transparent finish' },
                            { name: 'Silver', pricePerUnit: 0.04, description: 'Metallic silver' },
                            { name: 'Gold', pricePerUnit: 0.06, description: 'Metallic gold' }
                        ],
                        basePrice: 0.30
                    },
                    {
                        id: 'MYLAR_GUSSET',
                        name: 'Gusseted Mylar Bags',
                        description: 'Side-gusseted mylar bags for bulk storage',
                        dimensionNames: ['Length', 'Width', 'Gusset'],
                        availableMaterials: [
                            { name: 'Standard Mylar (3.5 mil)', pricePerUnit: 0.18, description: 'Basic protection' },
                            { name: 'Heavy Duty Mylar (5 mil)', pricePerUnit: 0.28, description: 'Enhanced durability' },
                            { name: 'Premium Mylar (7 mil)', pricePerUnit: 0.38, description: 'Maximum protection' }
                        ],
                        availableFinishes: [
                            { name: 'Clear', pricePerUnit: 0.00, description: 'Transparent finish' },
                            { name: 'Silver', pricePerUnit: 0.05, description: 'Metallic silver' },
                            { name: 'Black', pricePerUnit: 0.07, description: 'Matte black' }
                        ],
                        basePrice: 0.60
                    }
                ];

                await MylarBagProduct.insertMany(defaultProducts);
                console.log('🏭 Default mylar bag products initialized');
            }
        } catch (error) {
            console.error('Error initializing default products:', error);
            // Don't throw error - just log it and continue
            // This prevents the database timeout from breaking message processing
        }
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
