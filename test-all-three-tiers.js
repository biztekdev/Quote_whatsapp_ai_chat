// Test the updated quote message with all three tiers
console.log('🧪 Testing updated quote message with all three tiers...\n');

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

// Simulate the new format with all three tiers
let pricingMessage = `🎯 *Quote Ready!*\n\n`;

// Product summary
pricingMessage += `📦 ${mockConversationData.selectedProduct?.name || 'Product'}\n`;
if (mockConversationData.selectedMaterial && mockConversationData.selectedMaterial.length > 0) {
    const materialsText = mockConversationData.selectedMaterial.map(m => m.name).join(', ');
    pricingMessage += `🧱 ${materialsText}\n`;
}
pricingMessage += `✨ ${mockConversationData.selectedFinish?.map(f => f.name).join(', ') || 'Standard'}\n`;
pricingMessage += `📏 ${mockConversationData.dimensions?.map(d => `${d.value}`).join(' x ') || 'Custom'}\n\n`;

// Show all pricing tiers
pricingMessage += `💰 *Pricing Options*\n`;
mockPricingData.qty.forEach((quantity, index) => {
    const unitPrice = mockPricingData.unit_cost[index];
    const totalPrice = (quantity * unitPrice).toFixed(2);
    
    // Mark best value (usually highest tier)
    const isBestValue = index === mockPricingData.qty.length - 1;
    const bestMark = isBestValue ? ' ⭐' : '';
    
    pricingMessage += `${quantity.toLocaleString()} pcs → $${unitPrice.toFixed(3)} each → *$${totalPrice}*${bestMark}\n`;
});
pricingMessage += `\n`;

// Simple PDF offer
pricingMessage += `📄 *Get PDF Quote?*\n`;
pricingMessage += `Reply "Yes" for detailed document`;

console.log('📱 NEW MESSAGE WITH ALL THREE TIERS:');
console.log('════════════════════════════════');
console.log(pricingMessage);
console.log('════════════════════════════════');

console.log('\n📊 BENEFITS OF THIS FORMAT:');
console.log('   ✅ Shows all pricing tiers clearly');
console.log('   ✅ Each line has: Quantity → Unit Price → Total');
console.log('   ✅ Star (⭐) marks the best value tier');
console.log('   ✅ Still compact and mobile-friendly');
console.log('   ✅ Easy to compare all options');
console.log('   ✅ Professional formatting');

console.log('\n🎯 MESSAGE LENGTH:');
console.log(`   Lines: ${pricingMessage.split('\n').length}`);
console.log(`   Characters: ${pricingMessage.length}`);
console.log('   Perfect for WhatsApp!');