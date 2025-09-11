import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoLogger from '../services/mongoLogger.js';

const router = express.Router();

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '24h';

// Default admin user (in production, store in database)
const ADMIN_USER = {
    id: 1,
    username: 'admin',
    password: '$2a$10$xHtcCyoRU98dEIuKYL0E2OslNqLcyQcJv1TzVljGxmUNquq5kxMQq', // 'admin123'
    email: 'admin@quoteai.com',
    role: 'admin',
    name: 'Administrator',
    createdAt: new Date()
};

// Hash password for new admin (run this once to generate hash)
// const hashedPassword = await bcrypt.hash('admin123', 10);
// console.log('Hashed password:', hashedPassword);

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        
        // Check credentials
        if (username !== ADMIN_USER.username) {
            console.log(`Failed login attempt for username: ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, ADMIN_USER.password);
        if (!isValidPassword) {
            console.log(`Failed password for username: ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: ADMIN_USER.id, 
                username: ADMIN_USER.username,
                role: ADMIN_USER.role 
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Log successful login
        console.log(`Successful login for user: ${username}`);
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: ADMIN_USER.id,
                username: ADMIN_USER.username,
                email: ADMIN_USER.email,
                name: ADMIN_USER.name,
                role: ADMIN_USER.role
            }
        });
        
    } catch (error) {
        await mongoLogger.logError(error, { endpoint: 'login' });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Check if user still exists (in production, check database)
            if (decoded.username !== ADMIN_USER.username) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token'
                });
            }
            
            res.json({
                success: true,
                user: {
                    id: decoded.userId,
                    username: decoded.username,
                    role: decoded.role
                }
            });
            
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
    } catch (error) {
        await mongoLogger.logError(error, { endpoint: 'verify-token' });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                await mongoLogger.logInfo(`User logout: ${decoded.username}`, {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            } catch (jwtError) {
                // Token might be expired, but that's okay for logout
            }
        }
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        await mongoLogger.logError(error, { endpoint: 'logout' });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Change password endpoint
router.post('/change-password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        const token = authHeader.substring(7);
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, ADMIN_USER.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            
            // In production, update password in database
            // For now, we'll just log the change
            await mongoLogger.logInfo(`Password change requested for user: ${decoded.username}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            res.json({
                success: true,
                message: 'Password change request logged. Please update the password in the server configuration.'
            });
            
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        
    } catch (error) {
        await mongoLogger.logError(error, { endpoint: 'change-password' });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
