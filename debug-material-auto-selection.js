// Debug material auto-selection issue
console.log('🔍 === Debugging Material Auto-Selection ===\n');

// Simulate the voice message that causes auto-selection
const testMessage = "I want a flat pouch coat with dimensions of 3x4";

console.log(`🎤 Original voice message: "${testMessage}"`);
console.log('\n🤔 Possible material entities that AI might extract:');

// Common material-related words that might be in the message
const possibleMaterials = [
    "flat", "pouch", "coat", "PET", "PE", "White", "white", 
    "flat pouch", "pouch coat", "flat coat"
];

possibleMaterials.forEach(material => {
    if (testMessage.toLowerCase().includes(material.toLowerCase())) {
        console.log(`   ❗ Found potential material word: "${material}"`);
    }
});

console.log('\n🧪 Testing AI entity extraction patterns:');

// Simulate common AI entity extractions
const simulatedEntities = {
    "material:material": [
        { value: "PET", confidence: 0.8 },
        { value: "White PE", confidence: 0.7 },
        { value: "flat", confidence: 0.6 }
    ]
};

console.log('📊 Simulated AI entities:', JSON.stringify(simulatedEntities, null, 2));

console.log('\n🎯 The issue likely is:');
console.log('1. 🤖 AI extracts some material entity from voice text');
console.log('2. 🔍 System searches database for that material');  
console.log('3. ✅ Finds a match (like "PET + White PE")');
console.log('4. 🚀 Auto-selects without user confirmation');

console.log('\n💡 Solutions:');
console.log('1. 🛡️ Add confidence threshold for auto-selection');
console.log('2. 🎯 Improve AI entity extraction accuracy');
console.log('3. 👤 Always ask user to confirm material selection');
console.log('4. 🧠 Better context understanding for voice messages');

console.log('\n🔧 Need to check:');
console.log('- What material entity is being extracted from voice?');
console.log('- What database material is matching?');
console.log('- Why is the confidence high enough for auto-selection?');