// Simple test to verify core functionality without voice processing
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing basic imports and configuration...');

try {
    console.log('✅ Express imported successfully');
    
    const testEnvVars = [
        'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_PHONE_NUMBER_ID',
        'OPENAI_API_KEY',
        'MONGODB_URI'
    ];
    
    testEnvVars.forEach(envVar => {
        if (process.env[envVar]) {
            console.log(`✅ ${envVar}: Configured`);
        } else {
            console.log(`❌ ${envVar}: Missing`);
        }
    });
    
    console.log('\n🚀 Testing voice processing service import...');
    
    const { default: voiceProcessingService } = await import('./services/voiceProcessingService.js');
    console.log('✅ Voice processing service imported successfully');
    console.log('📊 Service available:', voiceProcessingService.isAvailable());
    
    console.log('\n🔄 Testing message handler import...');
    
    // Try importing the main components one by one to isolate issues
    const { default: WhatsAppService } = await import('./services/whatsappService.js');
    console.log('✅ WhatsApp service imported successfully');
    
    const { default: mongoLogger } = await import('./services/mongoLogger.js');
    console.log('✅ MongoDB logger imported successfully');
    
    const { default: MessageHandler } = await import('./handlers/messageHandler.js');
    console.log('✅ Message handler imported successfully');
    
    console.log('\n🎯 All core components imported successfully!');
    console.log('✅ The application should work on Vercel');
    
} catch (error) {
    console.error('❌ Import test failed:', error);
    console.error('🔧 This is likely the cause of the Vercel crash');
    console.error('📋 Error details:', error.message);
    console.error('📍 Stack trace:', error.stack);
}