import express from 'express';
import jwt from 'jsonwebtoken';
import mongoLogger from '../../services/mongoLogger.js';

const router = express.Router();

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Default admin user (in production, store in database)
const ADMIN_USER = {
    id: 1,
    username: 'admin',
    email: 'admin@quoteai.com',
    role: 'admin',
    name: 'Administrator'
};

// Verify token endpoint
router.get('/', async (req, res) => {
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

export default router;
