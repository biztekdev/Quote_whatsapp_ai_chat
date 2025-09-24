// Test category name matching for voice message
console.log('🧪 Testing category name matching for voice message...\n');

const transcribedText = "I want a Mylar bag coat on a stand-up pouch So keep the dimensions 3, 4, 5 And the quantity I want is 20,000 And finish it with Sport UV Material Metallized";

console.log('📝 Transcribed Text:');
console.log(`"${transcribedText}"`);
console.log('');

// Test different variations the AI might extract
const possibleExtractions = [
    'Mylar bag',
    'Mylor bag', 
    'mylar bag',
    'mylor bag',
    'stand-up pouch',
    'standup pouch',
    'stand up pouch',
    'pouch'
];

console.log('🔍 Possible category extractions from voice:');
possibleExtractions.forEach((extraction, index) => {
    const isInText = transcribedText.toLowerCase().includes(extraction.toLowerCase());
    console.log(`${index + 1}. "${extraction}" → ${isInText ? 'Found in text ✅' : 'Not in text ❌'}`);
});

console.log('');
console.log('🤔 SUSPECTED ISSUES:');
console.log('   1. "Mylar" vs "Mylor" spelling difference');
console.log('   2. AI might extract "Mylar bag" but database has "Mylor Bag"');
console.log('   3. Category matching might be case-sensitive');
console.log('   4. Multiple product mentions might confuse the AI');
console.log('');

console.log('🔧 SOLUTION APPROACHES:');
console.log('   1. Improve fuzzy matching for category names');
console.log('   2. Add "Mylar" as alias for "Mylor"');
console.log('   3. Debug actual AI extraction results');
console.log('   4. Check if entity extraction is actually running');

// Test the most likely scenario
console.log('');
console.log('💡 MOST LIKELY ISSUE:');
console.log('   User says: "Mylar bag"');
console.log('   AI extracts: "Mylar bag"');
console.log('   Database has: "Mylor Bag"');
console.log('   Result: No category match found → asks for category selection');
console.log('');
console.log('📋 NEXT STEPS:');
console.log('   1. Add better fuzzy matching in category search');
console.log('   2. Add console logs to see what entities are actually extracted');
console.log('   3. Check if "Mylar" → "Mylor" mapping exists');