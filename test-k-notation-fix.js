// Test K-notation quantity extraction fix
const testQuantityExtraction = (messageText) => {
    console.log(`\n🧪 Testing quantity extraction for: "${messageText}"`);
    
    let extractedQuantity = null;
    
    // Method 1: Handle "k" notation first (5k = 5000, 2.5k = 2500)
    const kMatch = messageText.match(/(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) {
        extractedQuantity = Math.round(parseFloat(kMatch[1]) * 1000);
        console.log('✅ Extracted quantity from "k" notation:', extractedQuantity);
    }
    
    // Method 2: Direct number extraction if no "k" found (handles "50000", "5000", etc.)
    if (!extractedQuantity) {
        const numberMatch = messageText.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\b/);
        if (numberMatch) {
            const numberStr = numberMatch[1].replace(/,/g, ''); // Remove commas
            extractedQuantity = parseInt(numberStr);
            console.log('✅ Extracted quantity from number:', extractedQuantity);
        }
    }
    
    console.log(`➡️ Final result: ${extractedQuantity}`);
    return extractedQuantity;
};

console.log('=== Testing K-Notation Fix ===');

// Test cases
testQuantityExtraction("2.5k");      // Should be 2500
testQuantityExtraction("5k");        // Should be 5000
testQuantityExtraction("2k");        // Should be 2000
testQuantityExtraction("50000");     // Should be 50000
testQuantityExtraction("5000");      // Should be 5000
testQuantityExtraction("50,000");    // Should be 50000
testQuantityExtraction("I need 2.5k pieces"); // Should be 2500
testQuantityExtraction("2.5K please");        // Should be 2500 (case insensitive)
testQuantityExtraction("Need 10k units");     // Should be 10000

console.log('\n✅ K-notation fix test completed!');