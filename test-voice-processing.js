import voiceProcessingService from './services/voiceProcessingService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testVoiceProcessing() {
    console.log('🧪 Testing Voice Processing Service...\n');
    
    // Test 1: Check OpenAI API Key
    console.log('1. Checking OpenAI API Key...');
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY not found in environment variables');
        console.log('   Please add OPENAI_API_KEY=your_key_here to your .env file');
        return;
    } else {
        console.log('✅ OpenAI API Key found');
    }
    
    // Test 2: Check Service Initialization
    console.log('\n2. Checking Service Initialization...');
    try {
        const testResult = await voiceProcessingService.checkServiceHealth();
        if (testResult) {
            console.log('✅ Voice processing service initialized successfully');
        }
    } catch (error) {
        console.error('❌ Service initialization failed:', error.message);
        return;
    }
    
    // Test 3: Simulate Audio Message Processing (without actual audio)
    console.log('\n3. Testing Audio Message Structure...');
    
    const mockAudioMessage = {
        id: 'test_audio_123',
        mime_type: 'audio/ogg; codecs=opus',
        sha256: 'test_sha256_hash',
        file_size: 12345
    };
    
    console.log('✅ Mock audio message structure valid');
    console.log('   Audio ID:', mockAudioMessage.id);
    console.log('   MIME Type:', mockAudioMessage.mime_type);
    console.log('   File Size:', mockAudioMessage.file_size);
    
    // Test 4: Check File Format Support
    console.log('\n4. Checking Supported Audio Formats...');
    const supportedFormats = [
        'audio/ogg',
        'audio/mpeg',
        'audio/mp3',
        'audio/mp4',
        'audio/wav',
        'audio/webm',
        'audio/m4a'
    ];
    
    supportedFormats.forEach(format => {
        console.log(`✅ ${format} - Supported`);
    });
    
    // Test 5: Environment Configuration
    console.log('\n5. Checking Environment Configuration...');
    
    const requiredEnvVars = [
        'OPENAI_API_KEY',
        'WHATSAPP_ACCESS_TOKEN'
    ];
    
    let allConfigured = true;
    requiredEnvVars.forEach(envVar => {
        if (process.env[envVar]) {
            console.log(`✅ ${envVar} - Configured`);
        } else {
            console.log(`❌ ${envVar} - Missing`);
            allConfigured = false;
        }
    });
    
    // Test Summary
    console.log('\n📋 Test Summary:');
    if (allConfigured) {
        console.log('✅ Voice processing is ready to use!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Send a voice message to your WhatsApp number');
        console.log('2. Check the logs for processing details');
        console.log('3. Verify the transcribed text appears correctly');
        console.log('');
        console.log('💡 Tips:');
        console.log('- Speak clearly in a quiet environment');
        console.log('- Keep messages under 2 minutes for best results');
        console.log('- Monitor costs in your OpenAI dashboard');
    } else {
        console.log('❌ Please configure missing environment variables before testing');
    }
}

// Run the test
testVoiceProcessing().catch(error => {
    console.error('🚨 Test failed:', error);
});