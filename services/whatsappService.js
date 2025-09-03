import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class WhatsAppService {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.version = process.env.WHATSAPP_VERSION || 'v22.0';
        this.baseURL = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}`;
    }

    // Send a text message
    async sendMessage(to, message, type = 'text') {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: type,
                text: {
                    body: message
                }
            };

            const response = await axios.post(
                `${this.baseURL}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Message sent successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error sending message:', error.response?.data || error.message);
            throw error;
        }
    }

    // Send a template message
    async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    },
                    components: components
                }
            };

            const response = await axios.post(
                `${this.baseURL}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Template message sent successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error sending template message:', error.response?.data || error.message);
            throw error;
        }
    }

    // Send media message (image, video, document, audio)
    async sendMediaMessage(to, mediaUrl, type, caption = '') {
        try {
            const mediaPayload = {
                link: mediaUrl
            };

            if (caption && (type === 'image' || type === 'video' || type === 'document')) {
                mediaPayload.caption = caption;
            }

            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: type,
                [type]: mediaPayload
            };

            const response = await axios.post(
                `${this.baseURL}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Media message sent successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error sending media message:', error.response?.data || error.message);
            throw error;
        }
    }

    // Send interactive button message
    async sendButtonMessage(to, bodyText, buttons) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: {
                        text: bodyText
                    },
                    action: {
                        buttons: buttons
                    }
                }
            };

            const response = await axios.post(
                `${this.baseURL}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Button message sent successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error sending button message:', error.response?.data || error.message);
            throw error;
        }
    }

    // Send list message
    async sendListMessage(to, bodyText, buttonText, sections) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    body: {
                        text: bodyText
                    },
                    action: {
                        button: buttonText,
                        sections: sections
                    }
                }
            };

            const response = await axios.post(
                `${this.baseURL}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('List message sent successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error sending list message:', error.response?.data || error.message);
            throw error;
        }
    }

    // Mark message as read
    async markAsRead(messageId) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId
            };

            const response = await axios.post(
                `${this.baseURL}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Message marked as read:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error marking message as read:', error.response?.data || error.message);
            throw error;
        }
    }

    // Get media URL
    async getMediaUrl(mediaId) {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/${this.version}/${mediaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            return response.data.url;
        } catch (error) {
            console.error('Error getting media URL:', error.response?.data || error.message);
            throw error;
        }
    }

    // Download media
    async downloadMedia(mediaUrl) {
        try {
            const response = await axios.get(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                responseType: 'stream'
            });

            return response.data;
        } catch (error) {
            console.error('Error downloading media:', error.response?.data || error.message);
            throw error;
        }
    }
}

export default WhatsAppService;
