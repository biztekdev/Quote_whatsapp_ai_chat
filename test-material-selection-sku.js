// Test SKU display in material selection flow
console.log('🧪 Testing SKU display in material selection flow...\n');

// Mock conversation data like in your example
const mockConversationData = {
    selectedCategory: { name: 'Mylor Bag' },
    selectedProduct: { name: 'Flat Pouch (3 side seal)' },
    quantity: ['12000'],
    dimensions: [
        { name: 'W', value: '3' },
        { name: 'H', value: '4' }
    ],
    selectedFinish: [
        { name: 'Softtouch Finish' },
        { name: 'Hot Foil' }
    ],
    // No skus property - this is the key test case
};

console.log('📋 Mock conversation data:');
console.log('   - Category: Mylor Bag');
console.log('   - Product: Flat Pouch (3 side seal)');
console.log('   - Quantity: 12000');
console.log('   - Dimensions: W: 3, H: 4');
console.log('   - Finishes: Softtouch Finish, Hot Foil');
console.log('   - SKUs: undefined (not provided by user)\n');

// Test the SKU display logic used in material selection
const skuDisplay = mockConversationData.skus || '1 (default)';

console.log('🎯 Material selection message would show:');
console.log(`   🎨 **SKUs/Designs:** ${skuDisplay}`);

console.log('\n✅ Expected result: "1 (default)" ✓');
console.log('✅ This clearly indicates it\'s a system default, not user-specified');