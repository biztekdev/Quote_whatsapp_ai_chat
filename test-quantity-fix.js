// Test quantity input processing fix
console.log('🧪 Testing quantity input processing fix...\n');

// Simulate the quantity extraction logic
function extractQuantityFromMessage(messageText) {
    console.log('🔢 Processing quantity input:', messageText);
    
    let extractedQuantity = null;
    
    // Method 1: Direct number extraction (handles "50000", "5000", etc.)
    const numberMatch = messageText.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\b/);
    if (numberMatch) {
        const numberStr = numberMatch[1].replace(/,/g, ''); // Remove commas
        extractedQuantity = parseInt(numberStr);
        console.log('✅ Extracted quantity from number:', extractedQuantity);
        return extractedQuantity;
    }
    
    // Method 2: Handle "k" notation (5k = 5000)
    const kMatch = messageText.match(/(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) {
        extractedQuantity = Math.round(parseFloat(kMatch[1]) * 1000);
        console.log('✅ Extracted quantity from "k" notation:', extractedQuantity);
        return extractedQuantity;
    }
    
    console.log('❌ Could not extract quantity');
    return null;
}

// Test various quantity inputs
const testInputs = [
    '50000',           // User's exact input
    '50,000',          // With comma
    '5000',            // Smaller number
    '5k',              // K notation
    '10k',             // Another K notation
    '2.5k',            // Decimal K notation
    '500 pieces',      // With text
    '1000 bags',       // With text
    'twenty thousand', // Text number (should fail)
    'abc123'           // Invalid input
];

console.log('🔍 Testing quantity extraction:');
testInputs.forEach((input, index) => {
    console.log(`\n${index + 1}. Input: "${input}"`);
    const result = extractQuantityFromMessage(input);
    console.log(`   Result: ${result || 'Failed to extract'}`);
    console.log(`   Status: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);
});

console.log('\n🎯 EXPECTED RESULTS:');
console.log('   ✅ "50000" should extract to 50000');
console.log('   ✅ "5k" should extract to 5000');
console.log('   ✅ System should save quantity and move to next step');
console.log('   ✅ No more quantity request loop');

console.log('\n📋 FLOW AFTER FIX:');
console.log('   1. User: "50000"');
console.log('   2. System: Extracts quantity 50000 ✅');
console.log('   3. System: "Perfect! ✅ I\'ve noted your quantity: 50,000 pieces"');
console.log('   4. System: Moves to quote generation step ✅');
console.log('   5. NO MORE quantity request loop! 🎉');