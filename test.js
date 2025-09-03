import WhatsAppService from './services/whatsappService.js';
import dotenv from 'dotenv';

dotenv.config();

const whatsappService = new WhatsAppService();

async function testWhatsAppService() {
    try {
        console.log('🧪 Testing WhatsApp Service...\n');

        // Test sending a simple text message
        console.log('1. Testing text message...');
        const textResult = await whatsappService.sendMessage(
            'YOUR_TEST_PHONE_NUMBER', // Replace with your test phone number
            'Hello! This is a test message from your WhatsApp Business API system. 🚀'
        );
        console.log('✅ Text message sent:', textResult.messages[0].id);

        // Test sending a message with emojis and formatting
        console.log('\n2. Testing formatted message...');
        const formattedMessage = `🎉 *Welcome to our Business!*

We're excited to help you with:
• Product inquiries
• Price quotes  
• Customer support
• General information

Just reply to this message and our AI assistant will help you! 🤖`;

        const formattedResult = await whatsappService.sendMessage(
            'YOUR_TEST_PHONE_NUMBER', // Replace with your test phone number
            formattedMessage
        );
        console.log('✅ Formatted message sent:', formattedResult.messages[0].id);

        // Test sending an interactive button message
        console.log('\n3. Testing button message...');
        const buttons = [
            {
                type: 'reply',
                reply: {
                    id: 'get_quote',
                    title: '💰 Get Quote'
                }
            },
            {
                type: 'reply',
                reply: {
                    id: 'product_info',
                    title: '📦 Product Info'
                }
            },
            {
                type: 'reply',
                reply: {
                    id: 'contact_us',
                    title: '📞 Contact Us'
                }
            }
        ];

        const buttonResult = await whatsappService.sendButtonMessage(
            'YOUR_TEST_PHONE_NUMBER', // Replace with your test phone number
            'How can we help you today? Choose an option below:',
            buttons
        );
        console.log('✅ Button message sent:', buttonResult.messages[0].id);

        // Test sending a list message
        console.log('\n4. Testing list message...');
        const sections = [
            {
                title: 'Services',
                rows: [
                    {
                        id: 'service_1',
                        title: 'Custom Development',
                        description: 'Tailored software solutions'
                    },
                    {
                        id: 'service_2',
                        title: 'API Integration',
                        description: 'Connect your systems'
                    },
                    {
                        id: 'service_3',
                        title: 'Consulting',
                        description: 'Expert technical advice'
                    }
                ]
            }
        ];

        const listResult = await whatsappService.sendListMessage(
            'YOUR_TEST_PHONE_NUMBER', // Replace with your test phone number
            'Choose a service you\'re interested in:',
            'Select Service',
            sections
        );
        console.log('✅ List message sent:', listResult.messages[0].id);

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`- Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
        console.log(`- API Version: ${process.env.WHATSAPP_VERSION}`);
        console.log('- All message types sent successfully');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.data?.error?.error_data?.details) {
            console.error('Error details:', error.response.data.error.error_data.details);
        }
        
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your WHATSAPP_ACCESS_TOKEN in .env file');
        console.log('2. Verify WHATSAPP_PHONE_NUMBER_ID is correct');
        console.log('3. Make sure your test phone number is in the correct format (e.g., 1234567890)');
        console.log('4. Ensure your WhatsApp Business account is approved for sending messages');
    }
}

// Run the test
testWhatsAppService();
