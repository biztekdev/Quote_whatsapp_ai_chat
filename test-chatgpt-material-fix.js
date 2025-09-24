import dotenv from 'dotenv';
import chatgptService from './services/chatgptService.js';

dotenv.config();

// Test message that should NOT auto-select materials
const testMessage = "Need 12k quantity, W 3\" H 4\" size, Flat pouch (on roll), number of designs 4, finish will be Soft touch ( with foiling)";

// Mock available materials (similar to what the system would have)
const mockAvailableMaterials = [
    { name: "PET + Alu Foil + PE" },
    { name: "White PE" },
    { name: "Clear PE" },
    { name: "MPET Silver" },
    { name: "PET Clear" }
];

console.log('🧪 Testing ChatGPT Material Auto-Selection Fix...');
console.log('📝 Test Message:', testMessage);
console.log('🎯 Expected: Materials should be NULL (not auto-selected)');
console.log('');

try {
    const result = await chatgptService.extractEntities(testMessage, {
        availableMaterials: mockAvailableMaterials
    });
    
    console.log('✅ ChatGPT Response:');
    console.log(JSON.stringify(result.data, null, 2));
    
    if (!result.data.materials || result.data.materials.length === 0) {
        console.log('');
        console.log('🎉 SUCCESS: No materials auto-selected!');
        console.log('✅ The system correctly identified that no materials were explicitly mentioned.');
    } else {
        console.log('');
        console.log('❌ ISSUE: Materials were auto-selected:', result.data.materials);
        console.log('🔧 This should be fixed - materials should only be selected when explicitly mentioned.');
    }
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
}