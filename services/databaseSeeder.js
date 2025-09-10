import { 
    User, 
    ProductCategory, 
    Product, 
    Material, 
    FinishCategory, 
    ProductFinish 
} from '../models/index.js';

export class DatabaseSeeder {
    
    static async seedAll() {
        console.log('🌱 Starting database seeding...');
        
        try {
            await this.seedProductCategories();
            await this.seedFinishCategories();
            await this.seedProducts();
            await this.seedMaterials();
            await this.seedProductFinishes();
            
            console.log('✅ Database seeding completed successfully!');
        } catch (error) {
            console.error('❌ Database seeding failed:', error);
            throw error;
        }
    }
    
    static async seedProductCategories() {
        console.log('📦 Seeding product categories...');
        
        const categories = [
            {
                name: 'Mylar Bags',
                description: 'High-quality mylar bags for food storage and packaging',
                sortOrder: 1
            },
            {
                name: 'Stand Up Pouches',
                description: 'Stand up pouches with various closure options',
                sortOrder: 2
            },
            {
                name: 'Flat Pouches',
                description: 'Flat pouches for lightweight packaging',
                sortOrder: 3
            },
            {
                name: 'Gusseted Bags',
                description: 'Expandable bags with side or bottom gussets',
                sortOrder: 4
            }
        ];
        
        for (const category of categories) {
            await ProductCategory.findOneAndUpdate(
                { name: category.name },
                category,
                { upsert: true, new: true }
            );
        }
        
        console.log('✅ Product categories seeded');
    }
    
    static async seedFinishCategories() {
        console.log('🎨 Seeding finish categories...');
        
        const finishCategories = [
            {
                name: 'Printing',
                description: 'Custom printing and graphics options',
                sortOrder: 1
            },
            {
                name: 'Lamination',
                description: 'Protective lamination finishes',
                sortOrder: 2
            },
            {
                name: 'Coating',
                description: 'Special coating treatments',
                sortOrder: 3
            },
            {
                name: 'Embossing',
                description: 'Textural embossing effects',
                sortOrder: 4
            }
        ];
        
        for (const category of finishCategories) {
            await FinishCategory.findOneAndUpdate(
                { name: category.name },
                category,
                { upsert: true, new: true }
            );
        }
        
        console.log('✅ Finish categories seeded');
    }
    
    static async seedProducts() {
        console.log('🛍️ Seeding products...');
        
        const mylarCategory = await ProductCategory.findOne({ name: 'Mylar Bags' });
        const standUpCategory = await ProductCategory.findOne({ name: 'Stand Up Pouches' });
        const flatCategory = await ProductCategory.findOne({ name: 'Flat Pouches' });
        const gussetedCategory = await ProductCategory.findOne({ name: 'Gusseted Bags' });
        
        const products = [
            // Mylar Bags
            {
                name: 'Standard Mylar Bag',
                categoryId: mylarCategory._id,
                description: 'Basic mylar bag for general storage',
                basePrice: 0.15,
                dimensionFields: [
                    { name: 'Length', unit: 'inches', isRequired: true, minValue: 1, maxValue: 24 },
                    { name: 'Width', unit: 'inches', isRequired: true, minValue: 1, maxValue: 18 }
                ],
                sortOrder: 1
            },
            {
                name: 'Heat Sealable Mylar Bag',
                categoryId: mylarCategory._id,
                description: 'Heat sealable mylar bag with enhanced barrier properties',
                basePrice: 0.22,
                dimensionFields: [
                    { name: 'Length', unit: 'inches', isRequired: true, minValue: 2, maxValue: 30 },
                    { name: 'Width', unit: 'inches', isRequired: true, minValue: 2, maxValue: 20 }
                ],
                sortOrder: 2
            },
            {
                name: 'Ziplock Mylar Bag',
                categoryId: mylarCategory._id,
                description: 'Resealable mylar bag with ziplock closure',
                basePrice: 0.28,
                dimensionFields: [
                    { name: 'Length', unit: 'inches', isRequired: true, minValue: 3, maxValue: 16 },
                    { name: 'Width', unit: 'inches', isRequired: true, minValue: 2, maxValue: 12 }
                ],
                sortOrder: 3
            },
            
            // Stand Up Pouches
            {
                name: 'Basic Stand Up Pouch',
                categoryId: standUpCategory._id,
                description: 'Stand up pouch with bottom gusset',
                basePrice: 0.35,
                dimensionFields: [
                    { name: 'Height', unit: 'inches', isRequired: true, minValue: 4, maxValue: 20 },
                    { name: 'Width', unit: 'inches', isRequired: true, minValue: 3, maxValue: 14 },
                    { name: 'Gusset', unit: 'inches', isRequired: true, minValue: 1, maxValue: 6 }
                ],
                sortOrder: 1
            },
            {
                name: 'Spout Pouch',
                categoryId: standUpCategory._id,
                description: 'Stand up pouch with spout for liquids',
                basePrice: 0.65,
                dimensionFields: [
                    { name: 'Height', unit: 'inches', isRequired: true, minValue: 5, maxValue: 18 },
                    { name: 'Width', unit: 'inches', isRequired: true, minValue: 4, maxValue: 12 },
                    { name: 'Gusset', unit: 'inches', isRequired: true, minValue: 2, maxValue: 5 },
                    { name: 'Spout Diameter', unit: 'mm', isRequired: true, minValue: 10, maxValue: 25 }
                ],
                sortOrder: 2
            },
            
            // Flat Pouches
            {
                name: 'Three Side Seal Pouch',
                categoryId: flatCategory._id,
                description: 'Flat pouch with three side seals',
                basePrice: 0.12,
                dimensionFields: [
                    { name: 'Length', unit: 'inches', isRequired: true, minValue: 2, maxValue: 16 },
                    { name: 'Width', unit: 'inches', isRequired: true, minValue: 1.5, maxValue: 12 }
                ],
                sortOrder: 1
            },
            
            // Gusseted Bags
            {
                name: 'Side Gusset Bag',
                categoryId: gussetedCategory._id,
                description: 'Bag with expandable side gussets',
                basePrice: 0.25,
                dimensionFields: [
                    { name: 'Length', unit: 'inches', isRequired: true, minValue: 4, maxValue: 24 },
                    { name: 'Width', unit: 'inches', isRequired: true, minValue: 3, maxValue: 16 },
                    { name: 'Gusset', unit: 'inches', isRequired: true, minValue: 1, maxValue: 8 }
                ],
                sortOrder: 1
            }
        ];
        
        for (const product of products) {
            await Product.findOneAndUpdate(
                { name: product.name, categoryId: product.categoryId },
                product,
                { upsert: true, new: true }
            );
        }
        
        console.log('✅ Products seeded');
    }
    
    static async seedMaterials() {
        console.log('🧱 Seeding materials...');
        
        const mylarCategory = await ProductCategory.findOne({ name: 'Mylar Bags' });
        const standUpCategory = await ProductCategory.findOne({ name: 'Stand Up Pouches' });
        const flatCategory = await ProductCategory.findOne({ name: 'Flat Pouches' });
        const gussetedCategory = await ProductCategory.findOne({ name: 'Gusseted Bags' });
        
        const materials = [
            // Mylar Bag Materials
            {
                name: '3.5 Mil Clear Mylar',
                categoryId: mylarCategory._id,
                description: 'Standard thickness clear mylar film',
                pricePerUnit: 0.08,
                unit: 'sq inch',
                thickness: '3.5 mil',
                specifications: [
                    { property: 'Opacity', value: 'Clear' },
                    { property: 'Barrier Level', value: 'Standard' }
                ],
                sortOrder: 1
            },
            {
                name: '5 Mil Clear Mylar',
                categoryId: mylarCategory._id,
                description: 'Heavy duty clear mylar film',
                pricePerUnit: 0.12,
                unit: 'sq inch',
                thickness: '5 mil',
                specifications: [
                    { property: 'Opacity', value: 'Clear' },
                    { property: 'Barrier Level', value: 'High' }
                ],
                sortOrder: 2
            },
            {
                name: '7 Mil Metallized Mylar',
                categoryId: mylarCategory._id,
                description: 'Premium metallized mylar with excellent barrier',
                pricePerUnit: 0.18,
                unit: 'sq inch',
                thickness: '7 mil',
                specifications: [
                    { property: 'Opacity', value: 'Metallized' },
                    { property: 'Barrier Level', value: 'Premium' },
                    { property: 'Light Protection', value: 'Excellent' }
                ],
                sortOrder: 3
            },
            
            // Stand Up Pouch Materials
            {
                name: 'Laminated PET/PE',
                categoryId: standUpCategory._id,
                description: 'Multi-layer laminate for stand up pouches',
                pricePerUnit: 0.15,
                unit: 'sq inch',
                thickness: '4 mil',
                specifications: [
                    { property: 'Structure', value: 'PET/PE Laminate' },
                    { property: 'Barrier Level', value: 'High' },
                    { property: 'Printability', value: 'Excellent' }
                ],
                sortOrder: 1
            },
            {
                name: 'Foil Laminate',
                categoryId: standUpCategory._id,
                description: 'Aluminum foil laminate for maximum barrier',
                pricePerUnit: 0.25,
                unit: 'sq inch',
                thickness: '5 mil',
                specifications: [
                    { property: 'Structure', value: 'PET/Foil/PE' },
                    { property: 'Barrier Level', value: 'Maximum' },
                    { property: 'Light Protection', value: 'Complete' }
                ],
                sortOrder: 2
            },
            
            // Flat Pouch Materials
            {
                name: 'BOPP/CPP Laminate',
                categoryId: flatCategory._id,
                description: 'Clear laminate for flat pouches',
                pricePerUnit: 0.06,
                unit: 'sq inch',
                thickness: '2.5 mil',
                specifications: [
                    { property: 'Structure', value: 'BOPP/CPP' },
                    { property: 'Opacity', value: 'Clear' },
                    { property: 'Sealability', value: 'Excellent' }
                ],
                sortOrder: 1
            },
            
            // Gusseted Bag Materials
            {
                name: 'Paper/PE Laminate',
                categoryId: gussetedCategory._id,
                description: 'Eco-friendly paper laminate',
                pricePerUnit: 0.10,
                unit: 'sq inch',
                thickness: '3 mil',
                specifications: [
                    { property: 'Structure', value: 'Paper/PE' },
                    { property: 'Sustainability', value: 'Recyclable' },
                    { property: 'Appearance', value: 'Natural' }
                ],
                sortOrder: 1
            }
        ];
        
        for (const material of materials) {
            await Material.findOneAndUpdate(
                { name: material.name, categoryId: material.categoryId },
                material,
                { upsert: true, new: true }
            );
        }
        
        console.log('✅ Materials seeded');
    }
    
    static async seedProductFinishes() {
        console.log('✨ Seeding product finishes...');
        
        const printingCategory = await FinishCategory.findOne({ name: 'Printing' });
        const laminationCategory = await FinishCategory.findOne({ name: 'Lamination' });
        const coatingCategory = await FinishCategory.findOne({ name: 'Coating' });
        
        const mylarCategory = await ProductCategory.findOne({ name: 'Mylar Bags' });
        const standUpCategory = await ProductCategory.findOne({ name: 'Stand Up Pouches' });
        const flatCategory = await ProductCategory.findOne({ name: 'Flat Pouches' });
        const gussetedCategory = await ProductCategory.findOne({ name: 'Gusseted Bags' });
        
        const productFinishes = [
            // No Finish Option for all categories
            {
                name: 'No Finish',
                categoryId: printingCategory._id,
                productCategoryId: mylarCategory._id,
                description: 'Plain product without additional finishing',
                priceType: 'fixed',
                price: 0,
                processingTime: 'Standard',
                sortOrder: 1
            },
            {
                name: 'No Finish',
                categoryId: printingCategory._id,
                productCategoryId: standUpCategory._id,
                description: 'Plain product without additional finishing',
                priceType: 'fixed',
                price: 0,
                processingTime: 'Standard',
                sortOrder: 1
            },
            {
                name: 'No Finish',
                categoryId: printingCategory._id,
                productCategoryId: flatCategory._id,
                description: 'Plain product without additional finishing',
                priceType: 'fixed',
                price: 0,
                processingTime: 'Standard',
                sortOrder: 1
            },
            {
                name: 'No Finish',
                categoryId: printingCategory._id,
                productCategoryId: gussetedCategory._id,
                description: 'Plain product without additional finishing',
                priceType: 'fixed',
                price: 0,
                processingTime: 'Standard',
                sortOrder: 1
            },
            
            // Printing Finishes for Mylar Bags
            {
                name: '1 Color Print',
                categoryId: printingCategory._id,
                productCategoryId: mylarCategory._id,
                description: 'Single color printing',
                priceType: 'per_unit',
                price: 0.05,
                unit: 'piece',
                processingTime: '3-5 business days',
                sortOrder: 2
            },
            {
                name: '2 Color Print',
                categoryId: printingCategory._id,
                productCategoryId: mylarCategory._id,
                description: 'Two color printing',
                priceType: 'per_unit',
                price: 0.08,
                unit: 'piece',
                processingTime: '3-5 business days',
                sortOrder: 3
            },
            {
                name: 'Full Color Print',
                categoryId: printingCategory._id,
                productCategoryId: mylarCategory._id,
                description: 'Full color CMYK printing',
                priceType: 'per_unit',
                price: 0.15,
                unit: 'piece',
                processingTime: '5-7 business days',
                sortOrder: 4
            },
            
            // Printing Finishes for Stand Up Pouches
            {
                name: '1 Color Print',
                categoryId: printingCategory._id,
                productCategoryId: standUpCategory._id,
                description: 'Single color printing',
                priceType: 'per_unit',
                price: 0.08,
                unit: 'piece',
                processingTime: '3-5 business days',
                sortOrder: 2
            },
            {
                name: 'Full Color Print',
                categoryId: printingCategory._id,
                productCategoryId: standUpCategory._id,
                description: 'Full color CMYK printing',
                priceType: 'per_unit',
                price: 0.25,
                unit: 'piece',
                processingTime: '5-7 business days',
                sortOrder: 3
            },
            
            // Lamination Finishes
            {
                name: 'Matte Lamination',
                categoryId: laminationCategory._id,
                productCategoryId: standUpCategory._id,
                description: 'Matte finish lamination',
                priceType: 'per_unit',
                price: 0.12,
                unit: 'piece',
                processingTime: '4-6 business days',
                sortOrder: 1
            },
            {
                name: 'Gloss Lamination',
                categoryId: laminationCategory._id,
                productCategoryId: standUpCategory._id,
                description: 'High gloss lamination',
                priceType: 'per_unit',
                price: 0.10,
                unit: 'piece',
                processingTime: '4-6 business days',
                sortOrder: 2
            },
            
            // Coating Finishes
            {
                name: 'UV Coating',
                categoryId: coatingCategory._id,
                productCategoryId: mylarCategory._id,
                description: 'UV protective coating',
                priceType: 'per_unit',
                price: 0.06,
                unit: 'piece',
                processingTime: '2-4 business days',
                sortOrder: 1
            }
        ];
        
        for (const finish of productFinishes) {
            await ProductFinish.findOneAndUpdate(
                { 
                    name: finish.name, 
                    categoryId: finish.categoryId,
                    productCategoryId: finish.productCategoryId 
                },
                finish,
                { upsert: true, new: true }
            );
        }
        
        console.log('✅ Product finishes seeded');
    }
    
    static async clearAllData() {
        console.log('🗑️ Clearing all data...');
        
        await User.deleteMany({});
        await ProductCategory.deleteMany({});
        await Product.deleteMany({});
        await Material.deleteMany({});
        await FinishCategory.deleteMany({});
        await ProductFinish.deleteMany({});
        
        console.log('✅ All data cleared');
    }
}
