// Test finish matching logic
console.log('Testing finish matching...');

const availableFinishes = [
    { name: 'Softtouch Finish', erp_id: 7 },
    { name: 'Hot Foil', erp_id: 11 },
    { name: 'Cold Foil', erp_id: 12 },
    { name: 'Matte Finish', erp_id: 6 },
    { name: 'Gloss Finish', erp_id: 5 }
];

const userInputs = ['soft touch', 'foiling', 'matte', 'glossy'];

userInputs.forEach(input => {
    console.log(`\n🔍 Testing: "${input}"`);
    
    // Test exact match
    let match = availableFinishes.find(f => 
        f.name.toLowerCase() === input.toLowerCase()
    );
    if (match) {
        console.log(`✅ Exact match: ${match.name}`);
        return;
    }
    
    // Test partial match
    match = availableFinishes.find(f => 
        f.name.toLowerCase().includes(input.toLowerCase()) ||
        input.toLowerCase().includes(f.name.toLowerCase())
    );
    if (match) {
        console.log(`✅ Partial match: ${match.name}`);
        return;
    }
    
    // Test intelligent matching (manual mapping)
    const mappings = {
        'soft touch': 'Softtouch Finish',
        'softtouch': 'Softtouch Finish',
        'foiling': 'Hot Foil',
        'foil': 'Hot Foil',
        'matte': 'Matte Finish',
        'glossy': 'Gloss Finish',
        'gloss': 'Gloss Finish'
    };
    
    const mapped = mappings[input.toLowerCase()];
    if (mapped) {
        match = availableFinishes.find(f => f.name === mapped);
        if (match) {
            console.log(`🎯 Intelligent match: "${input}" → "${match.name}"`);
            return;
        }
    }
    
    console.log(`❌ No match found for: "${input}"`);
});

console.log('\n✅ Test completed');