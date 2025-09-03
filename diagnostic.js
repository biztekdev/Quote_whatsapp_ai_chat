import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class WhatsAppDiagnostic {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.version = process.env.WHATSAPP_VERSION || 'v22.0';
        this.baseURL = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}`;
    }

    async testConfiguration() {
        console.log('🔍 WhatsApp Business API Diagnostic\n');
        
        // Check environment variables
        console.log('📋 Configuration Check:');
        console.log(`✓ Access Token: ${this.accessToken ? 'Present' : '❌ Missing'}`);
        console.log(`✓ Phone Number ID: ${this.phoneNumberId || '❌ Missing'}`);
        console.log(`✓ API Version: ${this.version}`);
        console.log(`✓ Base URL: ${this.baseURL}\n`);

        if (!this.accessToken || !this.phoneNumberId) {
            console.log('❌ Missing required configuration. Please check your .env file.');
            return;
        }

        // Test token validity
        await this.testTokenValidity();
        
        // Test phone number access
        await this.testPhoneNumberAccess();
        
        // Test message sending (with proper format)
        await this.testMessageSending();
    }

    async testTokenValidity() {
        console.log('🔑 Testing Access Token...');
        try {
            const response = await axios.get(`https://graph.facebook.com/${this.version}/me`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            console.log('✅ Token is valid');
            console.log(`   App ID: ${response.data.id}`);
            console.log(`   App Name: ${response.data.name || 'N/A'}\n`);
        } catch (error) {
            console.log('❌ Token validation failed');
            console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
            console.log(`   Code: ${error.response?.data?.error?.code || error.response?.status}\n`);
        }
    }

    async testPhoneNumberAccess() {
        console.log('📞 Testing Phone Number Access...');
        try {
            const response = await axios.get(
                `https://graph.facebook.com/${this.version}/${this.phoneNumberId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            console.log('✅ Phone number access is valid');
            console.log(`   Phone Number: ${response.data.display_phone_number}`);
            console.log(`   Status: ${response.data.code_verification_status}`);
            console.log(`   Quality Rating: ${response.data.quality_rating || 'N/A'}\n`);
        } catch (error) {
            console.log('❌ Phone number access failed');
            console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
            console.log(`   Code: ${error.response?.data?.error?.code || error.response?.status}`);
            
            if (error.response?.status === 403) {
                console.log('   💡 This usually means the token doesn\'t have access to this phone number');
            }
            console.log('');
        }
    }

    async testMessageSending() {
        console.log('💬 Testing Message Format...');
        
        // Test with a properly formatted message payload
        const testPayload = {
            messaging_product: 'whatsapp',
            to: '1234567890', // This will fail but shows us the exact error
            type: 'text',
            text: {
                body: 'Test message from diagnostic tool'
            }
        };

        try {
            const response = await axios.post(
                `${this.baseURL}/messages`,
                testPayload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('✅ Message format is correct');
            console.log(`   Message ID: ${response.data.messages[0].id}\n`);
        } catch (error) {
            console.log('📝 Message sending test results:');
            const errorData = error.response?.data?.error;
            
            if (errorData) {
                console.log(`   Error Code: ${errorData.code}`);
                console.log(`   Error Type: ${errorData.type}`);
                console.log(`   Message: ${errorData.message}`);
                
                if (errorData.error_data?.details) {
                    console.log(`   Details: ${errorData.error_data.details}`);
                }
                
                // Provide specific guidance based on error
                this.provideErrorGuidance(errorData);
            } else {
                console.log(`   HTTP Status: ${error.response?.status}`);
                console.log(`   Error: ${error.message}`);
            }
            console.log('');
        }
    }

    provideErrorGuidance(errorData) {
        console.log('\n💡 Troubleshooting Guidance:');
        
        switch (errorData.code) {
            case 100:
                console.log('   - Invalid parameter. Check your message format.');
                break;
            case 131000:
                console.log('   - Recipient phone number error. Use format: country code + number (no + or spaces)');
                console.log('   - Example: 1234567890 for US number +1 (234) 567-890');
                break;
            case 131005:
                console.log('   - Recipient cannot receive messages (not a WhatsApp user or blocked)');
                break;
            case 131021:
                console.log('   - Recipient number is not valid');
                break;
            case 190:
                console.log('   - Access token expired or invalid');
                break;
            case 200:
                console.log('   - Permission denied. Token may not have required permissions');
                break;
            default:
                console.log(`   - Check WhatsApp Business API documentation for error code ${errorData.code}`);
        }
    }

    async validatePhoneNumber(phoneNumber) {
        console.log(`\n📱 Validating phone number format: ${phoneNumber}`);
        
        // Basic validation
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        if (cleanNumber.length < 10 || cleanNumber.length > 15) {
            console.log('❌ Invalid length. Should be 10-15 digits.');
            return false;
        }
        
        if (cleanNumber.startsWith('0')) {
            console.log('❌ Number should not start with 0. Use country code instead.');
            return false;
        }
        
        console.log(`✅ Format looks valid: ${cleanNumber}`);
        return true;
    }
}

// Run diagnostic
const diagnostic = new WhatsAppDiagnostic();
diagnostic.testConfiguration().catch(console.error);
