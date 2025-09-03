# WhatsApp Message System Examples

## API Usage Examples

### 1. Send Simple Text Message

```bash
curl -X POST http://localhost:5000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "message": "Hello! Welcome to our business."
  }'
```

**Note**: In development mode, the recipient number must be in your Meta Developer Console allowlist.

### 2. Send Formatted Message with Emojis

```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "message": "🎉 *Welcome to Our Store!*\n\nWe offer:\n• Premium Products\n• Fast Delivery\n• 24/7 Support\n\nHow can we help you today?"
  }'
```

### 3. Send Template Message

```bash
curl -X POST http://localhost:3000/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "templateName": "hello_world",
    "languageCode": "en_US"
  }'
```

### 4. Send Image Message

```bash
curl -X POST http://localhost:3000/send-media \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "mediaUrl": "https://example.com/product-image.jpg",
    "type": "image",
    "caption": "Check out our latest product! 📦"
  }'
```

### 5. Send Document

```bash
curl -X POST http://localhost:3000/send-media \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "mediaUrl": "https://example.com/brochure.pdf",
    "type": "document",
    "caption": "Here'\''s our product catalog"
  }'
```

### 6. Send Button Message

```bash
curl -X POST http://localhost:3000/send-buttons \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "bodyText": "How can we help you today?",
    "buttons": [
      {
        "type": "reply",
        "reply": {
          "id": "get_quote",
          "title": "💰 Get Quote"
        }
      },
      {
        "type": "reply",
        "reply": {
          "id": "support",
          "title": "🆘 Support"
        }
      },
      {
        "type": "reply",
        "reply": {
          "id": "info",
          "title": "ℹ️ Info"
        }
      }
    ]
  }'
```

## JavaScript/Node.js Examples

### Basic Message Sending

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function sendMessage(to, message) {
    try {
        const response = await axios.post(`${API_URL}/send-message`, {
            to: to,
            message: message
        });
        
        console.log('Message sent:', response.data.messageId);
        return response.data;
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Usage
sendMessage('1234567890', 'Hello from Node.js!');
```

### Bulk Message Sending

```javascript
async function sendBulkMessages(contacts, message) {
    const results = [];
    
    for (const contact of contacts) {
        try {
            const result = await sendMessage(contact, message);
            results.push({ contact, success: true, messageId: result.messageId });
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            results.push({ contact, success: false, error: error.message });
        }
    }
    
    return results;
}

// Usage
const contacts = ['1234567890', '0987654321', '1122334455'];
const message = 'Important update: Our new products are now available!';
sendBulkMessages(contacts, message);
```

### Interactive Message Flow

```javascript
class WhatsAppBot {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    
    async sendWelcomeMessage(to) {
        const buttons = [
            {
                type: 'reply',
                reply: { id: 'products', title: '📦 Products' }
            },
            {
                type: 'reply',
                reply: { id: 'support', title: '🆘 Support' }
            },
            {
                type: 'reply',
                reply: { id: 'about', title: 'ℹ️ About Us' }
            }
        ];
        
        return await this.sendButtons(
            to,
            'Welcome! How can we help you today?',
            buttons
        );
    }
    
    async sendButtons(to, bodyText, buttons) {
        const response = await axios.post(`${this.apiUrl}/send-buttons`, {
            to, bodyText, buttons
        });
        return response.data;
    }
    
    async handleButtonResponse(buttonId, userPhone) {
        switch (buttonId) {
            case 'products':
                return await this.sendProductCatalog(userPhone);
            case 'support':
                return await this.sendSupportInfo(userPhone);
            case 'about':
                return await this.sendAboutInfo(userPhone);
            default:
                return await this.sendMessage(userPhone, 'Sorry, I didn\'t understand that option.');
        }
    }
}

// Usage
const bot = new WhatsAppBot('http://localhost:3000');
bot.sendWelcomeMessage('1234567890');
```

## Python Examples

### Simple Message Sender

```python
import requests
import json

API_URL = 'http://localhost:3000'

def send_message(to, message):
    url = f'{API_URL}/send-message'
    payload = {
        'to': to,
        'message': message
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f'Message sent: {data["messageId"]}')
        return data
    else:
        print(f'Error: {response.text}')
        return None

# Usage
send_message('1234567890', 'Hello from Python!')
```

### Customer Service Bot

```python
class CustomerServiceBot:
    def __init__(self, api_url):
        self.api_url = api_url
        
    def send_message(self, to, message):
        response = requests.post(f'{self.api_url}/send-message', 
                               json={'to': to, 'message': message})
        return response.json()
    
    def handle_customer_inquiry(self, customer_phone, inquiry_type):
        responses = {
            'pricing': 'Our pricing starts at $99. Would you like a custom quote?',
            'support': 'Our support team is available 24/7. How can we help?',
            'shipping': 'We offer free shipping on orders over $50. Delivery takes 2-3 days.',
            'returns': 'We accept returns within 30 days. No questions asked!'
        }
        
        message = responses.get(inquiry_type, 'Thank you for your inquiry. Our team will contact you soon.')
        return self.send_message(customer_phone, message)

# Usage
bot = CustomerServiceBot('http://localhost:3000')
bot.handle_customer_inquiry('1234567890', 'pricing')
```

## Webhook Examples

### Express.js Webhook Handler

```javascript
app.post('/my-webhook', (req, res) => {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach(entry => {
            const changes = entry.changes?.[0];
            if (changes?.field === 'messages') {
                const messages = changes.value.messages;
                
                messages?.forEach(message => {
                    console.log('Received message:', message);
                    
                    // Process the message
                    processIncomingMessage(message);
                });
            }
        });
    }
    
    res.status(200).send('OK');
});

function processIncomingMessage(message) {
    const from = message.from;
    const messageType = message.type;
    
    if (messageType === 'text') {
        const text = message.text.body.toLowerCase();
        
        if (text.includes('hello') || text.includes('hi')) {
            sendWelcomeMessage(from);
        } else if (text.includes('price') || text.includes('quote')) {
            sendPricingInfo(from);
        } else if (text.includes('help')) {
            sendHelpMessage(from);
        }
    }
}
```

## Environment Variables Examples

### Production .env

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAABsBCS...your_production_token
WHATSAPP_PHONE_NUMBER_ID=489160957621782
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_VERSION=v22.0
WHATSAPP_VERIFY_TOKEN=your_secure_verify_token

# Wit.ai
WIT_AI_ACCESS_TOKEN=your_wit_ai_production_token

# Server
PORT=3000
NODE_ENV=production

# Optional: Database
DATABASE_URL=your_database_connection_string
```

### Development .env

```env
# WhatsApp Business API (Test)
WHATSAPP_ACCESS_TOKEN=EAABsBCS...your_test_token
WHATSAPP_PHONE_NUMBER_ID=489160957621782
WHATSAPP_BUSINESS_ACCOUNT_ID=your_test_business_account_id
WHATSAPP_VERSION=v22.0
WHATSAPP_VERIFY_TOKEN=test_verify_token

# Wit.ai (Development)
WIT_AI_ACCESS_TOKEN=your_wit_ai_dev_token

# Server
PORT=3000
NODE_ENV=development
```

## Testing Commands

### Test Message Sending

```bash
# Test basic functionality
npm test

# Test with specific phone number
node -e "
import('./test.js').then(() => {
    console.log('Test completed');
}).catch(console.error);
"

# Health check
curl http://localhost:3000/health
```

### Check Webhook

```bash
# Verify webhook
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test_challenge"

# Should return: test_challenge
```
