# Voice Processing Setup Guide

## Overview

This system now supports voice-to-text processing for WhatsApp audio messages using OpenAI Whisper. When users send voice messages, they are automatically transcribed and processed through the normal quote flow.

## Features

- **Automatic Voice-to-Text**: WhatsApp audio messages are converted to text using OpenAI Whisper
- **Multi-format Support**: Supports various audio formats (OGG, MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM)
- **Smart Processing**: Transcribed text is processed through the same ChatGPT entity extraction pipeline
- **User Feedback**: Users receive confirmation of what was transcribed
- **Error Handling**: Graceful fallback with helpful error messages
- **Cost Tracking**: Logs transcription costs and duration for monitoring

## Setup Instructions

### 1. Environment Variables

Add the following environment variable to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. OpenAI API Key Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

### 3. Install Required Dependencies

The following dependencies should already be installed:
- `openai` - For Whisper API access
- `fs/promises` - For file operations
- `path` - For file path handling

If not installed, run:
```bash
npm install openai
```

## How It Works

### Flow Diagram

```
Voice Message → Download Audio → Convert to Text → Entity Extraction → Quote Flow
     ↓              ↓               ↓                ↓                 ↓
  User sends    WhatsApp API    OpenAI Whisper   ChatGPT GPT-4    Normal Processing
  audio msg     downloads       transcribes      extracts info     continues...
```

### Detailed Process

1. **Audio Reception**: WhatsApp webhook receives audio message
2. **Immediate Acknowledgment**: User gets instant "Converting..." message  
3. **Audio Download**: System downloads audio file from WhatsApp
4. **Voice-to-Text**: OpenAI Whisper transcribes the audio
5. **Transcription Confirmation**: User sees "I heard: [text]" message
6. **Entity Extraction**: Transcribed text sent to ChatGPT for processing
7. **Quote Flow**: Normal quote processing continues with extracted data
8. **Cleanup**: Temporary audio files are automatically deleted

## Supported Audio Formats

- **OGG Opus** (WhatsApp default)
- **MP3**
- **MP4**
- **MPEG**
- **MPGA**
- **M4A**
- **WAV**
- **WEBM**

## Error Handling

### Common Error Scenarios

1. **API Key Missing**: Service returns error, user gets type-instead message
2. **Network Issues**: Retry logic with exponential backoff
3. **Unsupported Format**: User gets format error message
4. **Audio Too Long**: Files >25MB are rejected (Whisper limit)
5. **Transcription Failed**: User gets retry suggestion with quiet environment tip

### Error Messages

- ✅ Success: "🎯 I heard: '[transcribed text]'"
- ❌ General Error: "Sorry, I couldn't understand your voice message. Could you please type your message instead?"
- 🔄 Retry: "Try sending the voice message again - make sure you're in a quiet environment."

## Cost Monitoring

### Whisper Pricing
- $0.006 per minute of audio
- Average 30-second message = ~$0.003
- 1000 messages/month ≈ $3

### Logging
All voice processing events are logged with:
- Transcription cost
- Audio duration
- Processing time
- Success/failure rates

## Configuration Options

In `config/config.js`:

```javascript
openai: {
    apiKey: process.env.OPENAI_API_KEY,
    whisperModel: 'whisper-1',
    gptModel: 'gpt-4-turbo-preview'
}
```

## Testing

### Test Voice Messages

Send WhatsApp voice messages with:

1. **Simple Quote Request**: "I need a quote for 100 business cards"
2. **Complex Request**: "Hi, can you give me pricing for 500 flyers, 8.5x11 size, with matte finish?"
3. **Multi-language**: Test in different languages (Whisper supports 50+ languages)

### Monitoring

Check logs for:
- Voice processing success rates
- Transcription accuracy
- Cost per transcription
- Error patterns

## Troubleshooting

### Common Issues

1. **"Service Unavailable"**
   - Check OpenAI API key
   - Verify account has credits
   - Check network connectivity

2. **"Format Not Supported"**
   - WhatsApp should send OGG Opus by default
   - May indicate webhook format issues

3. **"Transcription Empty"**
   - Audio may be too quiet
   - Check for silence detection
   - User may need to speak louder

4. **High Processing Time**
   - Large audio files take longer
   - Network latency to OpenAI
   - Consider file size limits

### Debug Commands

```bash
# Check OpenAI connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test webhook reception
curl -X POST http://localhost:5000/webhook -H "Content-Type: application/json" -d '{"test":"audio"}'

# Monitor logs
tail -f temp/log.txt
```

## Performance Metrics

### Expected Performance
- **Transcription Time**: 2-5 seconds for 30-second audio
- **Accuracy**: 95%+ for clear English audio
- **Supported Languages**: 50+ languages with varying accuracy
- **File Size Limit**: 25MB (Whisper API limit)

### Optimization Tips
1. Encourage users to speak clearly
2. Suggest quiet environments for recording
3. Monitor transcription accuracy by language
4. Consider caching for repeated similar audio

## Security Notes

- Audio files are temporarily stored and immediately deleted
- No audio content is permanently stored
- OpenAI processes audio according to their data usage policies
- Consider implementing rate limiting for voice messages

## Future Enhancements

1. **Language Detection**: Auto-detect audio language
2. **Speaker Identification**: Support multiple speakers
3. **Audio Quality Enhancement**: Pre-process audio for better transcription
4. **Custom Models**: Train on business-specific terminology
5. **Real-time Processing**: Streaming transcription for long messages

## Support

For issues with voice processing:
1. Check OpenAI API status
2. Verify environment variables
3. Review logs in `temp/log.txt`
4. Test with simple voice messages first
5. Contact support with specific error messages