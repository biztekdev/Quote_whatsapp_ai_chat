console.log('Simple test starting...');

import express from 'express';

console.log('Express imported');

const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
    res.json({ message: 'Test server working!' });
});

console.log('Setting up server...');

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});

console.log('Server setup complete');
