import CryptoJS from 'crypto-js';

class EncryptionService {
    constructor() {
        // Get secret key from environment variable or use default
        this.secretKey = process.env.ENCRYPTION_SECRET || 'your-secret-key-change-this-in-production';
        
        // Ensure secret key is at least 32 characters for AES-256
        if (this.secretKey.length < 32) {
            this.secretKey = this.secretKey.padEnd(32, '0');
        }
    }

    // Encrypt text
    encrypt(text) {
        if (!text || text === null || text === undefined) {
            return text;
        }
        
        try {
            const encrypted = CryptoJS.AES.encrypt(text.toString(), this.secretKey).toString();
            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            return text; // Return original text if encryption fails
        }
    }

    // Decrypt text
    decrypt(encryptedText) {
        if (!encryptedText || encryptedText === null || encryptedText === undefined) {
            return encryptedText;
        }
        
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedText, this.secretKey).toString(CryptoJS.enc.Utf8);
            return decrypted || encryptedText; // Return original if decryption fails
        } catch (error) {
            console.error('Decryption error:', error);
            return encryptedText; // Return original text if decryption fails
        }
    }

    // Encrypt user object
    encryptUser(user) {
        if (!user) return user;
        
        const encryptedUser = { ...user };
        
        // Only encrypt phone field for privacy
        if (encryptedUser.phone) {
            encryptedUser.phone = this.encrypt(encryptedUser.phone);
        }
        // Name and email are not encrypted for better functionality
        
        return encryptedUser;
    }

    // Decrypt user object
    decryptUser(user) {
        if (!user) return user;
        
        try {
            const decryptedUser = { ...user };
            
            // Only decrypt phone field
            if (decryptedUser.phone) {
                decryptedUser.phone = this.decrypt(decryptedUser.phone);
            }
            // Name and email are not encrypted, so no decryption needed
            
            return decryptedUser;
        } catch (error) {
            console.error('Error decrypting user:', error);
            return user; // Return original user if decryption fails
        }
    }

    // Encrypt array of users
    encryptUsers(users) {
        if (!Array.isArray(users)) return users;
        return users.map(user => this.encryptUser(user));
    }

    // Decrypt array of users
    decryptUsers(users) {
        if (!Array.isArray(users)) return users;
        return users.map(user => this.decryptUser(user));
    }

    // Check if text is encrypted (basic check)
    isEncrypted(text) {
        if (!text || typeof text !== 'string') return false;
        // Basic check: encrypted text usually contains special characters and is longer
        return text.includes('=') && text.length > 20;
    }
}

// Create singleton instance
const encryptionService = new EncryptionService();

export default encryptionService;
