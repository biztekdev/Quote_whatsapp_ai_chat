// Test the quote generation flow to ensure "Yes" responses work correctly
console.log('🧪 Testing quote generation flow...\n');

// Test data that simulates the conversation state when user says "Yes" to generate quote
const testConversationState = {
    currentStep: 'quote_generation',
    conversationData: {
        selectedCategory: { id: '1', name: 'Mylor Bag' },
        selectedProduct: { id: '1', name: 'Stand Up Pouch' },
        selectedMaterial: [{ id: '1', name: 'PET + MPET + PE' }],
        selectedFinish: [{ id: '1', name: 'Gloss Finish' }],
        dimensions: [
            { name: 'Width', value: 3 },
            { name: 'Height', value: 2 },
            { name: 'Gusset', value: 4 }
        ],
        quantity: [1000, 2000, 4000],
        skus: 3,
        quoteAcknowledged: true, // User has already seen the confirmation
        wantsQuote: true
    }
};

// Simulate what should happen when user says "Yes" in this state
const userMessage = "Yes";

console.log('📋 Test scenario:');
console.log('Current step:', testConversationState.currentStep);
console.log('Quote acknowledged:', testConversationState.conversationData.quoteAcknowledged);
console.log('User message:', userMessage);

// Test the message analysis logic
const newQuoteKeywords = ['new quote', 'new', 'start over', 'restart', 'reset', 'begin again', 'fresh quote', 'another quote', 'new order'];
const wantsNewQuote = newQuoteKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword.toLowerCase())
);

const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
const isGreetingMessage = greetings.some(greeting => userMessage.toLowerCase().includes(greeting));

const hasProductInfo = false; // "Yes" doesn't contain product info

const activeSteps = ['quote_generation', 'greeting_response', 'material_selection', 'finish_selection', 'quantity_input', 'dimension_input'];
const isInActiveStep = activeSteps.includes(testConversationState.currentStep);

console.log('\n🔍 Analysis results:');
console.log('Wants new quote:', wantsNewQuote);
console.log('Is greeting:', isGreetingMessage);
console.log('Has product info:', hasProductInfo);
console.log('Is in active step:', isInActiveStep);

const shouldResetConversation = !isInActiveStep && (wantsNewQuote || (isGreetingMessage && !hasProductInfo));
console.log('Should reset conversation:', shouldResetConversation);

if (shouldResetConversation) {
    console.log('❌ ERROR: System would incorrectly reset conversation!');
    console.log('💡 This would cause the user to start over instead of generating the quote.');
} else {
    console.log('✅ CORRECT: System would continue with quote generation');
    console.log('💡 The "Yes" response should be processed in handleQuoteGeneration method');
}

console.log('\n🎯 Expected behavior:');
console.log('1. User says "Yes"');
console.log('2. System stays in quote_generation step');
console.log('3. handleQuoteGeneration processes the "Yes" response');
console.log('4. System generates the actual quote/PDF');
console.log('5. System sends the quote to the user');

console.log('\n✨ Test completed');