import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';
import FormData from 'form-data';
import mongoLogger from './mongoLogger.js';

class VoiceProcessingService {
    constructor() {
        // Only initialize OpenAI if API key is present
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
        } else {
            console.warn('⚠️ OPENAI_API_KEY not found - voice processing will be disabled');
            this.openai = null;
        }
        
        // Create temp directory for audio files (only in non-serverless environments)
        this.tempDir = path.join(process.cwd(), 'temp', 'audio');
        try {
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }
        } catch (error) {
            console.warn('⚠️ Could not create temp directory - using /tmp for serverless');
            this.tempDir = '/tmp';
        }
    }

    /**
     * Download audio file from WhatsApp media URL
     */
    async downloadAudioFile(mediaUrl, accessToken) {
        try {
            console.log('📥 Downloading audio file from WhatsApp...');
            
            // Use built-in fetch (Node.js 18+) or fallback
            const fetch = globalThis.fetch;
            if (!fetch) {
                throw new Error('Fetch API not available in this environment');
            }
            
            const response = await fetch(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to download audio: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            const fileName = `audio_${Date.now()}.ogg`;
            const filePath = path.join(this.tempDir, fileName);
            
            fs.writeFileSync(filePath, Buffer.from(buffer));
            console.log('✅ Audio file downloaded:', fileName);
            
            return filePath;
        } catch (error) {
            console.error('❌ Error downloading audio file:', error);
            await mongoLogger.logError(error, {
                source: 'voice-download',
                mediaUrl: mediaUrl
            });
            throw error;
        }
    }

    /**
     * Convert audio to text using OpenAI Whisper
     */
    async audioToText(audioFilePath) {
        try {
            if (!this.openai) {
                throw new Error('OpenAI not initialized - missing API key');
            }

            console.log('🎙️ Converting audio to text with Whisper...');
            
            const audioStream = fs.createReadStream(audioFilePath);
            
            const transcription = await this.openai.audio.transcriptions.create({
                file: audioStream,
                model: 'whisper-1',
                language: 'en', // Can be auto-detected by leaving this out
                response_format: 'json'
            });

            console.log('✅ Audio transcribed successfully');
            
            return {
                success: true,
                text: transcription.text,
                language: transcription.language || 'en',
                duration: transcription.duration || 0
            };

        } catch (error) {
            console.error('❌ Error transcribing audio:', error);
            await mongoLogger.logError(error, {
                source: 'voice-transcription',
                audioFilePath: audioFilePath
            });
            
            return {
                success: false,
                error: error.message,
                text: null
            };
        }
    }

    /**
     * Get media URL for WhatsApp audio message
     */
    async getWhatsAppMediaUrl(mediaId, accessToken) {
        try {
            const fetch = globalThis.fetch;
            if (!fetch) {
                throw new Error('Fetch API not available in this environment');
            }

            const response = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get media URL: ${response.statusText}`);
            }

            const data = await response.json();
            return data.url;
            
        } catch (error) {
            console.error('❌ Error getting WhatsApp media URL:', error);
            await mongoLogger.logError(error, {
                source: 'whatsapp-media-url',
                mediaId: mediaId
            });
            throw error;
        }
    }

    /**
     * Main method to process voice messages
     */
    async processVoiceMessage(audioMessage, accessToken) {
        let tempFilePath = null;
        
        try {
            if (!this.openai) {
                return {
                    success: false,
                    error: 'Voice processing not available - OpenAI API key not configured',
                    text: null
                };
            }

            console.log('🎵 Processing voice message:', audioMessage.id);
            
            // Step 1: Get media URL from WhatsApp
            const mediaUrl = await this.getWhatsAppMediaUrl(audioMessage.id, accessToken);
            console.log('📋 Got media URL from WhatsApp');
            
            // Step 2: Download audio file
            tempFilePath = await this.downloadAudioFile(mediaUrl, accessToken);
            
            // Step 3: Convert to text
            const transcriptionResult = await this.audioToText(tempFilePath);
            
            if (!transcriptionResult.success) {
                return transcriptionResult;
            }
            
            // Step 4: Calculate cost (approximate)
            const estimatedDuration = Math.max(1, transcriptionResult.duration || 30); // Default to 30 seconds
            const estimatedCost = this.estimateCost(estimatedDuration);
            
            await mongoLogger.info('Voice message processed successfully', {
                audioId: audioMessage.id,
                transcribedText: transcriptionResult.text,
                duration: estimatedDuration,
                estimatedCost: estimatedCost,
                language: transcriptionResult.language
            });
            
            return {
                success: true,
                text: transcriptionResult.text,
                language: transcriptionResult.language,
                duration: estimatedDuration,
                estimatedCost: estimatedCost
            };
            
        } catch (error) {
            console.error('❌ Error processing voice message:', error);
            await mongoLogger.logError(error, {
                source: 'voice-processing-main',
                audioMessageId: audioMessage.id
            });
            
            return {
                success: false,
                error: error.message,
                text: null
            };
            
        } finally {
            // Cleanup: Delete temporary file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    console.log('🧹 Temporary audio file cleaned up');
                } catch (cleanupError) {
                    console.error('⚠️ Failed to cleanup temp file:', cleanupError);
                }
            }
        }
    }

    /**
     * Alternative: Use Google Speech-to-Text (free tier available)
     * This is a placeholder for future implementation
     */
    async audioToTextGoogle(audioFilePath) {
        // TODO: Implement Google Speech-to-Text as alternative
        throw new Error('Google Speech-to-Text not implemented yet - use OpenAI Whisper');
    }

    /**
     * Get supported audio formats
     */
    getSupportedFormats() {
        return [
            'audio/ogg',
            'audio/mpeg',
            'audio/mp3',
            'audio/mp4',
            'audio/wav',
            'audio/webm',
            'audio/m4a'
        ];
    }

    /**
     * Estimate transcription cost (OpenAI Whisper pricing)
     */
    estimateCost(durationSeconds) {
        const pricePerMinute = 0.006; // $0.006 per minute
        const durationMinutes = durationSeconds / 60;
        return Math.round(durationMinutes * pricePerMinute * 1000) / 1000; // Round to 3 decimal places
    }

    /**
     * Check if voice processing is available
     */
    isAvailable() {
        return !!this.openai && !!process.env.OPENAI_API_KEY;
    }

    /**
     * Check service health for testing
     */
    async checkServiceHealth() {
        return {
            openaiConfigured: !!this.openai,
            apiKeyPresent: !!process.env.OPENAI_API_KEY,
            tempDirectoryAvailable: fs.existsSync(this.tempDir)
        };
    }
}

export default new VoiceProcessingService();