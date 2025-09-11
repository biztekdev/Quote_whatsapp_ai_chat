import express from 'express';
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

const router = express.Router();
import mongoLogger from '../services/mongoLogger.js';
import encryptionService from '../services/encryptionService.js';

// ==================== LOGS VIEW ====================
// Get paginated logs from MongoDB
router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, level, search } = req.query;
        let filters = {};
        if (level) filters.level = level;
        if (search) filters.message = { $regex: search, $options: 'i' };
        const result = await mongoLogger.getLogsPaginated(parseInt(page), parseInt(limit), filters);
        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== USER CRUD OPERATIONS ====================

// Get all users
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;
        
        // Search query - can search by name and email (not encrypted)
        // Username and phone are encrypted, so we'll filter those after decryption
        const query = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};
        
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await User.countDocuments(query);
        
        // Convert Mongoose documents to plain objects and decrypt user data
        const plainUsers = users.map(user => user.toObject());
        let decryptedUsers = encryptionService.decryptUsers(plainUsers);
        
        // If search is provided, filter decrypted data
        if (search) {
            const searchLower = search.toLowerCase();
            decryptedUsers = decryptedUsers.filter(user => 
                user.name?.toLowerCase().includes(searchLower) ||
                user.phone?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower)
            );
        }
        
        res.json({
            success: true,
            data: decryptedUsers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: search ? decryptedUsers.length : total,
                pages: Math.ceil((search ? decryptedUsers.length : total) / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID
        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        // Validate MongoDB ObjectId format
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID format' });
        }
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Convert Mongoose document to plain object and decrypt user data
        const plainUser = user.toObject();
        const decryptedUser = encryptionService.decryptUser(plainUser);
        res.json({ success: true, data: decryptedUser });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create user
router.post('/users', async (req, res) => {
    try {
        const userData = req.body;
        
        // Encrypt sensitive user data (only phone field)
        const encryptedUserData = encryptionService.encryptUser(userData);
        
        const user = new User(encryptedUserData);
        await user.save();
        
        // Convert Mongoose document to plain object and decrypt for response
        const plainUser = user.toObject();
        const decryptedUser = encryptionService.decryptUser(plainUser);
        res.status(201).json({ success: true, data: decryptedUser });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const updateData = req.body;
        
        // Encrypt sensitive user data (only phone field)
        const encryptedUpdateData = encryptionService.encryptUser(updateData);
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            encryptedUpdateData,
            { new: true, runValidators: false } // Disable validators since we're doing partial updates
        );
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Convert Mongoose document to plain object and decrypt for response
        const plainUser = user.toObject();
        const decryptedUser = encryptionService.decryptUser(plainUser);
        res.json({ success: true, data: decryptedUser });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PRODUCT CATEGORY CRUD OPERATIONS ====================

// Get all product categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await ProductCategory.find().sort({ sortOrder: 1, name: 1 });
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get category by ID
router.get('/categories/:id', async (req, res) => {
    try {
        const category = await ProductCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create category
router.post('/categories', async (req, res) => {
    try {
        const category = new ProductCategory(req.body);
        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update category
router.put('/categories/:id', async (req, res) => {
    try {
        const category = await ProductCategory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
    try {
        const category = await ProductCategory.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PRODUCT CRUD OPERATIONS ====================

// Get all products
router.get('/products', async (req, res) => {
    try {
        const { categoryId } = req.query;
        const query = categoryId ? { categoryId } : {};
        
        const products = await Product.find(query)
            .populate('categoryId')
            .sort({ sortOrder: 1, name: 1 });
            
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get product by ID
router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('categoryId');
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create product
router.post('/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        await product.populate('categoryId');
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update product
router.put('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('categoryId');
        
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== MATERIAL CRUD OPERATIONS ====================

// Get all materials
router.get('/materials', async (req, res) => {
    try {
        const { categoryId } = req.query;
        const query = categoryId ? { categoryId } : {};
        
        const materials = await Material.find(query)
            .populate('categoryId')
            .sort({ sortOrder: 1, name: 1 });
            
        res.json({ success: true, data: materials });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get material by ID
router.get('/materials/:id', async (req, res) => {
    try {
        const material = await Material.findById(req.params.id).populate('categoryId');
        if (!material) {
            return res.status(404).json({ success: false, error: 'Material not found' });
        }
        res.json({ success: true, data: material });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create material
router.post('/materials', async (req, res) => {
    try {
        const material = new Material(req.body);
        await material.save();
        await material.populate('categoryId');
        res.status(201).json({ success: true, data: material });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update material
router.put('/materials/:id', async (req, res) => {
    try {
        const material = await Material.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('categoryId');
        
        if (!material) {
            return res.status(404).json({ success: false, error: 'Material not found' });
        }
        res.json({ success: true, data: material });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete material
router.delete('/materials/:id', async (req, res) => {
    try {
        const material = await Material.findByIdAndDelete(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, error: 'Material not found' });
        }
        res.json({ success: true, message: 'Material deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== FINISH CATEGORY CRUD OPERATIONS ====================

// Get all finish categories
router.get('/finish-categories', async (req, res) => {
    try {
        const categories = await FinishCategory.find().sort({ sortOrder: 1, name: 1 });
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create finish category
router.post('/finish-categories', async (req, res) => {
    try {
        const category = new FinishCategory(req.body);
        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update finish category
router.put('/finish-categories/:id', async (req, res) => {
    try {
        const category = await FinishCategory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ success: false, error: 'Finish category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete finish category
router.delete('/finish-categories/:id', async (req, res) => {
    try {
        const category = await FinishCategory.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Finish category not found' });
        }
        res.json({ success: true, message: 'Finish category deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PRODUCT FINISH CRUD OPERATIONS ====================

// Get all product finishes
router.get('/finishes', async (req, res) => {
    try {
        const { categoryId, productCategoryId } = req.query;
        let query = {};
        
        if (categoryId) query.categoryId = categoryId;
        if (productCategoryId) query.productCategoryId = productCategoryId;
        
        const finishes = await ProductFinish.find(query)
            .populate('categoryId')
            .populate('productCategoryId')
            .sort({ sortOrder: 1, name: 1 });
            
        res.json({ success: true, data: finishes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get finish by ID
router.get('/finishes/:id', async (req, res) => {
    try {
        const finish = await ProductFinish.findById(req.params.id)
            .populate('categoryId')
            .populate('productCategoryId');
            
        if (!finish) {
            return res.status(404).json({ success: false, error: 'Finish not found' });
        }
        res.json({ success: true, data: finish });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create finish
router.post('/finishes', async (req, res) => {
    try {
        const finish = new ProductFinish(req.body);
        await finish.save();
        await finish.populate(['categoryId', 'productCategoryId']);
        res.status(201).json({ success: true, data: finish });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update finish
router.put('/finishes/:id', async (req, res) => {
    try {
        const finish = await ProductFinish.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate(['categoryId', 'productCategoryId']);
        
        if (!finish) {
            return res.status(404).json({ success: false, error: 'Finish not found' });
        }
        res.json({ success: true, data: finish });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete finish
router.delete('/finishes/:id', async (req, res) => {
    try {
        const finish = await ProductFinish.findByIdAndDelete(req.params.id);
        if (!finish) {
            return res.status(404).json({ success: false, error: 'Finish not found' });
        }
        res.json({ success: true, message: 'Finish deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== QUOTE CRUD OPERATIONS ====================

// Get all quotes
router.get('/quotes', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, userId } = req.query;
        const skip = (page - 1) * limit;
        
        let query = {};
        if (status) query.status = status;
        if (userId) query.userId = userId;
        
        const quotes = await Quote.find(query)
            .populate('userId')
            .populate('productId')
            .populate('materialId')
            .populate('finishId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Quote.countDocuments(query);
        
        res.json({
            success: true,
            data: quotes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get quote by ID
router.get('/quotes/:id', async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id)
            .populate('userId')
            .populate('productId')
            .populate('materialId')
            .populate('finishId');
            
        if (!quote) {
            return res.status(404).json({ success: false, error: 'Quote not found' });
        }
        res.json({ success: true, data: quote });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update quote status
router.put('/quotes/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const quote = await Quote.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate(['userId', 'productId', 'materialId', 'finishId']);
        
        if (!quote) {
            return res.status(404).json({ success: false, error: 'Quote not found' });
        }
        res.json({ success: true, data: quote });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete quote
router.delete('/quotes/:id', async (req, res) => {
    try {
        const quote = await Quote.findByIdAndDelete(req.params.id);
        if (!quote) {
            return res.status(404).json({ success: false, error: 'Quote not found' });
        }
        res.json({ success: true, message: 'Quote deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CONVERSATION STATE OPERATIONS ====================

// Get all conversation states
router.get('/conversations', async (req, res) => {
    try {
        const { isActive = true } = req.query;
        const conversations = await ConversationState.find({ isActive })
            .populate('userId')
            .sort({ lastMessageAt: -1 });
            
        res.json({ success: true, data: conversations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reset conversation
router.put('/conversations/:id/reset', async (req, res) => {
    try {
        const conversation = await ConversationState.findByIdAndUpdate(
            req.params.id,
            {
                currentStep: 'start',
                conversationData: {},
                lastMessageAt: new Date()
            },
            { new: true }
        ).populate('userId');
        
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }
        res.json({ success: true, data: conversation });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            users: {
                total: await User.countDocuments(),
                active: await User.countDocuments({ isActive: true }),
                recent: await User.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
            },
            categories: {
                total: await ProductCategory.countDocuments(),
                active: await ProductCategory.countDocuments({ isActive: true })
            },
            products: {
                total: await Product.countDocuments(),
                active: await Product.countDocuments({ isActive: true })
            },
            materials: {
                total: await Material.countDocuments(),
                active: await Material.countDocuments({ isActive: true })
            },
            finishes: {
                total: await ProductFinish.countDocuments(),
                active: await ProductFinish.countDocuments({ isActive: true })
            },
            quotes: {
                total: await Quote.countDocuments(),
                pending: await Quote.countDocuments({ status: 'pending' }),
                accepted: await Quote.countDocuments({ status: 'accepted' }),
                rejected: await Quote.countDocuments({ status: 'rejected' }),
                recent: await Quote.countDocuments({
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                })
            },
            conversations: {
                active: await ConversationState.countDocuments({ isActive: true }),
                completed: await ConversationState.countDocuments({ isActive: false })
            }
        };
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
