// Test product entity extraction from voice message
console.log('🧪 === Testing Product Entity Extraction ===\n');

console.log('🎤 Voice message: "Yaar, give me coat on flat pouch."');
console.log('\n📋 What should be extracted:');
console.log('   🎯 Product: "flat pouch" → should find "Flat Pouch" in database');
console.log('   🏷️ Category: auto-determined from product → "Flat Pouch (3 side seal)"');

console.log('\n🤔 Current issue:');
console.log('   ❌ AI might not be extracting "flat pouch" as product entity');
console.log('   ❌ Or confidence might be too low');
console.log('   ❌ System falls back to asking for category selection');

console.log('\n💡 Potential solutions:');
console.log('   1. 🎯 Improve AI prompt to better detect product names');
console.log('   2. 🔍 Add better fuzzy matching for product names');  
console.log('   3. 🛡️ Lower confidence threshold for product entities');
console.log('   4. 📝 Add "flat pouch" variations to product matching');

console.log('\n🧪 Testing product name variations:');
const testProductNames = [
    "flat pouch",
    "Flat Pouch", 
    "flat-pouch",
    "flatpouch",
    "pouch",
    "flat"
];

console.log('\n🔍 Product name matching test:');
testProductNames.forEach(name => {
    // Simulate product search logic
    const mockProducts = [
        { name: "Flat Pouch (3 side seal)", description: "3 side seal flat pouch" },
        { name: "Stand-up Pouch", description: "Stand up pouch with bottom gusset" }
    ];
    
    const found = mockProducts.find(product =>
        product.name.toLowerCase().includes(name.toLowerCase())
    );
    
    console.log(`   "${name}" → ${found ? `✅ Found: ${found.name}` : '❌ Not found'}`);
});

console.log('\n🎯 Recommended improvements:');
console.log('   1. 🤖 Check AI entity extraction logs for "flat pouch"');
console.log('   2. 🔧 Add confidence logging for product entities');
console.log('   3. 🎯 Improve fuzzy matching for product names');
console.log('   4. 📝 Add alternative product name patterns');

console.log('\n🚀 Next steps:');
console.log('   📊 Check what entities AI extracts from voice text');
console.log('   🔍 Verify product database has "Flat Pouch" entry');
console.log('   🎯 Test with different voice variations');