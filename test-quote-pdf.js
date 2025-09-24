/**
 * Test script for the new Quote PDF Generator
 */

import QuotePDFGenerator from './services/quotePDFGenerator.js';
import fs from 'fs/promises';

async function testPDFGeneration() {
    try {
        console.log('Testing Quote PDF Generator...');
        
        // Create test conversation data matching your WhatsApp flow
        const testConversationData = {
            selectedCategory: { name: 'Mylor Bag' },
            selectedProduct: { name: 'Stand Up Pouch' },
            selectedMaterial: [
                { name: 'PET' },
                { name: 'MPET' },
                { name: 'PE' }
            ],
            selectedFinish: [
                { name: 'Spot UV' },
                { name: 'Hot Foil' }
            ],
            dimensions: [
                { name: 'W', value: '5' },
                { name: 'H', value: '5' },
                { name: 'G', value: '5' }
            ],
            quantity: [20000],
            skus: 4,
            pricingData: {
                qty: [20000, 40000, 80000],
                unit_cost: [0.160, 0.126, 0.108]
            }
        };
        
        // Generate PDF
        const pdfGenerator = new QuotePDFGenerator();
        const pdfBuffer = await pdfGenerator.generateQuotePDF(testConversationData);
        
        // Save test PDF
        const testPdfPath = './test_quote.pdf';
        await fs.writeFile(testPdfPath, pdfBuffer);
        
        console.log(`✅ PDF generated successfully!`);
        console.log(`📄 Test PDF saved as: ${testPdfPath}`);
        console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error testing PDF generation:', error);
        return false;
    }
}

// Run the test
testPDFGeneration()
    .then(success => {
        if (success) {
            console.log('🎉 PDF generation test completed successfully!');
        } else {
            console.log('💥 PDF generation test failed!');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test script error:', error);
        process.exit(1);
    });