import WhatsAppService from './services/whatsappService.js';
import dotenv from 'dotenv';

dotenv.config();

class WhatsAppTester {
    constructor() {
        this.whatsappService = new WhatsAppService();
    }

    async testWithProperErrorHandling() {
        console.log('🧪 WhatsApp API Test with Error Handling\n');
        
        // Test phone numbers - these will show the proper error handling
        const testNumbers = [
            '1234567890',     // Dummy number (will show allowlist error)
            '15551234567',    // Another dummy number
            '923260533337'    // The number from your error log
        ];

        console.log('📋 Error Code Reference:');
        console.log('• 131030: Recipient not in allowed list (Development mode)');
        console.log('• 131005: Recipient cannot receive messages');
        console.log('• 131021: Invalid phone number format');
        console.log('• 190: Access token expired/invalid\n');

        for (const phoneNumber of testNumbers) {
            console.log(`📞 Testing with: ${phoneNumber}`);
            
            try {
                const result = await this.whatsappService.sendMessage(
                    phoneNumber,
                    'Test message - This will likely fail in development mode'
                );
                console.log(`✅ Success: Message sent to ${phoneNumber}`);
                console.log(`   Message ID: ${result.messages[0].id}\n`);
            } catch (error) {
                const errorData = error.response?.data?.error;
                
                if (errorData) {
                    console.log(`❌ Error ${errorData.code}: ${errorData.type}`);
                    console.log(`   Message: ${errorData.message}`);
                    
                    // Provide specific solutions based on error code
                    switch (errorData.code) {
                        case 131030:
                            console.log('   🔧 Solution: Add this number to your developer console allowlist');
                            console.log('   📱 Or use a number that\'s already in your allowlist');
                            console.log('   🚀 Or apply for production access to message any number');
                            break;
                        case 131005:
                            console.log('   🔧 Solution: Number is not a WhatsApp user or blocked you');
                            break;
                        case 131021:
                            console.log('   🔧 Solution: Use proper format (country code + number, no spaces/+)');
                            break;
                        case 190:
                            console.log('   🔧 Solution: Check your access token, it may be expired');
                            break;
                        default:
                            console.log('   🔧 Check WhatsApp Business API documentation');
                    }
                } else {
                    console.log(`❌ HTTP ${error.response?.status}: ${error.message}`);
                }
                console.log('');
            }
        }

        console.log('💡 Next Steps:');
        console.log('1. Add test phone numbers to your Meta Developer Console allowlist');
        console.log('2. Or apply for production access to message any WhatsApp number');
        console.log('3. Ensure phone numbers are in correct format (country code + number)');
        console.log('4. Test with numbers you know are WhatsApp users\n');
    }

    async showAllowlistInstructions() {
        console.log('📝 How to Add Numbers to Allowlist:');
        console.log('');
        console.log('1. Go to https://developers.facebook.com/');
        console.log('2. Select your WhatsApp Business API app');
        console.log('3. Navigate to: WhatsApp > Configuration');
        console.log('4. Scroll to "Phone Numbers" section');
        console.log('5. Click "Add recipient phone number"');
        console.log('6. Enter the phone number (with country code, no + sign)');
        console.log('7. The number must be a verified WhatsApp user');
        console.log('8. Save and test again');
        console.log('');
        console.log('Example valid formats:');
        console.log('• US: 1234567890 (not +1-234-567-890)');
        console.log('• UK: 447700900123 (not +44-77-009-00123)');
        console.log('• Pakistan: 923001234567 (not +92-300-123-4567)');
        console.log('');
    }

    async demonstrateProperUsage() {
        console.log('📚 Proper WhatsApp API Usage:');
        console.log('');
        console.log('// ✅ Correct - Handle errors gracefully');
        console.log('try {');
        console.log('  const result = await whatsappService.sendMessage(phoneNumber, message);');
        console.log('  console.log("Message sent:", result.messages[0].id);');
        console.log('} catch (error) {');
        console.log('  const errorCode = error.response?.data?.error?.code;');
        console.log('  ');
        console.log('  switch (errorCode) {');
        console.log('    case 131030:');
        console.log('      // Handle allowlist error');
        console.log('      break;');
        console.log('    case 131005:');
        console.log('      // Handle recipient unavailable');
        console.log('      break;');
        console.log('    // ... handle other errors');
        console.log('  }');
        console.log('}');
        console.log('');
    }
}

// Run the test
const tester = new WhatsAppTester();

console.log('🎯 WhatsApp Business API Development Mode Test\n');
tester.showAllowlistInstructions();
console.log('\n' + '='.repeat(60) + '\n');
tester.demonstrateProperUsage();
console.log('\n' + '='.repeat(60) + '\n');
tester.testWithProperErrorHandling().catch(console.error);
