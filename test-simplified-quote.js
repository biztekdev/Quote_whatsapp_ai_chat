// Test the simplified quote message format
console.log('🧪 Testing simplified quote message format...\n');

// Mock data similar to the user's example
const mockConversationData = {
    selectedProduct: { name: 'Flat Pouch (3 side seal)' },
    selectedMaterial: [{ name: 'PET + MPET + PE' }],
    selectedFinish: [{ name: 'Spot UV' }],
    dimensions: [
        { name: 'W', value: '3' },
        { name: 'H', value: '4' }
    ]
};

const mockPricingData = {
    qty: [12000, 24000, 48000],
    unit_cost: [0.108, 0.075, 0.056]
};

// Simulate the new simplified message format
let pricingMessage = `🎯 *Quote Ready!*\n\n`;

// Product summary
pricingMessage += `📦 ${mockConversationData.selectedProduct?.name || 'Product'}\n`;
if (mockConversationData.selectedMaterial && mockConversationData.selectedMaterial.length > 0) {
    const materialsText = mockConversationData.selectedMaterial.map(m => m.name).join(', ');
    pricingMessage += `🧱 ${materialsText}\n`;
}
pricingMessage += `✨ ${mockConversationData.selectedFinish?.map(f => f.name).join(', ') || 'Standard'}\n`;
pricingMessage += `📏 ${mockConversationData.dimensions?.map(d => `${d.value}`).join(' x ') || 'Custom'}\n\n`;

// Simplified pricing - show best value tier
const bestTierIndex = mockPricingData.qty.length - 1; // Last tier is usually best value
const bestQty = mockPricingData.qty[bestTierIndex];
const bestPrice = mockPricingData.unit_cost[bestTierIndex];
const bestTotal = (bestQty * bestPrice).toFixed(2);

pricingMessage += `💰 *Best Price*\n`;
pricingMessage += `${bestQty.toLocaleString()} pcs → $${bestPrice.toFixed(3)} each\n`;
pricingMessage += `💵 Total: *$${bestTotal}*\n\n`;

// Show other options if multiple tiers
if (mockPricingData.qty.length > 1) {
    pricingMessage += `📊 *Other Options*\n`;
    mockPricingData.qty.slice(0, -1).forEach((quantity, index) => {
        const unitPrice = mockPricingData.unit_cost[index];
        pricingMessage += `${quantity.toLocaleString()} pcs → $${unitPrice.toFixed(3)} each\n`;
    });
    pricingMessage += `\n`;
}

// Simple PDF offer
pricingMessage += `📄 *Get PDF Quote?*\n`;
pricingMessage += `Reply "Yes" for detailed document`;

console.log('📱 NEW SIMPLIFIED MESSAGE:');
console.log('════════════════════════════════');
console.log(pricingMessage);
console.log('════════════════════════════════');

console.log('\n📊 COMPARISON:');
console.log('');
console.log('❌ OLD MESSAGE:');
console.log('   - 47+ lines long');
console.log('   - Complex ASCII table');
console.log('   - Shows all tiers with totals');
console.log('   - Overwhelming amount of text');
console.log('   - Multiple bullet points');
console.log('');
console.log('✅ NEW MESSAGE:');
console.log('   - ~15 lines long');
console.log('   - Clean, simple format');
console.log('   - Highlights best price first');
console.log('   - Shows other options briefly');
console.log('   - Single clear call-to-action');
console.log('');
console.log('🎯 BENEFITS:');
console.log('   ✅ Much easier to read on mobile');
console.log('   ✅ Focuses on best value');
console.log('   ✅ Still shows all pricing options');
console.log('   ✅ Professional but concise');
console.log('   ✅ Clear next step (PDF request)');