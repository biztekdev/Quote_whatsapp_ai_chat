import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoLogger from '../../services/mongoLogger.js';

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

// Login endpoint
router.post('/', async (req, res) => {
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

export default router;
