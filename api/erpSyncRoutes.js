import express from 'express';
import erpSyncService from '../services/erpSyncService.js';
import smartLogger from '../services/smartLogger.js';

const router = express.Router();

// Initialize sync service
erpSyncService.initialize().catch(error => {
    smartLogger.error('Failed to initialize ERP Sync Service', { error: error.message });
    console.error('Failed to initialize ERP Sync Service:', error.message);
});

/**
 * GET /api/sync/status
 * Get sync status and statistics
 */
router.get('/status', async (req, res) => {
    try {
        smartLogger.info('Getting ERP sync status');
        console.log('Getting ERP sync status');
        
        const status = await erpSyncService.getSyncStatus();
        
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting sync status', { error: error.message });
        console.error('Error getting sync status:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get sync status',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/sync/product-categories
 * Sync product categories from ERP
 */
router.post('/product-categories', async (req, res) => {
    try {
        smartLogger.info('Starting product categories sync via API');
        console.log('Starting product categories sync via API');
        
        const result = await erpSyncService.syncProductCategories();
        
        res.json({
            success: true,
            message: 'Product categories sync completed',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Product categories sync failed via API', { error: error.message });
        console.error('Product categories sync failed via API:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Product categories sync failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/sync/products
 * Sync products from ERP
 */
router.post('/products', async (req, res) => {
    try {
        smartLogger.info('Starting products sync via API');
        console.log('Starting products sync via API');
        
        const result = await erpSyncService.syncProducts();
        
        res.json({
            success: true,
            message: 'Products sync completed',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Products sync failed via API', { error: error.message });
        console.error('Products sync failed via API:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Products sync failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/sync/materials
 * Sync materials from ERP
 */
router.post('/materials', async (req, res) => {
    try {
        smartLogger.info('Starting materials sync via API');
        console.log('Starting materials sync via API');
        
        const result = await erpSyncService.syncMaterials();
        
        res.json({
            success: true,
            message: 'Materials sync completed',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Materials sync failed via API', { error: error.message });
        console.error('Materials sync failed via API:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Materials sync failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/sync/finishes
 * Sync finishes from ERP
 */
router.post('/finishes', async (req, res) => {
    try {
        smartLogger.info('Starting finishes sync via API');
        console.log('Starting finishes sync via API');
        
        const result = await erpSyncService.syncFinishes();
        
        res.json({
            success: true,
            message: 'Finishes sync completed',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Finishes sync failed via API', { error: error.message });
        console.error('Finishes sync failed via API:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Finishes sync failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/sync/all
 * Sync all tables from ERP
 */
router.post('/all', async (req, res) => {
    try {
        smartLogger.info('Starting full ERP sync via API');
        console.log('Starting full ERP sync via API');
        
        const result = await erpSyncService.syncAll();
        
        res.json({
            success: true,
            message: 'Full ERP sync completed',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Full ERP sync failed via API', { error: error.message });
        console.error('Full ERP sync failed via API:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Full ERP sync failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/sync/test
 * Test ERP connectivity
 */
router.post('/test', async (req, res) => {
    try {
        smartLogger.info('Testing ERP connectivity');
        console.log('Testing ERP connectivity');
        
        // Try to fetch a small amount of data to test connectivity
        const testResult = await erpSyncService.fetchFromERP('api/sync/product-categories');
        
        res.json({
            success: true,
            message: 'ERP connectivity test successful',
            data: {
                recordsFound: testResult.length,
                sampleRecord: testResult[0] || null,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        smartLogger.error('ERP connectivity test failed', { error: error.message });
        console.error('ERP connectivity test failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'ERP connectivity test failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/sync/cleanup
 * Cleanup inactive records older than specified days
 */
router.post('/cleanup', async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;
        
        smartLogger.info(`Starting cleanup of inactive records older than ${daysOld} days`);
        console.log(`Starting cleanup of inactive records older than ${daysOld} days`);
        
        const result = await erpSyncService.cleanupInactiveRecords(parseInt(daysOld));
        
        res.json({
            success: true,
            message: `Cleanup completed. Removed ${result.deletedCount} inactive records older than ${daysOld} days.`,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Cleanup failed', { error: error.message });
        console.error('Cleanup failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Cleanup failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/product-categories/active
 * Get only active product categories
 */
router.get('/product-categories/active', async (req, res) => {
    try {
        smartLogger.info('Getting active product categories');
        console.log('Getting active product categories');
        
        const activeCategories = await erpSyncService.getActiveProductCategories();
        
        res.json({
            success: true,
            data: activeCategories,
            total: activeCategories.length,
            message: 'Active product categories retrieved',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting active categories', { error: error.message });
        console.error('Error getting active categories:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get active categories',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/product-categories/mapping
 * Get ERP ID to MongoDB ID mapping
 */
router.get('/product-categories/mapping', async (req, res) => {
    try {
        smartLogger.info('Getting category ERP ID mapping');
        console.log('Getting category ERP ID mapping');
        
        const mapping = await erpSyncService.getCategoryMapping();
        
        res.json({
            success: true,
            data: mapping,
            total: Object.keys(mapping).length,
            message: 'Category ERP ID mapping retrieved',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting category mapping', { error: error.message });
        console.error('Error getting category mapping:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get category mapping',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/product-categories/:erpId
 * Get category by ERP ID
 */
router.get('/product-categories/:erpId', async (req, res) => {
    try {
        const { erpId } = req.params;
        
        smartLogger.info(`Getting category by ERP ID: ${erpId}`);
        console.log(`Getting category by ERP ID: ${erpId}`);
        
        const category = await erpSyncService.findCategoryByErpId(erpId);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found',
                message: `No category found with ERP ID: ${erpId}`,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: category,
            message: `Category retrieved by ERP ID: ${erpId}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting category by ERP ID', { error: error.message });
        console.error('Error getting category by ERP ID:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get category by ERP ID',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/products/active
 * Get only active products
 */
router.get('/products/active', async (req, res) => {
    try {
        smartLogger.info('Getting active products');
        console.log('Getting active products');
        
        const activeProducts = await erpSyncService.getActiveProducts();
        
        res.json({
            success: true,
            data: activeProducts,
            total: activeProducts.length,
            message: 'Active products retrieved',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting active products', { error: error.message });
        console.error('Error getting active products:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get active products',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/products/category/:categoryErpId
 * Get products by category ERP ID
 */
router.get('/products/category/:categoryErpId', async (req, res) => {
    try {
        const { categoryErpId } = req.params;
        
        smartLogger.info(`Getting products for category ERP ID: ${categoryErpId}`);
        console.log(`Getting products for category ERP ID: ${categoryErpId}`);
        
        const products = await erpSyncService.getProductsByCategoryErpId(categoryErpId);
        
        res.json({
            success: true,
            data: products,
            total: products.length,
            message: `Products retrieved for category ERP ID: ${categoryErpId}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting products by category', { error: error.message });
        console.error('Error getting products by category:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get products by category',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/products/:erpId
 * Get product by ERP ID
 */
router.get('/products/:erpId', async (req, res) => {
    try {
        const { erpId } = req.params;
        
        smartLogger.info(`Getting product by ERP ID: ${erpId}`);
        console.log(`Getting product by ERP ID: ${erpId}`);
        
        const product = await erpSyncService.findProductByErpId(erpId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found',
                message: `No product found with ERP ID: ${erpId}`,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: product,
            message: `Product retrieved by ERP ID: ${erpId}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting product by ERP ID', { error: error.message });
        console.error('Error getting product by ERP ID:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get product by ERP ID',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/materials/mock
 * Get mock materials data for testing
 */
router.get('/materials/mock', (req, res) => {
    const mockData = [
        {
            "id": 48,
            "name": "PP Silver Sticker",
            "product_category_id": 3
        },
        {
            "id": 49,
            "name": "White Paper Sticker",
            "product_category_id": 3
        },
        {
            "id": 50,
            "name": "Transparent Vinyl",
            "product_category_id": 3
        },
        {
            "id": 51,
            "name": "Kraft Paper",
            "product_category_id": 1
        },
        {
            "id": 52,
            "name": "Aluminum Foil",
            "product_category_id": 1
        }
    ];
    
    res.json({
        success: true,
        data: mockData,
        total: mockData.length,
        message: 'Mock materials data',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/sync/materials/active
 * Get only active materials
 */
router.get('/materials/active', async (req, res) => {
    try {
        smartLogger.info('Getting active materials');
        console.log('Getting active materials');
        
        const activeMaterials = await erpSyncService.getActiveMaterials();
        
        res.json({
            success: true,
            data: activeMaterials,
            total: activeMaterials.length,
            message: 'Active materials retrieved',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting active materials', { error: error.message });
        console.error('Error getting active materials:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get active materials',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/materials/category/:categoryErpId
 * Get materials by category ERP ID
 */
router.get('/materials/category/:categoryErpId', async (req, res) => {
    try {
        const { categoryErpId } = req.params;
        
        smartLogger.info(`Getting materials for category ERP ID: ${categoryErpId}`);
        console.log(`Getting materials for category ERP ID: ${categoryErpId}`);
        
        const materials = await erpSyncService.getMaterialsByCategoryErpId(categoryErpId);
        
        res.json({
            success: true,
            data: materials,
            total: materials.length,
            message: `Materials retrieved for category ERP ID: ${categoryErpId}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting materials by category', { error: error.message });
        console.error('Error getting materials by category:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get materials by category',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/materials/:erpId
 * Get material by ERP ID
 */
router.get('/materials/:erpId', async (req, res) => {
    try {
        const { erpId } = req.params;
        
        smartLogger.info(`Getting material by ERP ID: ${erpId}`);
        console.log(`Getting material by ERP ID: ${erpId}`);
        
        const material = await erpSyncService.findMaterialByErpId(erpId);
        
        if (!material) {
            return res.status(404).json({
                success: false,
                error: 'Material not found',
                message: `No material found with ERP ID: ${erpId}`,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: material,
            message: `Material retrieved by ERP ID: ${erpId}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting material by ERP ID', { error: error.message });
        console.error('Error getting material by ERP ID:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get material by ERP ID',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/finishes/active
 * Get only active finishes
 */
router.get('/finishes/active', async (req, res) => {
    try {
        smartLogger.info('Getting active finishes');
        console.log('Getting active finishes');
        
        const activeFinishes = await erpSyncService.getActiveFinishes();
        
        res.json({
            success: true,
            data: activeFinishes,
            total: activeFinishes.length,
            message: 'Active finishes retrieved',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting active finishes', { error: error.message });
        console.error('Error getting active finishes:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get active finishes',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/finishes/category/:categoryErpId
 * Get finishes by product category ERP ID
 */
router.get('/finishes/category/:categoryErpId', async (req, res) => {
    try {
        const { categoryErpId } = req.params;
        
        smartLogger.info(`Getting finishes for product category ERP ID: ${categoryErpId}`);
        console.log(`Getting finishes for product category ERP ID: ${categoryErpId}`);
        
        const finishes = await erpSyncService.getFinishesByProductCategoryErpId(categoryErpId);
        
        res.json({
            success: true,
            data: finishes,
            total: finishes.length,
            message: `Finishes retrieved for product category ERP ID: ${categoryErpId}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting finishes by product category', { error: error.message });
        console.error('Error getting finishes by product category:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get finishes by product category',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/finishes/:erpId
 * Get finish by ERP ID
 */
router.get('/finishes/:erpId', async (req, res) => {
    try {
        const { erpId } = req.params;
        
        smartLogger.info(`Getting finish by ERP ID: ${erpId}`);
        console.log(`Getting finish by ERP ID: ${erpId}`);
        
        const finish = await erpSyncService.findFinishByErpId(erpId);
        
        if (!finish) {
            return res.status(404).json({
                success: false,
                error: 'Finish not found',
                message: `No finish found with ERP ID: ${erpId}`,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: finish,
            message: `Finish retrieved by ERP ID: ${erpId}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting finish by ERP ID', { error: error.message });
        console.error('Error getting finish by ERP ID:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get finish by ERP ID',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync/config
 * Get current sync configuration
 */
router.get('/config', (req, res) => {
    try {
        const config = {
            erpApiBaseUrl: erpSyncService.erpApiBaseUrl,
            erpApiConfigured: !!(erpSyncService.erpApiBaseUrl && erpSyncService.erpApiToken),
            syncConfig: erpSyncService.syncConfig,
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: config,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        smartLogger.error('Error getting sync config', { error: error.message });
        console.error('Error getting sync config:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to get sync configuration',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/sync
 * Get sync dashboard/overview
 */
router.get('/', async (req, res) => {
    try {
        const status = await erpSyncService.getSyncStatus();
        
        // Create HTML dashboard
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ERP Sync Dashboard</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        background-color: #f5f5f5;
                    }
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        color: #333;
                    }
                    .status-card {
                        background: #e8f5e8;
                        border: 1px solid #4caf50;
                        border-radius: 5px;
                        padding: 15px;
                        margin: 10px 0;
                    }
                    .error-card {
                        background: #ffeaea;
                        border: 1px solid #f44336;
                        border-radius: 5px;
                        padding: 15px;
                        margin: 10px 0;
                    }
                    .table-stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 15px;
                        margin: 20px 0;
                    }
                    .stat-card {
                        background: #f9f9f9;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        padding: 15px;
                        text-align: center;
                    }
                    .sync-buttons {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin: 30px 0;
                    }
                    .btn {
                        background: #4caf50;
                        color: white;
                        padding: 12px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        text-decoration: none;
                        text-align: center;
                        display: inline-block;
                    }
                    .btn:hover {
                        background: #45a049;
                    }
                    .btn-danger {
                        background: #f44336;
                    }
                    .btn-danger:hover {
                        background: #da190b;
                    }
                    .btn-info {
                        background: #2196f3;
                    }
                    .btn-info:hover {
                        background: #0b7dda;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔄 ERP Sync Dashboard</h1>
                        <p>Synchronize your database with external ERP system</p>
                    </div>
                    
                    <div class="${status.erpApiConfigured ? 'status-card' : 'error-card'}">
                        <h3>🔗 ERP Connection Status</h3>
                        <p><strong>Status:</strong> ${status.erpApiConfigured ? '✅ Configured' : '❌ Not Configured'}</p>
                        <p><strong>Last Check:</strong> ${status.timestamp}</p>
                        ${!status.erpApiConfigured ? '<p>⚠️ Please configure ERP_API_BASE_URL and ERP_API_TOKEN environment variables.</p>' : ''}
                    </div>
                    
                     <div class="table-stats">
                         <div class="stat-card">
                             <h3>📂 Product Categories</h3>
                             <p><strong>${status.tables.productCategories.active}</strong> active</p>
                             <p><small>${status.tables.productCategories.inactive} inactive | ${status.tables.productCategories.total} total</small></p>
                         </div>
                         <div class="stat-card">
                             <h3>📦 Products</h3>
                             <p><strong>${status.tables.products.active}</strong> active</p>
                             <p><small>${status.tables.products.inactive} inactive | ${status.tables.products.total} total</small></p>
                         </div>
                         <div class="stat-card">
                             <h3>🧱 Materials</h3>
                             <p><strong>${status.tables.materials.active}</strong> active</p>
                             <p><small>${status.tables.materials.inactive} inactive | ${status.tables.materials.total} total</small></p>
                         </div>
                         <div class="stat-card">
                             <h3>✨ Finishes</h3>
                             <p><strong>${status.tables.finishes.active}</strong> active</p>
                             <p><small>${status.tables.finishes.inactive} inactive | ${status.tables.finishes.total} total</small></p>
                         </div>
                     </div>
                    
                    <div class="sync-buttons">
                        <button onclick="testConnection()" class="btn btn-info">🔍 Test Connection</button>
                        <button onclick="syncTable('product-categories')" class="btn">📂 Sync Categories</button>
                        <button onclick="syncTable('products')" class="btn">📦 Sync Products</button>
                        <button onclick="syncTable('materials')" class="btn">🧱 Sync Materials</button>
                        <button onclick="syncTable('finishes')" class="btn">✨ Sync Finishes</button>
                        <button onclick="syncAll()" class="btn btn-danger">🔄 Sync All Tables</button>
                    </div>
                    
                    <div id="result" style="margin-top: 20px;"></div>
                </div>
                
                <script>
                    async function testConnection() {
                        showLoading('Testing ERP connection...');
                        try {
                            const response = await fetch('/api/sync/test', { method: 'POST' });
                            const result = await response.json();
                            showResult(result, 'Connection Test');
                        } catch (error) {
                            showError('Connection test failed: ' + error.message);
                        }
                    }
                    
                    async function syncTable(table) {
                        showLoading('Syncing ' + table + '...');
                        try {
                            const response = await fetch('/api/sync/' + table, { method: 'POST' });
                            const result = await response.json();
                            showResult(result, 'Sync ' + table);
                        } catch (error) {
                            showError('Sync failed: ' + error.message);
                        }
                    }
                    
                    async function syncAll() {
                        if (!confirm('This will sync all tables. Are you sure?')) return;
                        showLoading('Syncing all tables...');
                        try {
                            const response = await fetch('/api/sync/all', { method: 'POST' });
                            const result = await response.json();
                            showResult(result, 'Full Sync');
                        } catch (error) {
                            showError('Full sync failed: ' + error.message);
                        }
                    }
                    
                    function showLoading(message) {
                        document.getElementById('result').innerHTML = '<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px;"><strong>⏳ ' + message + '</strong></div>';
                    }
                    
                    function showResult(result, operation) {
                        const resultDiv = document.getElementById('result');
                        if (result.success) {
                            resultDiv.innerHTML = '<div style="background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 5px;"><h4>✅ ' + operation + ' Successful</h4><pre>' + JSON.stringify(result.data, null, 2) + '</pre></div>';
                        } else {
                            resultDiv.innerHTML = '<div style="background: #ffeaea; border: 1px solid #f44336; padding: 15px; border-radius: 5px;"><h4>❌ ' + operation + ' Failed</h4><p>' + result.error + '</p><p><strong>Details:</strong> ' + result.details + '</p></div>';
                        }
                    }
                    
                    function showError(message) {
                        document.getElementById('result').innerHTML = '<div style="background: #ffeaea; border: 1px solid #f44336; padding: 15px; border-radius: 5px;"><h4>❌ Error</h4><p>' + message + '</p></div>';
                    }
                </script>
            </body>
            </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    } catch (error) {
        smartLogger.error('Error rendering sync dashboard', { error: error.message });
        console.error('Error rendering sync dashboard:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Failed to render sync dashboard',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
