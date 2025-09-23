// Direct test of PDF creation function without full MessageHandler dependencies
import PDFDocument from 'pdfkit';
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

async function createTestPDF(conversationData) {
    try {
        console.log("Starting PDF creation...");
        console.log("Conversation data:", JSON.stringify(conversationData, null, 2));
        
        const doc = new PDFDocument({ 
            size: 'A4',
            margin: 0,
            layout: 'portrait'
        });
        const chunks = [];
        
        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
            console.log("PDF generation completed");
        });
        
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        
        // Set up colors to match reference
        const primaryColor = '#000000';
        const grayColor = '#666666';
        const lightGrayColor = '#CCCCCC';
        const headerBgColor = '#F8F8F8';
        
        // Background
        doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
        
        // Header section with light gray background
        doc.rect(0, 0, pageWidth, 80).fill(headerBgColor);
        
        // Date and Version in top right (matching reference)
        const currentDate = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        }).replace(/\//g, '/');
        
        doc.fontSize(9)
           .fillColor(primaryColor)
           .font('Helvetica')
           .text(currentDate, pageWidth - 100, 15)
           .text(`${Math.floor(Date.now()/1000)}-${Math.floor(Math.random()*1000)} (Version 2)`, pageWidth - 150, 30);
        
        // Print247 logo and branding (top left)
        doc.fontSize(28)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Print247', 50, 25);
        
        doc.fontSize(16)
           .fillColor('#0066CC')
           .font('Helvetica')
           .text('.us', 165, 30);
        
        // Add sample content
        doc.fontSize(20)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('TEST QUOTE DOCUMENT', 100, 150);
        
        doc.fontSize(12)
           .font('Helvetica')
           .text('This is a test of the updated PDF design', 100, 180)
           .text('Product: ' + conversationData.selectedProduct.name, 100, 200)
           .text('Materials: ' + conversationData.selectedMaterials.map(m => m.name).join(', '), 100, 220)
           .text('Quantities: ' + conversationData.quantities.join(', '), 100, 240);
        
        // Finalize PDF
        doc.end();
        
        // Wait for PDF to be ready
        return new Promise((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
        
    } catch (error) {
        console.error('Error creating PDF document:', error);
        throw error;
    }
}

async function testPDFGeneration() {
    try {
        console.log('🧪 Starting simple PDF generation test...');
        
        // Test PDF creation
        console.log('📄 Creating PDF document...');
        const pdfBuffer = await createTestPDF(testConversationData);
        
        if (pdfBuffer && pdfBuffer.length > 0) {
            console.log('✅ PDF generated successfully!');
            console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
            
            // Save test PDF
            const testFilename = `simple-test-quote-${Date.now()}.pdf`;
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