import MessageHandler from './handlers/messageHandler.js';
import fs from 'fs';

// Mock conversation data for testing
const testConversationData = {
    selectedProduct: {
        name: 'Custom Business Cards',
        description: 'Professional business cards with custom design'
    },
    selectedMaterials: [
        { name: '350gsm Silk Coated Card', _id: 'mat1' },
        { name: 'Spot UV Coating', _id: 'mat2' }
    ],
    selectedFinishes: [
        { name: 'Matt Lamination', _id: 'fin1' },
        { name: 'Spot UV', _id: 'fin2' }
    ],
    quantities: [1000, 2500, 5000],
    skus: 3,
    dimensions: [
        { value: '85mm x 55mm' }
    ],
    pricingData: {
        qty: [1000, 2500, 5000],
        unit_cost: [0.125, 0.098, 0.075]
    }
};

async function testPDFGeneration() {
    try {
        console.log('🧪 Starting PDF generation test...');
        
        const messageHandler = new MessageHandler();
        
        // Test PDF creation
        console.log('📄 Creating PDF document...');
        const pdfBuffer = await messageHandler.createPDFDocument(testConversationData);
        
        if (pdfBuffer && pdfBuffer.length > 0) {
            console.log('✅ PDF generated successfully!');
            console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
            
            // Save test PDF
            const testFilename = `test-quote-${Date.now()}.pdf`;
            fs.writeFileSync(testFilename, pdfBuffer);
            console.log(`💾 Test PDF saved as: ${testFilename}`);
            
        } else {
            console.log('❌ PDF generation failed - empty buffer');
        }
        
    } catch (error) {
        console.error('❌ PDF generation test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testPDFGeneration();