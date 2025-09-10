import express from 'express';
import { QuoteService } from '../services/quoteService.js';

const router = express.Router();

// Get all product categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await QuoteService.getAllProductCategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get products by category
router.get('/categories/:categoryId/products', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const products = await QuoteService.getProductsByCategory(categoryId);
        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get materials by category
router.get('/categories/:categoryId/materials', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const materials = await QuoteService.getMaterialsByCategory(categoryId);
        res.json({
            success: true,
            data: materials
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get finishes by product category
router.get('/categories/:categoryId/finishes', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const finishes = await QuoteService.getFinishesByProductCategory(categoryId);
        res.json({
            success: true,
            data: finishes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user by phone (find or create)
router.post('/users', async (req, res) => {
    try {
        const { phone, name, email } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }
        
        const user = await QuoteService.findOrCreateUser(phone, name, email);
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user's quotes
router.get('/users/:userId/quotes', async (req, res) => {
    try {
        const { userId } = req.params;
        const quotes = await QuoteService.getUserQuotes(userId);
        res.json({
            success: true,
            data: quotes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Create a test quote
router.post('/quotes/test', async (req, res) => {
    try {
        const {
            phone,
            productId,
            materialId,
            finishId,
            dimensions,
            quantity
        } = req.body;
        
        // Find or create user
        const user = await QuoteService.findOrCreateUser(phone, `Test User ${phone}`);
        
        // Create conversation data
        const conversationData = {
            selectedProductId: productId,
            selectedMaterialId: materialId,
            selectedFinishId: finishId,
            dimensions: dimensions || [
                { name: 'Length', value: 10, unit: 'inches' },
                { name: 'Width', value: 8, unit: 'inches' }
            ],
            quantity: quantity || 100
        };
        
        // Generate quote
        const quote = await QuoteService.generateQuote(user._id, conversationData);
        
        // Get populated data for response
        const product = await QuoteService.getProduct(productId);
        const material = await QuoteService.getMaterial(materialId);
        const finish = await QuoteService.getFinish(finishId);
        
        const formattedMessage = QuoteService.formatQuoteMessage(quote, user, product, material, finish);
        
        res.json({
            success: true,
            data: {
                quote,
                formattedMessage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Database stats endpoint
router.get('/stats', async (req, res) => {
    try {
        const { User, ProductCategory, Product, Material, ProductFinish, Quote } = await import('../models/index.js');
        
        const stats = {
            users: await User.countDocuments(),
            categories: await ProductCategory.countDocuments(),
            products: await Product.countDocuments(),
            materials: await Material.countDocuments(),
            finishes: await ProductFinish.countDocuments(),
            quotes: await Quote.countDocuments()
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
