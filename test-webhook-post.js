// Test the webhook POST endpoint with the provided curl data
import axios from 'axios';

const webhookData = {
    "object": "whatsapp_business_account",
    "entry": [
        {
            "id": "537027176159006",
            "changes": [
                {
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "15551819218",
                            "phone_number_id": "489160957621782"
                        },
                        "contacts": [
                            {
                                "profile": {
                                    "name": "hammadnadir"
                                },
                                "wa_id": "923260533337"
                            }
                        ],
                        "messages": [
                            {
                                "from": "923260533337",
                                "id": "wamid.dssdssdssdsdsdsjsgdjsasdmnkjasdkasR",
                                "timestamp": "1757980236",
                                "text": {
                                    "body": "I am looking for 20000 standup pouches on standard size with spot UV and foil. I have 4 different flavors and I need white inside the pouch. Can you quote a price for me?"
                                },
                                "type": "text"
                            }
                        ]
                    },
                    "field": "messages"
                }
            ]
        }
    ]
};

async function testWebhook() {
    console.log('🧪 Testing webhook POST endpoint...\n');
    
    try {
        console.log('📤 Sending webhook data to local server...');
        
        const response = await axios.post('http://localhost:5001/webhook', webhookData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        console.log('✅ Webhook response received:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Connection refused - server is not running locally');
            console.log('💡 Try running: npm start or node index.js');
        } else if (error.code === 'ECONNRESET' || error.code === 'TIMEOUT') {
            console.log('❌ Connection timeout/reset - webhook handler is hanging');
            console.log('💡 This indicates the webhook handler has an error and is not responding');
        } else {
            console.log('❌ Webhook test failed:', error.message);
            if (error.response) {
                console.log('Response status:', error.response.status);
                console.log('Response data:', error.response.data);
            }
        }
    }
}

testWebhook();