import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

class Database {
    static instance;
    
    constructor() {
        if (Database.instance) {
            return Database.instance;
        }
        
        this.connection = null;
        Database.instance = this;
    }
    
    async connect() {
        try {
            if (this.connection) {
                console.log('📊 Database already connected');
                return this.connection;
            }
            
            const mongoUri = process.env.MONGODB_URI;
            
            if (!mongoUri) {
                throw new Error('MONGODB_URI environment variable is not set');
            }
            
            console.log('🔄 Connecting to MongoDB...');
            
            this.connection = await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000, // 5 seconds timeout
                socketTimeoutMS: 45000, // 45 seconds socket timeout
            });
            
            console.log('✅ MongoDB connected successfully');
            console.log(`📍 Connected to database: ${this.connection.connection.name}`);
            
            // Handle connection events
            mongoose.connection.on('error', (error) => {
                console.error('❌ MongoDB connection error:', error);
            });
            
            mongoose.connection.on('disconnected', () => {
                console.log('📡 MongoDB disconnected');
            });
            
            mongoose.connection.on('reconnected', () => {
                console.log('🔄 MongoDB reconnected');
            });
            
            return this.connection;
            
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            
            // Provide helpful error messages
            if (error.message.includes('MONGODB_URI')) {
                console.log('💡 Please set your MONGODB_URI in the .env file');
                console.log('   Example: MONGODB_URI=mongodb+srv://username:password@cluster0.abcde.mongodb.net/whatsapp_webhooks');
            } else if (error.name === 'MongoServerSelectionError') {
                console.log('💡 Check your MongoDB connection string and network connectivity');
                console.log('   Make sure your IP is whitelisted in MongoDB Atlas');
            }
            
            throw error;
        }
    }
    
    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.disconnect();
                this.connection = null;
                console.log('👋 MongoDB disconnected');
            }
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error);
        }
    }
    
    getConnection() {
        return this.connection;
    }
    
    isConnected() {
        return mongoose.connection.readyState === 1;
    }
}

// Create and export singleton instance
const database = new Database();
export default database;

// Helper function for easy importing
export const connectDB = () => database.connect();
export const disconnectDB = () => database.disconnect();
export const isDBConnected = () => database.isConnected();
