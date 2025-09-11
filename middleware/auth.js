import jwt from 'jsonwebtoken';
import mongoLogger from '../services/mongoLogger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Authentication middleware
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            } else {
                throw jwtError;
            }
        }
        
    } catch (error) {
        await mongoLogger.logError(error, { 
            endpoint: 'auth-middleware',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded;
            } catch (jwtError) {
                // Token is invalid, but we don't fail the request
                req.user = null;
            }
        } else {
            req.user = null;
        }
        
        next();
        
    } catch (error) {
        await mongoLogger.logError(error, { 
            endpoint: 'optional-auth-middleware',
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        // Don't fail the request for optional auth
        req.user = null;
        next();
    }
};

// Role-based authorization middleware
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }
        
        next();
    };
};

// Admin only middleware
export const requireAdmin = requireRole(['admin']);

export default {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireAdmin
};
