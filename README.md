# WhatsApp Business API Message System

A complete WhatsApp Business API integration with AI-powered message handling using Wit.ai.

## Features

- ✅ Send text messages
- ✅ Send template messages
- ✅ Send media messages (images, videos, documents, audio)
- ✅ Send interactive buttons and lists
- ✅ Receive and process incoming messages
- ✅ AI-powered message understanding with Wit.ai
- ✅ Webhook handling for real-time message processing
- ✅ ES6 modules support

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Update the `.env` file with your actual credentials:

```env
WHATSAPP_ACCESS_TOKEN=your_actual_access_token
WHATSAPP_PHONE_NUMBER_ID=489160957621782
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_VERSION=v22.0
WIT_AI_ACCESS_TOKEN=your_wit_ai_token
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
PORT=3000
```

### 3. WhatsApp Business API Setup

1. Create a Facebook Developer account
2. Create a new app and add WhatsApp Business API
3. Get your access token and phone number ID
4. Configure webhook URL: `https://your-domain.com/webhook`

### 4. Wit.ai Setup (Optional)

1. Create a Wit.ai account
2. Create a new app
3. Train intents like: `greeting`, `help`, `quote_request`, `product_inquiry`
4. Get your Wit.ai access token

## Usage

### Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### API Endpoints

#### Send Text Message
```bash
POST /send-message
Content-Type: application/json

{
    "to": "1234567890",
    "message": "Hello from WhatsApp Business API!"
}
```

#### Send Template Message
```bash
POST /send-template
Content-Type: application/json

{
    "to": "1234567890",
    "templateName": "hello_world",
    "languageCode": "en_US"
}
```

#### Send Media Message
```bash
POST /send-media
Content-Type: application/json

{
    "to": "1234567890",
    "mediaUrl": "https://example.com/image.jpg",
    "type": "image",
    "caption": "Check out this image!"
}
```

#### Health Check
```bash
GET /health
```

## Webhook Configuration

Set your webhook URL to: `https://your-domain.com/webhook`

The system will automatically:
- Verify webhook subscriptions
- Process incoming messages
- Use AI to understand message intent
- Respond appropriately based on message content

## AI Message Processing

The system uses Wit.ai to understand message intents:

- **Greeting**: Responds with welcome message
- **Help**: Provides assistance information
- **Quote Request**: Handles pricing inquiries
- **Product Inquiry**: Provides product information
- **Contact Info**: Shares business contact details

## File Structure

```
├── index.js                 # Main application file
├── services/
│   └── whatsappService.js   # WhatsApp API service
├── handlers/
│   └── messageHandler.js   # Message processing with AI
├── package.json            # Dependencies and scripts
├── .env                    # Environment configuration
└── README.md              # This file
```

## Error Handling

The system includes comprehensive error handling:
- API call failures
- Webhook processing errors
- Message sending failures
- Wit.ai integration errors

## Security

- Environment variables for sensitive data
- Webhook verification token
- CORS protection
- Input validation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License





