# MongoDB Atlas Setup Guide

## 🚀 Setting up MongoDB Atlas for Your WhatsApp System

This guide will help you create a MongoDB Atlas cluster and connect it to your WhatsApp messaging system.

### Step 1: Create MongoDB Atlas Account

1. **Visit MongoDB Atlas**: Go to [https://cloud.mongodb.com/](https://cloud.mongodb.com/)
2. **Sign Up**: Create a free account if you don't have one
3. **Verify Email**: Check your email and verify your account

### Step 2: Create a New Cluster

1. **Create New Project** (optional):
   - Click "New Project"
   - Name it "WhatsApp Messaging System"

2. **Build a Cluster**:
   - Click "Build a Database"
   - Choose "FREE" (M0 Sandbox - perfect for development)
   - Select your preferred cloud provider and region
   - Cluster Name: `whatsapp-cluster` (or any name you prefer)
   - Click "Create Cluster"

### Step 3: Configure Database Access

1. **Create Database User**:
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `whatsapp_user` (or your preference)
   - Password: Generate a secure password (save it!)
   - Database User Privileges: Select "Read and write to any database"
   - Click "Add User"

### Step 4: Configure Network Access

1. **Add IP Address**:
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your specific IP addresses
   - Click "Confirm"

### Step 5: Get Connection String

1. **Connect to Cluster**:
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Drivers"
   - Select "Node.js" and version "4.1 or later"
   - Copy the connection string

2. **Connection String Format**:
   ```
   mongodb+srv://<username>:<password>@<cluster-name>.<random-id>.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update Your .env File

Replace the MongoDB configuration in your `.env` file:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://whatsapp_user:your_password_here@whatsapp-cluster.abcde.mongodb.net/whatsapp_webhooks?retryWrites=true&w=majority
```

**Replace**:
- `whatsapp_user` with your actual username
- `your_password_here` with your actual password
- `whatsapp-cluster.abcde` with your actual cluster address
- `whatsapp_webhooks` is the database name (will be created automatically)

### Step 7: Test Connection

1. **Install Dependencies**:
   ```powershell
   npm install mongoose
   ```

2. **Start Your Server**:
   ```powershell
   npm start
   ```

3. **Check Logs**:
   You should see:
   ```
   ✅ MongoDB connected successfully
   📍 Connected to database: whatsapp_webhooks
   ```

4. **Test Health Endpoint**:
   ```powershell
   curl http://localhost:5000/health
   ```
   
   Should show `"database": true`

### Step 8: Verify Data Collection

1. **Send a Test Message** to your WhatsApp number
2. **Check MongoDB Atlas**:
   - Go to "Browse Collections" in your cluster
   - You should see the `whatsapp_webhooks` database
   - Collections: `webhook_calls`, `user_stats`, `system_metrics`

3. **View Analytics**:
   ```powershell
   curl http://localhost:5000/analytics/webhooks
   curl http://localhost:5000/analytics/recent-calls
   ```

## 📊 Database Collections

Your system creates three main collections:

### 1. `webhook_calls`
Stores every webhook request with:
- Message content and metadata
- User information
- Processing time and status
- AI analysis results
- Error tracking

### 2. `user_stats`
Aggregated user statistics:
- Message counts by type
- User engagement metrics
- Preferences and behavior

### 3. `system_metrics`
Daily system statistics:
- Total messages and users
- Performance metrics
- Error rates and trends

## 🔒 Security Best Practices

### For Development:
- ✅ Use the free M0 cluster
- ✅ Allow access from anywhere (0.0.0.0/0)
- ✅ Use strong passwords

### For Production:
- 🔐 Upgrade to a paid cluster for better performance
- 🔐 Restrict IP access to your server's IP only
- 🔐 Use connection string with specific database name
- 🔐 Enable additional security features in Atlas
- 🔐 Set up monitoring and alerts

## 🛠️ Troubleshooting

### Connection Issues:
```
❌ MongoDB connection failed: MongoServerSelectionError
```
**Solutions**:
1. Check your connection string format
2. Verify username/password are correct
3. Ensure IP is whitelisted in Network Access
4. Check if cluster is running (not paused)

### Authentication Issues:
```
❌ Authentication failed
```
**Solutions**:
1. Verify database user exists
2. Check username/password in connection string
3. Ensure user has proper permissions

### Network Issues:
```
❌ Network timeout
```
**Solutions**:
1. Add your IP to Network Access
2. Try "Allow Access from Anywhere" for testing
3. Check your internet connection

## 📈 Monitoring Your Data

### View Recent Webhook Calls:
```powershell
curl http://localhost:5000/analytics/recent-calls?limit=10
```

### View Statistics:
```powershell
curl http://localhost:5000/analytics/webhooks
```

### MongoDB Atlas Dashboard:
- Real-time performance metrics
- Query performance insights
- Storage usage
- Connection monitoring

## 🚀 Next Steps

1. **Test the Integration**: Send messages and verify they're stored
2. **Review Data Structure**: Check collections in MongoDB Atlas
3. **Set Up Monitoring**: Configure alerts in Atlas
4. **Plan for Production**: Consider upgrading cluster for production use

Your WhatsApp system now stores every webhook call with detailed analytics! 🎉
