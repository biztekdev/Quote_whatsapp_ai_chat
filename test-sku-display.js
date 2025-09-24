// Test SKU display formatting
console.log('🧪 Testing SKU display formatting...\n');

// Mock conversation data scenarios
const scenarios = [
    {
        name: "User provided SKU",
        conversationData: { skus: 5 },
        expected: "5"
    },
    {
        name: "User didn't provide SKU",
        conversationData: {},
        expected: "1 (default)"
    },
    {
        name: "User provided SKU as 1",
        conversationData: { skus: 1 },
        expected: "1"
    },
    {
        name: "User provided multiple SKUs",
        conversationData: { skus: 10 },
        expected: "10"
    }
];

scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. Testing: ${scenario.name}`);
    
    // Apply the same logic as in messageHandler
    const skusText = scenario.conversationData.skus ? scenario.conversationData.skus.toString() : '1 (default)';
    
    const isCorrect = skusText === scenario.expected;
    console.log(`   Input: skus = ${scenario.conversationData.skus || 'undefined'}`);
    console.log(`   Output: "${skusText}"`);
    console.log(`   Expected: "${scenario.expected}"`);
    console.log(`   ${isCorrect ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log('🎯 Summary:');
console.log('   - When user provides SKU: shows exact value');
console.log('   - When user doesn\'t provide SKU: shows "1 (default)"');
console.log('   - This makes it clear to users what will be used');