console.log('Starting import test...');

try {
    console.log('Testing dotenv...');
    import('dotenv').then(() => {
        console.log('dotenv OK');
        
        console.log('Testing express...');
        return import('express');
    }).then(() => {
        console.log('express OK');
        
        console.log('Testing WhatsApp service...');
        return import('./services/whatsappService.js');
    }).then(() => {
        console.log('WhatsApp service OK');
        
        console.log('Testing message handler...');
        return import('./handlers/messageHandler.js');
    }).then(() => {
        console.log('Message handler OK');
        
        console.log('Testing node-wit...');
        return import('node-wit');
    }).then(() => {
        console.log('node-wit OK');
        console.log('All imports successful!');
    }).catch(error => {
        console.error('Import failed:', error);
    });
} catch (error) {
    console.error('Error during import test:', error);
}
