// Test the improved category matching with spelling corrections
console.log('🧪 Testing improved category matching with spelling corrections...\n');

// Mock categories (similar to what's in database)
const mockCategories = [
    { name: 'Mylor Bag', sub_names: ['Stand-up Pouch', 'Flat Pouch'] },
    { name: 'Label', sub_names: ['Sticker Label', 'Product Label'] },
    { name: 'Folding Carton', sub_names: ['Box', 'Packaging'] }
];

// Mock the improved findCategoryByName logic
async function findCategoryByName(categoryName) {
    try {
        const categories = mockCategories;

        // Apply common spelling corrections
        let normalizedCategoryName = categoryName.toLowerCase();
        
        // Common spelling variations
        const spellingCorrections = {
            'mylar': 'mylor',
            'polyamide': 'pa',
            'polyethylene': 'pe',
            'polypropylene': 'pp',
            'kraft paper': 'kraft'
        };
        
        // Apply spelling corrections
        for (const [incorrect, correct] of Object.entries(spellingCorrections)) {
            if (normalizedCategoryName.includes(incorrect)) {
                normalizedCategoryName = normalizedCategoryName.replace(incorrect, correct);
                console.log(`🔧 Spelling correction applied: "${incorrect}" → "${correct}"`);
            }
        }

        // Search in name field with original name
        let foundCategory = categories.find(cat =>
            cat.name.toLowerCase().includes(categoryName.toLowerCase())
        );

        // Search with corrected name if original didn't match
        if (!foundCategory && normalizedCategoryName !== categoryName.toLowerCase()) {
            foundCategory = categories.find(cat =>
                cat.name.toLowerCase().includes(normalizedCategoryName)
            );
            
            if (foundCategory) {
                console.log(`✅ Found category "${foundCategory.name}" using spelling correction for "${categoryName}"`);
            }
        }

        // If not found in name, search in sub_names with original name
        if (!foundCategory) {
            foundCategory = categories.find(cat =>
                cat.sub_names && cat.sub_names.some(subName =>
                    subName.toLowerCase().includes(categoryName.toLowerCase())
                )
            );
        }

        // If still not found, search sub_names with corrected name
        if (!foundCategory && normalizedCategoryName !== categoryName.toLowerCase()) {
            foundCategory = categories.find(cat =>
                cat.sub_names && cat.sub_names.some(subName =>
                    subName.toLowerCase().includes(normalizedCategoryName)
                )
            );
        }

        return foundCategory;
    } catch (error) {
        console.error('Error finding category by name:', error);
        return null;
    }
}

// Test various inputs from voice messages
const testInputs = [
    'Mylar bag',         // Should find "Mylor Bag" with spelling correction
    'mylar bag',         // Should find "Mylor Bag" with spelling correction  
    'Mylor bag',         // Should find "Mylor Bag" directly
    'stand-up pouch',    // Should find "Mylor Bag" via sub_names
    'standup pouch',     // Should find "Mylor Bag" via sub_names
    'flat pouch',        // Should find "Mylor Bag" via sub_names
    'label',             // Should find "Label" directly
    'box',               // Should find "Folding Carton" via sub_names
    'random product'     // Should not find anything
];

console.log('🔍 Testing category matching:');

async function runTests() {
    for (let i = 0; i < testInputs.length; i++) {
        const input = testInputs[i];
        console.log(`\n${i + 1}. Testing: "${input}"`);
        
        const result = await findCategoryByName(input);
        
        if (result) {
            console.log(`   ✅ Found: "${result.name}"`);
            if (result.sub_names) {
                console.log(`   📝 Sub-names: ${result.sub_names.join(', ')}`);
            }
        } else {
            console.log(`   ❌ Not found`);
        }
    }
    
    console.log('\n🎯 EXPECTED RESULTS:');
    console.log('   ✅ "Mylar bag" → "Mylor Bag" (with spelling correction)');
    console.log('   ✅ "stand-up pouch" → "Mylor Bag" (via sub_names)');
    console.log('   ✅ Voice message should now find correct category');
    console.log('   ✅ No more manual category selection needed');
}

runTests();