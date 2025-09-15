# 🎤 Audio Processing Setup Guide

This guide will help you set up audio message processing for your WhatsApp Business API integration. The system will automatically convert voice messages to text and process them through your existing conversation flow.

## 🚀 Features

- ✅ **WhatsApp Audio Download**: Automatically download voice messages from WhatsApp
- ✅ **Format Conversion**: Convert various audio formats to WAV for optimal processing
- ✅ **Speech-to-Text**: Convert speech to text using OpenAI Whisper API
- ✅ **Conversation Integration**: Process transcribed text through existing conversation flow
- ✅ **Error Handling**: Robust error handling with user-friendly messages
- ✅ **Cleanup**: Automatic cleanup of temporary files

## 📋 Prerequisites

### Required Environment Variables

Add these to your `.env` file:

```env
# OpenAI API Configuration (Required for Speech-to-Text)
OPENAI_API_KEY=sk-your-openai-api-key-here

# WhatsApp API (Already configured)
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```

### Getting OpenAI API Key

1. Go to [OpenAI API Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your OpenAI account
3. Create a new API key
4. Copy the key and add it to your `.env` file
5. **Important**: Make sure you have credits in your OpenAI account

### Pricing Information

- **OpenAI Whisper API**: $0.006 per minute of audio
- Very affordable for most use cases
- Example: 100 minutes of audio = $0.60

## 🛠️ Installation

The required packages are already installed:

```bash
npm install multer ffmpeg-static fluent-ffmpeg openai @google-cloud/speech node-fetch form-data
```

## 🔧 Configuration Status

Check your configuration status:

```bash
# Check audio processing status
curl http://localhost:5001/audio/status

# Test audio processing
curl -X POST http://localhost:5001/audio/test
```

## 🎯 How It Works

### 1. User Sends Voice Message
- User sends a voice message via WhatsApp
- System receives webhook with audio message details

### 2. Audio Processing Pipeline
```
Voice Message → Download → Convert to WAV → Speech-to-Text → Process Text → Respond
```

### 3. User Experience
```
User: [Sends voice message: "Hello, I need a quote for mylar bags"]
Bot: 🎤 I received your voice message! Let me convert it to text and process it for you...
Bot: 🎯 I heard: "Hello, I need a quote for mylar bags"

Processing your request now...
Bot: Hello! 👋 Welcome to our Mylar Bag service! 
     We specialize in high-quality mylar bags for all your packaging needs.
     Would you like to get a quote for mylar bags today?
     [Yes, Get Quote] [No, Thanks]
```

## 📁 File Structure

```
services/
├── audioProcessingService.js     # Main audio processing service
├── mongoLogger.js               # Logging service
└── whatsappService.js          # WhatsApp API service

handlers/
└── messageHandler.js           # Updated with audio processing

temp/
└── audio/                     # Temporary audio files (auto-cleanup)
```

## 🔍 Testing Audio Processing

### 1. Check Service Status
```javascript
// Check if everything is configured
const status = await audioProcessingService.getStatus();
console.log(status);
```

### 2. Test with WhatsApp
1. Send a voice message to your WhatsApp Business number
2. Check the logs to see the processing pipeline
3. Verify the transcription and response

### 3. Monitor Logs
```bash
# Check recent logs
curl http://localhost:5001/api/logs/recent

# Check for audio-related logs
curl "http://localhost:5001/api/logs/search?q=audio"
```

## 🚨 Error Handling

The system handles various error scenarios:

### 1. Missing OpenAI API Key
```
"Speech-to-text service is not configured. Please try typing your message instead."
```

### 2. Audio Download Failed
```
"I couldn't download your audio file. Please try sending it again."
```

### 3. Audio Conversion Failed
```
"I had trouble converting your audio. Please try recording again or type your message."
```

### 4. General Errors
```
"Sorry, I had trouble processing your voice message. Please try again or type your message instead."
```

## 🔧 Advanced Configuration

### Google Speech-to-Text Fallback (Optional)

If you want to add Google Speech-to-Text as a fallback:

1. Set up Google Cloud Speech-to-Text API
2. Download service account key file
3. Add to environment:
```env
GOOGLE_CLOUD_KEY_FILE=path/to/your/service-account-key.json
```

### Audio Quality Settings

The system automatically optimizes audio for speech recognition:
- **Format**: WAV
- **Codec**: PCM 16-bit
- **Channels**: Mono (1 channel)
- **Sample Rate**: 16kHz

## 📊 Monitoring & Analytics

### Audio Processing Metrics
- Total voice messages processed
- Average processing time
- Success/failure rates
- Most common transcription errors

### Dashboard Integration
The audio processing status is integrated into your dashboard:
- Real-time processing status
- Error logs and troubleshooting
- Performance metrics

## 🔐 Security Considerations

1. **Temporary Files**: All audio files are automatically cleaned up after processing
2. **API Keys**: Store securely in environment variables
3. **Audio Content**: Not stored permanently, only processed
4. **Transcriptions**: Logged securely in MongoDB

## 🚀 Production Deployment

### Vercel Configuration
Add environment variables in Vercel dashboard:
```
OPENAI_API_KEY=sk-your-key-here
```

### Performance Optimization
- Audio files are processed asynchronously
- Temporary files are cleaned up immediately
- Error handling prevents system crashes

## 📞 Support & Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Solution: Add `OPENAI_API_KEY` to your `.env` file

2. **"Failed to download audio"**
   - Check WhatsApp access token
   - Verify network connectivity

3. **"Audio conversion failed"**
   - Check if ffmpeg is properly installed
   - Verify audio file is not corrupted

### Debug Mode
Enable detailed logging:
```env
DEBUG=audio-processing
```

### Contact Support
- Check logs: `/api/logs`
- Test endpoint: `/audio/test`
- Status check: `/audio/status`

## 🎉 You're Ready!

Your WhatsApp bot can now:
- ✅ Receive voice messages
- ✅ Convert speech to text
- ✅ Process requests naturally
- ✅ Provide same great service via voice or text

Send a voice message to your WhatsApp Business number and watch the magic happen! 🎤✨
