// Debug voice message processing issue
console.log('🧪 Debugging voice message processing issue...\n');

// The transcribed text from the voice message
const transcribedText = "I want a Mylar bag coat on a stand-up pouch So keep the dimensions 3, 4, 5 And the quantity I want is 20,000 And finish it with Sport UV Material Metallized";

console.log('📝 Transcribed Text:');
console.log(`"${transcribedText}"`);
console.log('');

// Test entity extraction expectations
console.log('🔍 Expected Entities:');
console.log('   - Product: "Mylar bag", "stand-up pouch"');
console.log('   - Dimensions: "3, 4, 5"');
console.log('   - Quantity: "20,000"');
console.log('   - Finish: "Sport UV" (should be "Spot UV")');
console.log('   - Material: "Metallized"');
console.log('');

// Test if this should trigger entity extraction
function shouldExtractEntities(currentStep, messageText) {
    const skipSteps = ['quote_generation', 'material_selection', 'finish_selection'];
    const isYesNoResponse = messageText.toLowerCase().includes('yes') || messageText.toLowerCase().includes('no');
    
    if (skipSteps.includes(currentStep)) {
        return false;
    }
    
    if (currentStep === 'greeting_response' && isYesNoResponse) {
        return false;
    }
    
    return true;
}

// Test different conversation states
const testStates = [
    { currentStep: 'start', description: 'Fresh conversation start' },
    { currentStep: 'greeting_response', description: 'After greeting' },
    { currentStep: 'category_selection', description: 'Waiting for category' },
    { currentStep: 'material_selection', description: 'Waiting for material (should skip)' },
    { currentStep: 'finish_selection', description: 'Waiting for finish (should skip)' }
];

console.log('🧪 Testing entity extraction for different conversation states:');
testStates.forEach((state, index) => {
    const shouldExtract = shouldExtractEntities(state.currentStep, transcribedText);
    console.log(`${index + 1}. ${state.description}`);
    console.log(`   Current Step: ${state.currentStep}`);
    console.log(`   Should Extract Entities: ${shouldExtract ? 'YES ✅' : 'NO ❌'}`);
    console.log('');
});

console.log('🤔 POSSIBLE ISSUES:');
console.log('   1. Voice message might be processed in wrong conversation state');
console.log('   2. Entity extraction might be skipped due to current step');
console.log('   3. AI service might not be extracting entities correctly');
console.log('   4. Extracted entities might not be updating conversation data');
console.log('');

console.log('🔧 DEBUG STEPS NEEDED:');
console.log('   1. Check what conversation state exists when voice message arrives');
console.log('   2. Verify entity extraction is actually running');
console.log('   3. Check if extracted entities contain category/product info');
console.log('   4. Verify conversation data is being updated properly');