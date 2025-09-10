import database from './config/database.js';
import { DatabaseSeeder } from './services/databaseSeeder.js';

async function runSeeder() {
    try {
        console.log('🚀 Starting database setup...');
        
        // Connect to database
        await database.connect();
        
        // Ask user if they want to clear existing data
        console.log('\n⚠️  This will seed the database with initial data.');
        console.log('If you want to clear existing data first, run: npm run seed:clear\n');
        
        // Seed the database
        await DatabaseSeeder.seedAll();
        
        console.log('\n🎉 Database setup completed successfully!');
        console.log('You can now start the application with: npm start');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        // Close database connection
        await database.disconnect();
        process.exit(0);
    }
}

// Handle process signals
process.on('SIGINT', async () => {
    console.log('\n⚠️ Process interrupted');
    await database.disconnect();
    process.exit(0);
});

// Run the seeder
runSeeder();
