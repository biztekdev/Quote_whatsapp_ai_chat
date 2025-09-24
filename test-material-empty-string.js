// Test empty string handling in material selection
console.log('🧪 Testing isLikelyMaterialSelectionMessage with empty string...\n');

// Mock the function logic
function isLikelyMaterialSelectionMessage(messageText) {
    const text = messageText.toLowerCase().trim();
    
    // Empty string is NOT a material selection - should ask for input
    if (text === '') {
        console.log('🔍 Empty string - NOT material selection, should ask for material');
        return false;
    }
    
    // Simple material names (likely material selection)
    if (text.length < 50 && !text.includes('quantity') && !text.includes('size') && !text.includes('design')) {
        console.log('🔍 Short message without quantity/size/design keywords - likely material selection');
        return true;
    }
    
    // Numeric selection (like "1", "2", "3" for material list)
    if (/^\d+$/.test(text)) {
        console.log('🔍 Numeric selection detected - likely material selection');
        return true;
    }
    
    // Contains material-specific keywords without other context
    const materialKeywords = ['pet', 'pe', 'kraft', 'alu', 'mpet', 'metallized', 'holographic', 'foil'];
    const hasOtherContext = text.includes('quantity') || text.includes('size') || text.includes('dimension') || 
                           text.includes('finish') || text.includes('design') || text.includes('pouch') ||
                           text.includes('bag') || text.includes('roll');
    
    if (materialKeywords.some(keyword => text.includes(keyword)) && !hasOtherContext) {
        console.log('🔍 Material keyword found without other context - likely material selection');
        return true;
    }
    
    // Complex messages with multiple specifications are NOT material selections
    console.log('🔍 Complex message with multiple specifications - NOT material selection');
    return false;
}

const testCases = [
    { input: "", expected: false, reason: "Empty string should not be material" },
    { input: "metallized", expected: true, reason: "Material keyword" },
    { input: "1", expected: true, reason: "Numeric selection" },
    { input: "pet", expected: true, reason: "Material keyword" }
];

testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. Testing: "${testCase.input}"`);
    const result = isLikelyMaterialSelectionMessage(testCase.input);
    console.log(`   Result: ${result}`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Reason: ${testCase.reason}`);
    console.log(`   ${result === testCase.expected ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log('🎯 Summary:');
console.log('   - Empty string has length 0, which is < 50');
console.log('   - No quantity/size/design keywords');
console.log('   - So it returns TRUE (likely material selection)');
console.log('   - This means empty string will be processed as material selection');
console.log('   - We need to fix this!');