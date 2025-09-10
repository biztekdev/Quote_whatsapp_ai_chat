import {
    User,
    ProductCategory,
    Product,
    Material,
    FinishCategory,
    ProductFinish,
    Quote,
    ConversationState
} from '../models/index.js';

export class QuoteService {
    
    // User Management
    static async findOrCreateUser(phone, name = null, email = null) {
        try {
            let user = await User.findOne({ phone });
            
            if (!user) {
                user = new User({
                    phone,
                    name: name || `User ${phone}`,
                    email: email || null
                });
                await user.save();
                console.log(`✅ Created new user: ${user.name} (${user.phone})`);
            } else if (name && user.name !== name) {
                user.name = name;
                user.lastInteraction = new Date();
                await user.save();
            }
            
            return user;
        } catch (error) {
            console.error('Error finding/creating user:', error);
            throw error;
        }
    }
    
    // Product Categories
    static async getAllProductCategories() {
        try {
            return await ProductCategory.find({ isActive: true })
                .sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            console.error('Error fetching product categories:', error);
            throw error;
        }
    }
    
    static async getProductCategory(categoryId) {
        try {
            return await ProductCategory.findById(categoryId);
        } catch (error) {
            console.error('Error fetching product category:', error);
            throw error;
        }
    }
    
    // Products
    static async getProductsByCategory(categoryId) {
        try {
            return await Product.find({ 
                categoryId, 
                isActive: true 
            })
            .populate('categoryId')
            .sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            console.error('Error fetching products by category:', error);
            throw error;
        }
    }
    
    static async getProduct(productId) {
        try {
            return await Product.findById(productId)
                .populate('categoryId');
        } catch (error) {
            console.error('Error fetching product:', error);
            throw error;
        }
    }
    
    // Materials
    static async getMaterialsByCategory(categoryId) {
        try {
            return await Material.find({ 
                categoryId, 
                isActive: true 
            }).sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            console.error('Error fetching materials by category:', error);
            throw error;
        }
    }
    
    static async getMaterial(materialId) {
        try {
            return await Material.findById(materialId);
        } catch (error) {
            console.error('Error fetching material:', error);
            throw error;
        }
    }
    
    // Product Finishes
    static async getFinishesByProductCategory(productCategoryId) {
        try {
            return await ProductFinish.find({ 
                productCategoryId, 
                isActive: true 
            })
            .populate('categoryId')
            .sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            console.error('Error fetching finishes by product category:', error);
            throw error;
        }
    }
    
    static async getFinish(finishId) {
        try {
            return await ProductFinish.findById(finishId)
                .populate('categoryId');
        } catch (error) {
            console.error('Error fetching finish:', error);
            throw error;
        }
    }
    
    // Conversation State Management
    static async getOrCreateConversationState(userId, phone) {
        try {
            let conversation = await ConversationState.findOne({ 
                userId, 
                isActive: true 
            });
            
            if (!conversation) {
                conversation = new ConversationState({
                    userId,
                    phone,
                    currentStep: 'start',
                    conversationData: {},
                    isActive: true
                });
                await conversation.save();
            }
            
            return conversation;
        } catch (error) {
            console.error('Error getting/creating conversation state:', error);
            throw error;
        }
    }
    
    static async updateConversationState(userId, updates) {
        try {
            const conversation = await ConversationState.findOneAndUpdate(
                { userId, isActive: true },
                {
                    ...updates,
                    lastMessageAt: new Date()
                },
                { new: true }
            );
            
            return conversation;
        } catch (error) {
            console.error('Error updating conversation state:', error);
            throw error;
        }
    }
    
    static async resetConversationState(userId) {
        try {
            await ConversationState.findOneAndUpdate(
                { userId, isActive: true },
                {
                    currentStep: 'start',
                    conversationData: {},
                    lastMessageAt: new Date()
                },
                { new: true }
            );
        } catch (error) {
            console.error('Error resetting conversation state:', error);
            throw error;
        }
    }
    
    static async completeConversation(userId) {
        try {
            await ConversationState.findOneAndUpdate(
                { userId, isActive: true },
                {
                    isActive: false,
                    completedAt: new Date()
                }
            );
        } catch (error) {
            console.error('Error completing conversation:', error);
            throw error;
        }
    }
    
    // Quote Calculation and Generation
    static calculateQuotePrice(product, material, finish, dimensions, quantity) {
        try {
            // Calculate area based on dimensions
            let area = 1;
            dimensions.forEach(dim => {
                area *= dim.value;
            });
            
            // Base price calculation
            const basePrice = product.basePrice * quantity;
            
            // Material cost calculation
            const materialCost = material.pricePerUnit * area * quantity;
            
            // Finish cost calculation
            let finishCost = 0;
            if (finish.priceType === 'fixed') {
                finishCost = finish.price;
            } else if (finish.priceType === 'percentage') {
                finishCost = (basePrice + materialCost) * (finish.price / 100);
            } else if (finish.priceType === 'per_unit') {
                finishCost = finish.price * quantity;
            }
            
            // Quantity discount (example: 5% for 100+, 10% for 500+, 15% for 1000+)
            let quantityDiscount = 0;
            if (quantity >= 1000) {
                quantityDiscount = 0.15;
            } else if (quantity >= 500) {
                quantityDiscount = 0.10;
            } else if (quantity >= 100) {
                quantityDiscount = 0.05;
            }
            
            const subtotal = basePrice + materialCost + finishCost;
            const discountAmount = subtotal * quantityDiscount;
            const finalSubtotal = subtotal - discountAmount;
            
            // Tax calculation (8% example)
            const tax = finalSubtotal * 0.08;
            
            // Shipping calculation (free over $100)
            const shipping = finalSubtotal > 100 ? 0 : 15;
            
            const totalPrice = finalSubtotal + tax + shipping;
            
            return {
                basePrice,
                materialCost,
                finishCost,
                quantityDiscount: discountAmount,
                subtotal: finalSubtotal,
                tax,
                shipping,
                totalPrice: Math.round(totalPrice * 100) / 100 // Round to 2 decimal places
            };
        } catch (error) {
            console.error('Error calculating quote price:', error);
            throw error;
        }
    }
    
    static async generateQuote(userId, conversationData) {
        try {
            const user = await User.findById(userId);
            const product = await this.getProduct(conversationData.selectedProductId);
            const material = await this.getMaterial(conversationData.selectedMaterialId);
            const finish = await this.getFinish(conversationData.selectedFinishId);
            
            if (!user || !product || !material || !finish) {
                throw new Error('Missing required data for quote generation');
            }
            
            // Calculate pricing
            const pricing = this.calculateQuotePrice(
                product,
                material,
                finish,
                conversationData.dimensions,
                conversationData.quantity
            );
            
            // Create quote
            const quote = new Quote({
                userId: user._id,
                productId: product._id,
                materialId: material._id,
                finishId: finish._id,
                dimensions: conversationData.dimensions,
                quantity: conversationData.quantity,
                pricing,
                status: 'pending'
            });
            
            await quote.save();
            
            // Update user's total quotes
            await User.findByIdAndUpdate(userId, {
                $inc: { totalQuotes: 1 },
                lastInteraction: new Date()
            });
            
            return quote;
        } catch (error) {
            console.error('Error generating quote:', error);
            throw error;
        }
    }
    
    // Format quote for WhatsApp message
    static formatQuoteMessage(quote, user, product, material, finish) {
        const dimensions = quote.dimensions
            .map(d => `${d.name}: ${d.value} ${d.unit}`)
            .join(', ');
        
        return `🎯 *QUOTE GENERATED* 🎯

👤 *Customer:* ${user.name}
📞 *Phone:* ${user.phone}
🔢 *Quote #:* ${quote.quoteNumber}

📦 *Product Details:*
• Product: ${product.name}
• Material: ${material.name} (${material.thickness})
• Finish: ${finish.name}
• Dimensions: ${dimensions}
• Quantity: ${quote.quantity} pieces

💰 *Pricing Breakdown:*
• Base Price: $${quote.pricing.basePrice.toFixed(2)}
• Material Cost: $${quote.pricing.materialCost.toFixed(2)}
• Finish Cost: $${quote.pricing.finishCost.toFixed(2)}
${quote.pricing.quantityDiscount > 0 ? `• Quantity Discount: -$${quote.pricing.quantityDiscount.toFixed(2)}` : ''}
• Subtotal: $${quote.pricing.subtotal.toFixed(2)}
• Tax: $${quote.pricing.tax.toFixed(2)}
${quote.pricing.shipping > 0 ? `• Shipping: $${quote.pricing.shipping.toFixed(2)}` : '• Shipping: FREE'}

*🎉 TOTAL: $${quote.pricing.totalPrice.toFixed(2)}*

📅 Valid until: ${quote.validUntil.toLocaleDateString()}

Would you like to proceed with this quote?`;
    }
    
    // Get user's quote history
    static async getUserQuotes(userId, limit = 10) {
        try {
            return await Quote.find({ userId })
                .populate('productId')
                .populate('materialId')
                .populate('finishId')
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error('Error fetching user quotes:', error);
            throw error;
        }
    }
}
