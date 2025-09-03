# Vercel Deployment Guide

## Quick Deploy to Vercel

### 1. Prerequisites
- Vercel account (sign up at vercel.com)
- Vercel CLI installed: `npm i -g vercel`
- Your WhatsApp Business API credentials

### 2. Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=489160957621782
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_VERSION=v22.0
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WIT_AI_ACCESS_TOKEN=your_wit_ai_token_here
NODE_ENV=production
```

### 3. Deploy Commands

#### Option 1: Deploy with Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project directory)
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: whatsapp-message-system
# - Directory: ./
# - Override settings? No
```

#### Option 2: Deploy with Git Integration
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to vercel.com/dashboard
3. Click "New Project"
4. Import your repository
5. Add environment variables
6. Click "Deploy"

### 4. Configure WhatsApp Webhook

After deployment, update your WhatsApp webhook URL to:
```
https://your-vercel-app-name.vercel.app/webhook
```

### 5. Vercel Domain Setup

Your app will be available at:
- `https://your-app-name.vercel.app`
- Custom domain (optional): Configure in Vercel dashboard

### 6. Testing Production Deployment

#### Health Check
```bash
curl https://your-app-name.vercel.app/health
```

#### Send Test Message
```bash
curl -X POST https://your-app-name.vercel.app/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "message": "Hello from Vercel!"
  }'
```

### 7. Monitoring and Logs

- **Function Logs**: Available in Vercel dashboard
- **Real-time Logs**: Use `vercel logs` command
- **Analytics**: Built-in Vercel analytics

### 8. Environment-Specific Configurations

#### Development
```bash
vercel dev  # Run locally with Vercel environment
```

#### Production
```bash
vercel --prod  # Deploy to production
```

### 9. Troubleshooting

#### Common Issues:

1. **Environment Variables Not Loading**
   - Check Vercel dashboard environment variables
   - Redeploy after adding variables

2. **Module Import Errors**
   - Ensure all files use ES module imports
   - Check file extensions (.js)

3. **Timeout Issues**
   - Functions timeout after 30 seconds (configured in vercel.json)
   - Use async/await properly

4. **Webhook Verification Failed**
   - Check WHATSAPP_VERIFY_TOKEN matches
   - Ensure webhook URL is correct

### 10. Performance Optimization

- **Cold Starts**: First request may be slower
- **Function Regions**: Configured to use `iad1` (US East)
- **Caching**: Static files automatically cached

### 11. Security Best Practices

- Never commit `.env` files
- Use Vercel environment variables for secrets
- Enable HTTPS only (automatic on Vercel)
- Validate webhook signatures

### 12. Scaling

- **Serverless**: Automatically scales with traffic
- **Concurrent Executions**: Up to 1000 by default
- **Rate Limiting**: Implement if needed for WhatsApp API limits

### 13. Local Development with Vercel

```bash
# Install dependencies
npm install

# Start Vercel development server
vercel dev

# The app will run on http://localhost:3000
```

This replicates the Vercel serverless environment locally.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API token | `EAABsBCS...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID | `489160957621782` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Business account ID | `123456789` |
| `WHATSAPP_VERSION` | API version | `v22.0` |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token | `my_verify_token` |
| `WIT_AI_ACCESS_TOKEN` | Wit.ai access token | `YOUR_WIT_TOKEN` |
| `NODE_ENV` | Environment | `production` |

## API Endpoints

After deployment, your endpoints will be:

- `GET /` - Server status
- `GET /health` - Health check
- `GET /webhook` - Webhook verification
- `POST /webhook` - Receive messages
- `POST /send-message` - Send text message
- `POST /send-template` - Send template message
- `POST /send-media` - Send media message
- `POST /send-buttons` - Send button message

## Support

For issues with:
- **Vercel**: Check Vercel documentation
- **WhatsApp API**: Check Meta Developer documentation
- **This Application**: Check logs and error messages
