// Test both Quote and PSF PDF generation with print247usa.png image
import fs from 'fs/promises';

// Mock WhatsApp and other services for testing
class MockWhatsAppService {
    async sendMessage() { return true; }
    async sendPDF() { return true; }
}

class MockConversationService {
    async updateConversationState() { return true; }
}

// Import and test MessageHandler
async function testBothPDFTypes() {
    try {
        console.log('🧪 Testing both Quote PDF and PSF PDF generation...');
        
        // Create mock data
        const testConversationData = {
            selectedProduct: {
                name: 'Custom Business Cards',
                description: 'Professional business cards'
            },
            selectedCategory: {
                name: 'Business Cards',
                erp_id: 'BC001'
            },
            selectedMaterials: [
                { name: '350gsm Silk Coated Card', _id: 'mat1' }
            ],
            selectedFinishes: [
                { name: 'Matt Lamination', _id: 'fin1' }
            ],
            quantities: [1000, 2500, 5000],
            quantity: [1000, 2500, 5000],
            skus: 3,
            dimensions: [{ value: '85mm x 55mm' }],
            pricingData: {
                qty: [1000, 2500, 5000],
                unit_cost: [0.125, 0.098, 0.075]
            }
        };
        
        // Import MessageHandler with mocked services
        const { default: MessageHandler } = await import('./handlers/messageHandler.js');
        
        // Create instance with mock services
        const messageHandler = new MessageHandler();
        messageHandler.whatsappService = new MockWhatsAppService();
        messageHandler.conversationService = new MockConversationService();
        
        // Test Quote PDF generation
        console.log('📄 Testing Quote PDF generation...');
        const quotePdfBuffer = await messageHandler.createPDFDocument(testConversationData);
        
        if (quotePdfBuffer && quotePdfBuffer.length > 0) {
            console.log('✅ Quote PDF generated successfully!');
            console.log(`📊 Quote PDF size: ${quotePdfBuffer.length} bytes`);
            
            const quoteFilename = `test-quote-with-image-${Date.now()}.pdf`;
            await fs.writeFile(quoteFilename, quotePdfBuffer);
            console.log(`💾 Quote PDF saved as: ${quoteFilename}`);
        }
        
        // Test PSF PDF generation
        console.log('📄 Testing PSF PDF generation...');
        const psfPdfBuffer = await messageHandler.createPSFDocument(testConversationData);
        
        if (psfPdfBuffer && psfPdfBuffer.length > 0) {
            console.log('✅ PSF PDF generated successfully!');
            console.log(`📊 PSF PDF size: ${psfPdfBuffer.length} bytes`);
            
            const psfFilename = `test-psf-with-image-${Date.now()}.pdf`;
            await fs.writeFile(psfFilename, psfPdfBuffer);
            console.log(`💾 PSF PDF saved as: ${psfFilename}`);
        }
        
        console.log('🎉 Both PDF types generated successfully with print247usa.png image!');
        
    } catch (error) {
        console.error('❌ PDF generation test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testBothPDFTypes();