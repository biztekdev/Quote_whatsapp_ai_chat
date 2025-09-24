import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';
import fetch from 'node-fetch';
import FormData from 'form-data';
import mongoLogger from './mongoLogger.js';

class VoiceProcessingService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Create temp directory for audio files
        this.tempDir = path.join(process.cwd(), 'temp', 'audio');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Download audio file from WhatsApp media URL
     */
    async downloadAudioFile(mediaUrl, accessToken) {
        try {
            console.log('📥 Downloading audio file from WhatsApp...');
            
            const response = await fetch(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to download audio: ${response.statusText}`);
            }

            const buffer = await response.buffer();
            const fileName = `audio_${Date.now()}.ogg`;
            const filePath = path.join(this.tempDir, fileName);
            
            fs.writeFileSync(filePath, buffer);
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
            console.log('🎙️ Converting audio to text using Whisper...');
            
            // Check if file exists and get size
            const stats = fs.statSync(audioFilePath);
            console.log(`📊 Audio file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            
            // Whisper supports many formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(audioFilePath),
                model: "whisper-1",
                language: "en", // Can be auto-detected or specify: en, ur, ar, etc.
                response_format: "json",
                temperature: 0.0 // More deterministic output
            });

            console.log('✅ Audio transcribed successfully');
            console.log('📝 Transcription:', transcription.text);

            // Log the transcription
            await mongoLogger.info('Voice transcription completed', {
                source: 'whisper-transcription',
                text: transcription.text,
                duration: transcription.duration || 'unknown',
                language: transcription.language || 'en'
            });

            return {
                success: true,
                text: transcription.text.trim(),
                language: transcription.language || 'en',
                duration: transcription.duration
            };

        } catch (error) {
            console.error('❌ Error transcribing audio:', error);
            await mongoLogger.logError(error, {
                source: 'whisper-transcription',
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
     * Process WhatsApp voice message
     */
    async processVoiceMessage(audioMessage, accessToken) {
        let audioFilePath = null;
        
        try {
            console.log('🎵 Processing WhatsApp voice message...');
            
            // Download audio file from WhatsApp
            audioFilePath = await this.downloadAudioFile(audioMessage.url || audioMessage.media_url, accessToken);
            
            // Convert to text
            const transcriptionResult = await this.audioToText(audioFilePath);
            
            if (!transcriptionResult.success) {
                return {
                    success: false,
                    error: 'Failed to transcribe audio',
                    text: null
                };
            }

            // Check if transcription is meaningful
            if (!transcriptionResult.text || transcriptionResult.text.length < 3) {
                return {
                    success: false,
                    error: 'Audio transcription too short or empty',
                    text: transcriptionResult.text
                };
            }

            console.log('🎯 Voice processing completed successfully');
            
            return {
                success: true,
                text: transcriptionResult.text,
                language: transcriptionResult.language,
                duration: transcriptionResult.duration,
                originalAudio: {
                    id: audioMessage.id,
                    mime_type: audioMessage.mime_type,
                    sha256: audioMessage.sha256
                }
            };

        } catch (error) {
            console.error('❌ Error processing voice message:', error);
            await mongoLogger.logError(error, {
                source: 'voice-processing',
                audioMessage: audioMessage
            });

            return {
                success: false,
                error: error.message,
                text: null
            };
        } finally {
            // Clean up temporary audio file
            if (audioFilePath && fs.existsSync(audioFilePath)) {
                try {
                    fs.unlinkSync(audioFilePath);
                    console.log('🗑️ Cleaned up temp audio file');
                } catch (cleanupError) {
                    console.error('⚠️ Failed to cleanup audio file:', cleanupError);
                }
            }
        }
    }

    /**
     * Alternative: Use Google Cloud Speech-to-Text (if you want to try free tier)
     */
    async audioToTextGoogle(audioFilePath) {
        // Implement Google Cloud Speech-to-Text if needed
        // This would require: npm install @google-cloud/speech
        throw new Error('Google Speech-to-Text not implemented. Use Whisper instead.');
    }

    /**
     * Get supported audio formats
     */
    getSupportedFormats() {
        return [
            'audio/ogg',
            'audio/mpeg', // mp3
            'audio/mp4',
            'audio/wav',
            'audio/webm',
            'audio/amr' // WhatsApp voice messages
        ];
    }

    /**
     * Estimate cost for audio processing
     */
    estimateCost(durationSeconds) {
        // Whisper API costs $0.006 per minute
        const minutes = Math.ceil(durationSeconds / 60);
        const cost = minutes * 0.006;
        
        return {
            minutes: minutes,
            estimatedCost: cost,
            currency: 'USD'
        };
    }
}

export default new VoiceProcessingService();