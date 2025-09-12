export const config = {
    whatsapp: {
        version: process.env.WHATSAPP_VERSION || 'v23.0',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '489160957621782',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token',
        baseUrl: `https://graph.facebook.com/${process.env.WHATSAPP_VERSION || 'v23.0'}`
    },
    wit: {
        accessToken: process.env.WIT_AI_ACCESS_TOKEN
    },
    server: {
        port: process.env.PORT || 5000,
        environment: process.env.NODE_ENV || 'development'
    },
    messages: {
        defaultResponses: {
            greeting: "Hello! 👋 Welcome to our business. How can I help you today?",
            help: "I can help you with product information, quotes, and general inquiries. Just ask me anything!",
            error: "Sorry, something went wrong. Please try again or contact our support team.",
            notUnderstood: "I'm not sure I understand. Could you please rephrase your question?"
        },
        businessInfo: {
            name: "Your Business Name",
            phone: "Your Business Phone",
            email: "your-email@business.com",
            website: "https://your-website.com",
            address: "Your Business Address",
            hours: "Monday-Friday: 9AM-6PM, Saturday: 9AM-2PM, Sunday: Closed"
        }
    }
};

export default config;
