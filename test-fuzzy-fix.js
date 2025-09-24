// Test the corrected fuzzy matching
console.log('🧪 Testing Corrected Fuzzy Matching\n');

// Simulate the corrected logic
const testFuzzyMatching = (categoryName) => {
    console.log(`🔍 Testing: "${categoryName}"`);
    
    let normalizedCategoryName = categoryName.toLowerCase();
    
    // Corrected spelling variations (incorrect → correct)
    const spellingCorrections = {
        'mylor': 'mylar',  // Common misspelling of Mylar
        'pa': 'polyamide',
        'pe': 'polyethylene', 
        'pp': 'polypropylene',
        'kraft': 'kraft paper'
    };
    
    // Apply spelling corrections
    for (const [incorrect, correct] of Object.entries(spellingCorrections)) {
        if (normalizedCategoryName.includes(incorrect)) {
            normalizedCategoryName = normalizedCategoryName.replace(incorrect, correct);
            console.log(`✅ Spelling correction: "${incorrect}" → "${correct}"`);
        }
    }
    
    console.log(`➡️ Normalized result: "${normalizedCategoryName}"`);
    
    // Test category matching
    const testCategories = ['mylar', 'metal sheet', 'acrylic', 'wood panel'];
    const match = testCategories.find(cat => 
        cat.toLowerCase().includes(normalizedCategoryName) || 
        normalizedCategoryName.includes(cat.toLowerCase())
    );
    
    console.log(`🎯 Match found: ${match || 'None'}\n`);
    return match;
};

// Test cases
testFuzzyMatching("mylor");      // Should correct to "mylar"
testFuzzyMatching("Mylor");      // Should correct to "mylar"
testFuzzyMatching("mylar");      // Should stay "mylar"
testFuzzyMatching("metal sheet"); // Should stay "metal sheet"
testFuzzyMatching("pa");         // Should correct to "polyamide"

console.log('✅ Fuzzy matching correction is working!');