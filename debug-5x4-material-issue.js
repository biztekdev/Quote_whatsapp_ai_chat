// Debug material auto-selection for "5x4" message
console.log('🔍 === Debugging "5x4" Material Auto-Selection ===\n');

console.log('🎯 User message: "5x4"');
console.log('📝 Expected behavior: Should only extract dimensions, not materials');
console.log('❌ Actual behavior: Auto-selects "Kraft + PE" material');

console.log('\n🤔 Why is this happening?');
console.log('1. 🤖 AI might be extracting some material entity from "5x4"');
console.log('2. 🔍 System searches for that material in database');
console.log('3. ✅ Finds "Kraft + PE" and auto-selects it');
console.log('4. 💬 User sees unwanted material selection');

console.log('\n🧪 Possible material extractions from "5x4":');
const possibleExtractions = [
    { entity: "5", reason: "Number might be interpreted as material" },
    { entity: "4", reason: "Number might be interpreted as material" }, 
    { entity: "x", reason: "Letter 'x' might match some material" },
    { entity: "PE", reason: "If AI extracts 'PE' from context or error" },
    { entity: "kraft", reason: "If AI hallucinates material from previous context" }
];

possibleExtractions.forEach((item, index) => {
    console.log(`   ${index + 1}. "${item.entity}" - ${item.reason}`);
});

console.log('\n💡 Solutions needed:');
console.log('1. 🛡️ Stricter material entity validation');
console.log('2. 🎯 Context-aware material extraction (dimension step = no materials)');
console.log('3. 📋 Dimension-only mode for dimension input');
console.log('4. 🚫 Block material extraction during dimension collection');

console.log('\n🔧 Current confidence check:');
console.log('   ✅ Added 0.8 confidence threshold for materials');
console.log('   ❌ But this might not be applied to all material extraction cases');

console.log('\n🎯 Need to check:');
console.log('   1. What material entity is AI extracting from "5x4"?');
console.log('   2. Is confidence check being applied everywhere?');
console.log('   3. Are there other material auto-selection paths?');

console.log('\n🚨 URGENT FIX NEEDED: Disable material auto-selection during dimension input!');