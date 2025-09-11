import axios from 'axios';
import { ProductCategory, Product } from '../models/productModel.js';
import { Material } from '../models/materialModel.js';
import { FinishCategory, ProductFinish } from '../models/finishModel.js';
import smartLogger from './smartLogger.js';

/**
 * ERP Sync Service
 * Synchronizes data between local database and external ERP system
 */
class ERPSyncService {
    constructor() {
        // ERP API configuration
        this.erpApiBaseUrl = process.env.ERP_API_BASE_URL || 'https://your-erp-api.com/api';
        this.erpApiToken = process.env.ERP_API_TOKEN || '';
        this.erpApiHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.erpApiToken}`
        };
        
        // Sync configuration
        this.syncConfig = {
            batchSize: 100,
            maxRetries: 3,
            retryDelay: 1000 // milliseconds
        };
    }

    /**
     * Initialize the sync service
     */
    async initialize() {
        try {
            smartLogger.info('Initializing ERP Sync Service');
            console.log('Initializing ERP Sync Service');
            
            if (!this.erpApiBaseUrl || !this.erpApiToken) {
                smartLogger.warn('ERP API configuration missing. Using mock data.');
                console.warn('ERP API configuration missing. Using mock data.');
            }
            
            return true;
        } catch (error) {
            smartLogger.error('Failed to initialize ERP Sync Service', { error: error.message });
            console.error('Failed to initialize ERP Sync Service:', error.message);
            throw error;
        }
    }

    /**
     * Fetch data from ERP API with retry logic
     * @param {string} endpoint - API endpoint
     * @param {number} retryCount - Current retry count
     * @returns {Promise<Array>} - Array of data objects
     */
    async fetchFromERP(endpoint, retryCount = 0) {
        try {
            console.log(`Fetching data from ERP: ${endpoint}`);
            
            const response = await axios.get(`${this.erpApiBaseUrl}/${endpoint}`, {
                headers: this.erpApiHeaders,
                timeout: 30000 // 30 seconds timeout
            });

            if (response.status === 200 && Array.isArray(response.data)) {
                console.log(`Successfully fetched ${response.data.length} records from ${endpoint}`);
                return response.data;
            } else {
                console.log(`Successfully fetched error`);

                throw new Error(`Invalid response format from ${endpoint}`);
            }
        } catch (error) {
            console.error(`Error fetching from ERP (${endpoint}):`, error.message, 'Retry:', retryCount);
            
            // if (retryCount < this.syncConfig.maxRetries) {
            //     smartLogger.info(`Retrying in ${this.syncConfig.retryDelay}ms...`);
            //     console.log(`Retrying in ${this.syncConfig.retryDelay}ms...`);
                
            //     await new Promise(resolve => setTimeout(resolve, this.syncConfig.retryDelay));
            //     return this.fetchFromERP(endpoint, retryCount + 1);
            // }
            
            throw error;
        }
    }

    /**
     * Sync Product Categories
     * @returns {Promise<Object>} - Sync result
     */
    async syncProductCategories() {
        try {
            smartLogger.info('Starting Product Categories sync');
            console.log('Starting Product Categories sync');
            
            const erpData = await this.fetchFromERP('api/sync/product-categories');
            
            let created = 0;
            let updated = 0;
            let inactivated = 0;
            let errors = 0;

            // Step 1: Mark all existing categories as inactive
            console.log('Marking all existing product categories as inactive...');
            const inactivateResult = await ProductCategory.updateMany(
                {}, // All documents
                { isActive: false }
            );
            inactivated = inactivateResult.modifiedCount;
            console.log(`Marked ${inactivated} existing product categories as inactive`);

            // Step 2: Process categories from ERP data
            for (const erpCategory of erpData) {
                try {
                    // Parse sub_names from comma-separated string to array
                    let subNamesArray = [];
                    if (erpCategory.sub_names) {
                        if (typeof erpCategory.sub_names === 'string') {
                            subNamesArray = erpCategory.sub_names.split(',').map(name => name.trim()).filter(name => name);
                        } else if (Array.isArray(erpCategory.sub_names)) {
                            subNamesArray = erpCategory.sub_names;
                        }
                    }

                    // Map ERP data to our model structure
                    const categoryData = {
                        erp_id: parseInt(erpCategory.id),
                        name: erpCategory.name || erpCategory.category_name,
                        description: erpCategory.description || '',
                        sub_names: subNamesArray,
                        isActive: true, // Always set new/updated records as active
                        sortOrder: parseInt(erpCategory.sort_order || erpCategory.sortOrder || erpCategory.id || 0)
                    };

                    // Check if category exists by erp_id (primary match) or name (fallback)
                    const existingCategory = await ProductCategory.findOne({ 
                        $or: [
                            { erp_id: categoryData.erp_id },
                            { name: categoryData.name }
                        ]
                    });

                    if (existingCategory) {
                        // Update existing category and reactivate it
                        await ProductCategory.findByIdAndUpdate(
                            existingCategory._id,
                            categoryData,
                            { new: true }
                        );
                        updated++;
                        smartLogger.debug(`Updated and reactivated category: ${categoryData.name} (ERP ID: ${categoryData.erp_id}, sortOrder: ${categoryData.sortOrder})`);
                        console.log(`Updated and reactivated category: ${categoryData.name} (ERP ID: ${categoryData.erp_id}, sortOrder: ${categoryData.sortOrder}, sub_names: ${categoryData.sub_names.length} items: [${categoryData.sub_names.join(', ')}])`);
                    } else {
                        // Create new category
                        await ProductCategory.create(categoryData);
                        created++;
                        smartLogger.debug(`Created new category: ${categoryData.name} (ERP ID: ${categoryData.erp_id}, sortOrder: ${categoryData.sortOrder})`);
                        console.log(`Created new category: ${categoryData.name} (ERP ID: ${categoryData.erp_id}, sortOrder: ${categoryData.sortOrder}, sub_names: ${categoryData.sub_names.length} items: [${categoryData.sub_names.join(', ')}])`);
                    }
                    
                } catch (itemError) {
                    errors++;
                    smartLogger.error(`Error processing category: ${erpCategory.name} (ID: ${erpCategory.id})`, { error: itemError.message });
                    console.error(`Error processing category: ${erpCategory.name} (ID: ${erpCategory.id})`, itemError.message);
                }
            }

            // Step 3: Count final statistics
            const totalActive = await ProductCategory.countDocuments({ isActive: true });
            const totalInactive = await ProductCategory.countDocuments({ isActive: false });

            const result = {
                table: 'product_categories',
                total: erpData.length,
                created,
                updated,
                inactivated,
                errors,
                finalCounts: {
                    active: totalActive,
                    inactive: totalInactive,
                    total: totalActive + totalInactive
                },
                timestamp: new Date().toISOString()
            };

            smartLogger.info('Product Categories sync completed', result);
            console.log('Product Categories sync completed:', result);
            
            return result;
        } catch (error) {
            smartLogger.error('Product Categories sync failed', { error: error.message });
            console.error('Product Categories sync failed:', error.message);
            throw error;
        }
    }

    /**
     * Sync Products
     * @returns {Promise<Object>} - Sync result
     */
    async syncProducts() {
        try {
            smartLogger.info('Starting Products sync');
            console.log('Starting Products sync');
            
            const erpData = await this.fetchFromERP('api/sync/products');
            
            let created = 0;
            let updated = 0;
            let inactivated = 0;
            let errors = 0;

            // Step 1: Mark all existing products as inactive
            console.log('Marking all existing products as inactive...');
            const inactivateResult = await Product.updateMany(
                {}, // All documents
                { isActive: false }
            );
            inactivated = inactivateResult.modifiedCount;
            console.log(`Marked ${inactivated} existing products as inactive`);

            // Step 2: Process products from ERP data
            for (const erpProduct of erpData) {
                try {
                    // Parse dimension string to array
                    let dimensionFields = [];
                    if (erpProduct.dimension) {
                        try {
                            const dimensionArray = JSON.parse(erpProduct.dimension);
                            dimensionFields = dimensionArray.map(dim => ({
                                name: dim,
                                unit: 'inches',
                                isRequired: true,
                                minValue: 0
                            }));
                        } catch (parseError) {
                            console.warn(`Failed to parse dimensions for product ${erpProduct.name}:`, parseError.message);
                            // Default dimensions
                            dimensionFields = [
                                { name: 'L', unit: 'inches', isRequired: true, minValue: 0 },
                                { name: 'W', unit: 'inches', isRequired: true, minValue: 0 },
                                { name: 'H', unit: 'inches', isRequired: true, minValue: 0 }
                            ];
                        }
                    }

                    // Find category by ERP ID
                    const category = await ProductCategory.findOne({ 
                        erp_id: parseInt(erpProduct.product_category_id),
                        isActive: true
                    });

                    if (!category) {
                        smartLogger.warn(`Category not found for product: ${erpProduct.name} (ERP Category ID: ${erpProduct.product_category_id})`);
                        console.warn(`Category not found for product: ${erpProduct.name} (ERP Category ID: ${erpProduct.product_category_id})`);
                        errors++;
                        continue;
                    }

                    // Map ERP data to our model structure
                    const productData = {
                        erp_id: parseInt(erpProduct.id),
                        name: erpProduct.name,
                        categoryId: category._id,
                        erp_category_id: parseInt(erpProduct.product_category_id),
                        description: erpProduct.description || '',
                        basePrice: parseFloat(erpProduct.base_price || erpProduct.price || 0),
                        dimensionFields: dimensionFields,
                        isActive: true, // Always set new/updated records as active
                        sortOrder: parseInt(erpProduct.sort_order || erpProduct.id || 0),
                        imageUrl: erpProduct.image || erpProduct.image_url || ''
                    };

                    // Check if product exists by erp_id (primary match) or name (fallback)
                    const existingProduct = await Product.findOne({ 
                        $or: [
                            { erp_id: productData.erp_id },
                            { name: productData.name, categoryId: category._id }
                        ]
                    });

                    if (existingProduct) {
                        // Update existing product and reactivate it
                        await Product.findByIdAndUpdate(
                            existingProduct._id,
                            productData,
                            { new: true }
                        );
                        updated++;
                        smartLogger.debug(`Updated and reactivated product: ${productData.name} (ERP ID: ${productData.erp_id})`);
                        console.log(`Updated and reactivated product: ${productData.name} (ERP ID: ${productData.erp_id}, Category: ${category.name}, Dimensions: ${dimensionFields.map(d => d.name).join(', ')})`);
                    } else {
                        // Create new product
                        await Product.create(productData);
                        created++;
                        smartLogger.debug(`Created new product: ${productData.name} (ERP ID: ${productData.erp_id})`);
                        console.log(`Created new product: ${productData.name} (ERP ID: ${productData.erp_id}, Category: ${category.name}, Dimensions: ${dimensionFields.map(d => d.name).join(', ')})`);
                    }
                    
                } catch (itemError) {
                    errors++;
                    smartLogger.error(`Error processing product: ${erpProduct.name} (ID: ${erpProduct.id})`, { error: itemError.message });
                    console.error(`Error processing product: ${erpProduct.name} (ID: ${erpProduct.id})`, itemError.message);
                }
            }

            // Step 3: Count final statistics
            const totalActive = await Product.countDocuments({ isActive: true });
            const totalInactive = await Product.countDocuments({ isActive: false });

            const result = {
                table: 'products',
                total: erpData.length,
                created,
                updated,
                inactivated,
                errors,
                finalCounts: {
                    active: totalActive,
                    inactive: totalInactive,
                    total: totalActive + totalInactive
                },
                timestamp: new Date().toISOString()
            };

            smartLogger.info('Products sync completed', result);
            console.log('Products sync completed:', result);
            
            return result;
        } catch (error) {
            smartLogger.error('Products sync failed', { error: error.message });
            console.error('Products sync failed:', error.message);
            throw error;
        }
    }

    /**
     * Sync Materials
     * @returns {Promise<Object>} - Sync result
     */
    async syncMaterials() {
        try {
            smartLogger.info('Starting Materials sync');
            console.log('Starting Materials sync');
            
            const erpData = await this.fetchFromERP('api/sync/materials');
            
            let created = 0;
            let updated = 0;
            let inactivated = 0;
            let errors = 0;

            // Step 1: Mark all existing materials as inactive
            console.log('Marking all existing materials as inactive...');
            const inactivateResult = await Material.updateMany(
                {}, // All documents
                { isActive: false }
            );
            inactivated = inactivateResult.modifiedCount;
            console.log(`Marked ${inactivated} existing materials as inactive`);

            // Step 2: Process materials from ERP data
            for (const erpMaterial of erpData) {
                try {
                    // Find category by ERP ID
                    const category = await ProductCategory.findOne({ 
                        erp_id: parseInt(erpMaterial.product_category_id),
                        isActive: true
                    });

                    if (!category) {
                        smartLogger.warn(`Category not found for material: ${erpMaterial.name} (ERP Category ID: ${erpMaterial.product_category_id})`);
                        console.warn(`Category not found for material: ${erpMaterial.name} (ERP Category ID: ${erpMaterial.product_category_id})`);
                        errors++;
                        continue;
                    }

                    // Map ERP data to our model structure
                    const materialData = {
                        erp_id: parseInt(erpMaterial.id),
                        name: erpMaterial.name,
                        categoryId: category._id,
                        erp_category_id: parseInt(erpMaterial.product_category_id),
                        description: erpMaterial.description || '',
                        pricePerUnit: parseFloat(erpMaterial.price_per_unit || erpMaterial.price || 0),
                        unit: erpMaterial.unit || 'piece',
                        thickness: erpMaterial.thickness || '',
                        specifications: erpMaterial.specifications || [],
                        isActive: true, // Always set new/updated records as active
                        sortOrder: parseInt(erpMaterial.sort_order || erpMaterial.id || 0)
                    };

                    // Check if material exists by erp_id (primary match) or name (fallback)
                    const existingMaterial = await Material.findOne({ 
                        $or: [
                            { erp_id: materialData.erp_id },
                            { name: materialData.name, categoryId: category._id }
                        ]
                    });

                    if (existingMaterial) {
                        // Update existing material and reactivate it
                        await Material.findByIdAndUpdate(
                            existingMaterial._id,
                            materialData,
                            { new: true }
                        );
                        updated++;
                        smartLogger.debug(`Updated and reactivated material: ${materialData.name} (ERP ID: ${materialData.erp_id})`);
                        console.log(`Updated and reactivated material: ${materialData.name} (ERP ID: ${materialData.erp_id}, Category: ${category.name})`);
                    } else {
                        // Create new material
                        await Material.create(materialData);
                        created++;
                        smartLogger.debug(`Created new material: ${materialData.name} (ERP ID: ${materialData.erp_id})`);
                        console.log(`Created new material: ${materialData.name} (ERP ID: ${materialData.erp_id}, Category: ${category.name})`);
                    }
                    
                } catch (itemError) {
                    errors++;
                    smartLogger.error(`Error processing material: ${erpMaterial.name} (ID: ${erpMaterial.id})`, { error: itemError.message });
                    console.error(`Error processing material: ${erpMaterial.name} (ID: ${erpMaterial.id})`, itemError.message);
                }
            }

            // Step 3: Count final statistics
            const totalActive = await Material.countDocuments({ isActive: true });
            const totalInactive = await Material.countDocuments({ isActive: false });

            const result = {
                table: 'materials',
                total: erpData.length,
                created,
                updated,
                inactivated,
                errors,
                finalCounts: {
                    active: totalActive,
                    inactive: totalInactive,
                    total: totalActive + totalInactive
                },
                timestamp: new Date().toISOString()
            };

            smartLogger.info('Materials sync completed', result);
            console.log('Materials sync completed:', result);
            
            return result;
        } catch (error) {
            smartLogger.error('Materials sync failed', { error: error.message });
            console.error('Materials sync failed:', error.message);
            throw error;
        }
    }

    /**
     * Sync Finishes
     * @returns {Promise<Object>} - Sync result
     */
    async syncFinishes() {
        try {
            smartLogger.info('Starting Finishes sync');
            console.log('Starting Finishes sync');
            
            const erpData = await this.fetchFromERP('api/sync/finishes');
            
            let created = 0;
            let updated = 0;
            let inactivated = 0;
            let errors = 0;

            // Step 1: Mark all existing finishes as inactive
            console.log('Marking all existing finishes as inactive...');
            const inactivateResult = await ProductFinish.updateMany(
                {}, // All documents
                { isActive: false }
            );
            inactivated = inactivateResult.modifiedCount;
            console.log(`Marked ${inactivated} existing finishes as inactive`);

            // Step 2: Process finishes from ERP data
            for (const erpFinish of erpData) {
                try {
                    // Find product category by ERP ID
                    const productCategory = await ProductCategory.findOne({ 
                        erp_id: parseInt(erpFinish.product_category_id),
                        isActive: true
                    });

                    if (!productCategory) {
                        smartLogger.warn(`Product category not found for finish: ${erpFinish.name} (ERP Category ID: ${erpFinish.product_category_id})`);
                        console.warn(`Product category not found for finish: ${erpFinish.name} (ERP Category ID: ${erpFinish.product_category_id})`);
                        errors++;
                        continue;
                    }

                    // Map ERP data to our model structure
                    const finishData = {
                        erp_id: parseInt(erpFinish.id),
                        name: erpFinish.name,
                        productCategoryId: productCategory._id,
                        erp_product_category_id: parseInt(erpFinish.product_category_id),
                        description: erpFinish.description || '',
                        attribute: erpFinish.attribute || '',
                        isActive: true, // Always set new/updated records as active
                        sortOrder: parseInt(erpFinish.sort_order || erpFinish.id || 0),
                        imageUrl: erpFinish.image_url || erpFinish.imageUrl || ''
                    };

                    // Check if finish exists by erp_id (primary match) or name (fallback)
                    const existingFinish = await ProductFinish.findOne({ 
                        $or: [
                            { erp_id: finishData.erp_id },
                            { name: finishData.name, productCategoryId: productCategory._id }
                        ]
                    });

                    if (existingFinish) {
                        // Update existing finish and reactivate it
                        await ProductFinish.findByIdAndUpdate(
                            existingFinish._id,
                            finishData,
                            { new: true }
                        );
                        updated++;
                        smartLogger.debug(`Updated and reactivated finish: ${finishData.name} (ERP ID: ${finishData.erp_id})`);
                        console.log(`Updated and reactivated finish: ${finishData.name} (ERP ID: ${finishData.erp_id}, Product Category: ${productCategory.name})`);
                    } else {
                        // Create new finish
                        await ProductFinish.create(finishData);
                        created++;
                        smartLogger.debug(`Created new finish: ${finishData.name} (ERP ID: ${finishData.erp_id})`);
                        console.log(`Created new finish: ${finishData.name} (ERP ID: ${finishData.erp_id}, Product Category: ${productCategory.name})`);
                    }
                    
                } catch (itemError) {
                    errors++;
                    smartLogger.error(`Error processing finish: ${erpFinish.name} (ID: ${erpFinish.id})`, { error: itemError.message });
                    console.error(`Error processing finish: ${erpFinish.name} (ID: ${erpFinish.id})`, itemError.message);
                }
            }

            // Step 3: Count final statistics
            const totalActive = await ProductFinish.countDocuments({ isActive: true });
            const totalInactive = await ProductFinish.countDocuments({ isActive: false });

            const result = {
                table: 'finishes',
                total: erpData.length,
                created,
                updated,
                inactivated,
                errors,
                finalCounts: {
                    active: totalActive,
                    inactive: totalInactive,
                    total: totalActive + totalInactive
                },
                timestamp: new Date().toISOString()
            };

            smartLogger.info('Finishes sync completed', result);
            console.log('Finishes sync completed:', result);
            
            return result;
        } catch (error) {
            smartLogger.error('Finishes sync failed', { error: error.message });
            console.error('Finishes sync failed:', error.message);
            throw error;
        }
    }

    /**
     * Sync all tables
     * @returns {Promise<Object>} - Combined sync result
     */
    async syncAll() {
        try {
            smartLogger.info('Starting full ERP sync');
            console.log('Starting full ERP sync');
            
            const startTime = Date.now();
            const results = {};

            // Sync in order (categories first, then dependent tables)
            results.productCategories = await this.syncProductCategories();
            results.products = await this.syncProducts();
            results.materials = await this.syncMaterials();
            results.finishes = await this.syncFinishes();

            const totalTime = Date.now() - startTime;
            
            const summary = {
                success: true,
                totalTime: `${totalTime}ms`,
                results,
                summary: {
                    totalRecords: Object.values(results).reduce((sum, r) => sum + r.total, 0),
                    totalCreated: Object.values(results).reduce((sum, r) => sum + r.created, 0),
                    totalUpdated: Object.values(results).reduce((sum, r) => sum + r.updated, 0),
                    totalErrors: Object.values(results).reduce((sum, r) => sum + r.errors, 0)
                },
                timestamp: new Date().toISOString()
            };

            smartLogger.info('Full ERP sync completed', summary);
            console.log('Full ERP sync completed:', summary);
            
            return summary;
        } catch (error) {
            smartLogger.error('Full ERP sync failed', { error: error.message });
            console.error('Full ERP sync failed:', error.message);
            throw error;
        }
    }

    /**
     * Get sync status
     * @returns {Promise<Object>} - Sync status information
     */
    async getSyncStatus() {
        try {
            const status = {
                erpApiConfigured: !!(this.erpApiBaseUrl && this.erpApiToken),
                lastSync: null, // TODO: Store this in database
                tables: {
                    productCategories: {
                        total: await ProductCategory.countDocuments(),
                        active: await ProductCategory.countDocuments({ isActive: true }),
                        inactive: await ProductCategory.countDocuments({ isActive: false })
                    },
                    products: {
                        total: await Product.countDocuments(),
                        active: await Product.countDocuments({ isActive: true }),
                        inactive: await Product.countDocuments({ isActive: false })
                    },
                    materials: {
                        total: await Material.countDocuments(),
                        active: await Material.countDocuments({ isActive: true }),
                        inactive: await Material.countDocuments({ isActive: false })
                    },
                    finishes: {
                        total: await ProductFinish.countDocuments(),
                        active: await ProductFinish.countDocuments({ isActive: true }),
                        inactive: await ProductFinish.countDocuments({ isActive: false })
                    }
                },
                timestamp: new Date().toISOString()
            };

            return status;
        } catch (error) {
            smartLogger.error('Error getting sync status', { error: error.message });
            console.error('Error getting sync status:', error.message);
            throw error;
        }
    }

    /**
     * Get only active product categories
     * @returns {Promise<Array>} - Array of active categories
     */
    async getActiveProductCategories() {
        try {
            return await ProductCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            smartLogger.error('Error getting active product categories', { error: error.message });
            console.error('Error getting active product categories:', error.message);
            throw error;
        }
    }

    /**
     * Find category by ERP ID
     * @param {number} erpId - ERP ID to search for
     * @returns {Promise<Object|null>} - Category object or null
     */
    async findCategoryByErpId(erpId) {
        try {
            return await ProductCategory.findOne({ erp_id: parseInt(erpId) });
        } catch (error) {
            smartLogger.error('Error finding category by ERP ID', { error: error.message, erpId });
            console.error('Error finding category by ERP ID:', error.message, 'ERP ID:', erpId);
            throw error;
        }
    }

    /**
     * Find product by ERP ID
     * @param {number} erpId - ERP ID to search for
     * @returns {Promise<Object|null>} - Product object or null
     */
    async findProductByErpId(erpId) {
        try {
            return await Product.findOne({ erp_id: parseInt(erpId) })
                .populate('categoryId');
        } catch (error) {
            smartLogger.error('Error finding product by ERP ID', { error: error.message, erpId });
            console.error('Error finding product by ERP ID:', error.message, 'ERP ID:', erpId);
            throw error;
        }
    }

    /**
     * Get only active products
     * @returns {Promise<Array>} - Array of active products
     */
    async getActiveProducts() {
        try {
            return await Product.find({ isActive: true })
                .populate('categoryId')
                .sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            smartLogger.error('Error getting active products', { error: error.message });
            console.error('Error getting active products:', error.message);
            throw error;
        }
    }

    /**
     * Get products by category ERP ID
     * @param {number} categoryErpId - Category ERP ID
     * @returns {Promise<Array>} - Array of products in category
     */
    async getProductsByCategoryErpId(categoryErpId) {
        try {
            return await Product.find({ 
                erp_category_id: parseInt(categoryErpId),
                isActive: true 
            }).populate('categoryId').sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            smartLogger.error('Error getting products by category ERP ID', { error: error.message, categoryErpId });
            console.error('Error getting products by category ERP ID:', error.message, 'Category ERP ID:', categoryErpId);
            throw error;
        }
    }

    /**
     * Find material by ERP ID
     * @param {number} erpId - ERP ID to search for
     * @returns {Promise<Object|null>} - Material object or null
     */
    async findMaterialByErpId(erpId) {
        try {
            return await Material.findOne({ erp_id: parseInt(erpId) }).populate('categoryId');
        } catch (error) {
            smartLogger.error('Error finding material by ERP ID', { error: error.message, erpId });
            console.error('Error finding material by ERP ID:', error.message, 'ERP ID:', erpId);
            throw error;
        }
    }

    /**
     * Get only active materials
     * @returns {Promise<Array>} - Array of active materials
     */
    async getActiveMaterials() {
        try {
            return await Material.find({ isActive: true })
                .populate('categoryId')
                .sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            smartLogger.error('Error getting active materials', { error: error.message });
            console.error('Error getting active materials:', error.message);
            throw error;
        }
    }

    /**
     * Get materials by category ERP ID
     * @param {number} categoryErpId - Category ERP ID
     * @returns {Promise<Array>} - Array of materials in category
     */
    async getMaterialsByCategoryErpId(categoryErpId) {
        try {
            return await Material.find({ 
                erp_category_id: parseInt(categoryErpId),
                isActive: true 
            }).populate('categoryId').sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            smartLogger.error('Error getting materials by category ERP ID', { error: error.message, categoryErpId });
            console.error('Error getting materials by category ERP ID:', error.message, 'Category ERP ID:', categoryErpId);
            throw error;
        }
    }

    /**
     * Find finish by ERP ID
     * @param {number} erpId - ERP ID to search for
     * @returns {Promise<Object|null>} - Finish object or null
     */
    async findFinishByErpId(erpId) {
        try {
            return await ProductFinish.findOne({ erp_id: parseInt(erpId) })
                .populate('productCategoryId');
        } catch (error) {
            smartLogger.error('Error finding finish by ERP ID', { error: error.message, erpId });
            console.error('Error finding finish by ERP ID:', error.message, 'ERP ID:', erpId);
            throw error;
        }
    }

    /**
     * Get only active finishes
     * @returns {Promise<Array>} - Array of active finishes
     */
    async getActiveFinishes() {
        try {
            return await ProductFinish.find({ isActive: true })
                .populate('productCategoryId')
                .sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            smartLogger.error('Error getting active finishes', { error: error.message });
            console.error('Error getting active finishes:', error.message);
            throw error;
        }
    }

    /**
     * Get finishes by product category ERP ID
     * @param {number} categoryErpId - Product Category ERP ID
     * @returns {Promise<Array>} - Array of finishes for product category
     */
    async getFinishesByProductCategoryErpId(categoryErpId) {
        try {
            return await ProductFinish.find({ 
                erp_product_category_id: parseInt(categoryErpId),
                isActive: true 
            }).populate('productCategoryId').sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            smartLogger.error('Error getting finishes by product category ERP ID', { error: error.message, categoryErpId });
            console.error('Error getting finishes by product category ERP ID:', error.message, 'Category ERP ID:', categoryErpId);
            throw error;
        }
    }

    /**
     * Get category mapping (ERP ID to MongoDB ID)
     * @returns {Promise<Object>} - Mapping object { erpId: mongoId }
     */
    async getCategoryMapping() {
        try {
            const categories = await ProductCategory.find({ isActive: true }, { erp_id: 1, _id: 1 });
            const mapping = {};
            categories.forEach(cat => {
                mapping[cat.erp_id] = cat._id.toString();
            });
            return mapping;
        } catch (error) {
            smartLogger.error('Error getting category mapping', { error: error.message });
            console.error('Error getting category mapping:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup inactive records older than specified days
     * @param {number} daysOld - Number of days old to cleanup (default: 30)
     * @returns {Promise<Object>} - Cleanup result
     */
    async cleanupInactiveRecords(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const cleanupResult = await ProductCategory.deleteMany({
                isActive: false,
                updatedAt: { $lt: cutoffDate }
            });

            smartLogger.info(`Cleaned up ${cleanupResult.deletedCount} inactive categories older than ${daysOld} days`);
            console.log(`Cleaned up ${cleanupResult.deletedCount} inactive categories older than ${daysOld} days`);

            return {
                success: true,
                deletedCount: cleanupResult.deletedCount,
                cutoffDate: cutoffDate.toISOString(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            smartLogger.error('Error during cleanup', { error: error.message });
            console.error('Error during cleanup:', error.message);
            throw error;
        }
    }
}

// Create singleton instance
const erpSyncService = new ERPSyncService();

export default erpSyncService;
