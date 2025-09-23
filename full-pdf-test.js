import PDFDocument from 'pdfkit';
import fs from 'fs';

async function createFullTestPDF() {
    try {
        console.log("Creating full test PDF with complete layout...");
        
        const doc = new PDFDocument({ 
            size: 'A4',
            margin: 0,
            layout: 'portrait'
        });
        const chunks = [];
        
        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        
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
        
        // Print247 logo using logo.png image
        try {
            const logoPath = './public/logo.png';
            
            // Add the logo.png image in header
            doc.image(logoPath, 50, 15, {
                width: 120,
                height: 50
            });
            
        } catch (logoError) {
            console.log('Could not load logo.png, falling back to text');
            // Fallback to text if logo fails
            doc.fontSize(28)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text('Print247', 50, 25);
            
            doc.fontSize(16)
               .fillColor('#0066CC')
               .font('Helvetica')
               .text('.us', 165, 30);
        }
        
        // Vertical QUOTE text on the left side
        doc.save()
           .translate(25, 150)
           .rotate(-90)
           .fontSize(48)
           .fillColor(lightGrayColor)
           .font('Helvetica-Bold')
           .text('QUOTE', 0, 0)
           .restore();
        
        // Disclaimer section
        const disclaimerY = 90;
        const contentStartX = 80;
        
        doc.fontSize(9)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Disclaimer:', contentStartX, disclaimerY);
        
        const disclaimerText = 'We want to emphasize that our estimate is comprehensive, encompassing all essential operations and materials in line with industry standards. If you have any queries, please don\'t hesitate to reach out. The estimate remains valid for 30 days from the specified date, and pricing adjustments may occur after a final artwork inspection.';
        
        doc.fontSize(8)
           .font('Helvetica')
           .text(disclaimerText, contentStartX, disclaimerY + 15, {
               width: pageWidth - contentStartX - 50,
               align: 'justify',
               lineGap: 2
           });
        
        // Quote details section
        const detailsY = disclaimerY + 100;
        const details = [
            ['Query No:', 'QT-12345678'],
            ['Customer:', 'WhatsApp Customer'],
            ['Job Name:', 'Custom Business Cards'],
            ['Materials:', '350gsm Silk Coated Card, Spot UV Coating'],
            ['Quantities:', '1,000, 2,500, 5,000'],
            ['No of SKU\'s:', '3'],
            ['Turnaround Time:', '12 - 15 Business Days (*T&C Applies)'],
            ['Shipping:', 'DAP (Delivered At Place)'],
            ['Finished Size:', '85mm x 55mm'],
            ['Print Specification:', 'CMYK 4/0 + DIE CUTTING + STRAIGHT LINE GLUING'],
            ['Extra Finishes:', 'Matt Lamination, Spot UV'],
            ['Representative:', 'AI Assistant - WhatsApp Bot']
        ];
        
        let currentY = detailsY;
        details.forEach(([label, value]) => {
            // Draw horizontal line
            doc.moveTo(contentStartX, currentY)
               .lineTo(pageWidth - 50, currentY)
               .stroke('#CCCCCC');
            
            // Label and value
            doc.fontSize(10)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text(label, contentStartX, currentY + 5)
               .font('Helvetica')
               .text(value, contentStartX + 150, currentY + 5);
            
            currentY += 20;
        });
        
        // Final line
        doc.moveTo(contentStartX, currentY)
           .lineTo(pageWidth - 50, currentY)
           .stroke('#CCCCCC');
        
        // Pricing table
        const tableY = currentY + 30;
        const tableStartX = contentStartX;
        const tableWidth = pageWidth - contentStartX - 50;
        const colWidth = tableWidth / 4;
        
        // Table border
        doc.rect(tableStartX, tableY - 5, tableWidth, 90)
           .stroke('#CCCCCC');
        
        // Header background
        doc.rect(tableStartX, tableY - 5, tableWidth, 20)
           .fillAndStroke('#F0F0F0', '#CCCCCC');
        
        // Table headers
        doc.fontSize(10)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Tier\'s', tableStartX + 5, tableY + 2, { width: colWidth - 10, align: 'left' })
           .text('Tier 1', tableStartX + colWidth + 5, tableY + 2, { width: colWidth - 10, align: 'center' })
           .text('Tier 2', tableStartX + colWidth * 2 + 5, tableY + 2, { width: colWidth - 10, align: 'center' })
           .text('Tier 3', tableStartX + colWidth * 3 + 5, tableY + 2, { width: colWidth - 10, align: 'center' });
        
        // Vertical lines for columns
        for (let i = 1; i < 4; i++) {
            doc.moveTo(tableStartX + colWidth * i, tableY - 5)
               .lineTo(tableStartX + colWidth * i, tableY + 85)
               .stroke('#CCCCCC');
        }
        
        // Quantities row
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .text('Quantities:', tableStartX + 5, tableY + 25);
        
        const quantities = [1000, 2500, 5000];
        quantities.forEach((quantity, index) => {
            doc.text(quantity.toLocaleString(), tableStartX + colWidth * (index + 1) + 5, tableY + 25, { 
                width: colWidth - 10, 
                align: 'center' 
            });
        });
        
        // Unit Cost row
        const unitCostY = tableY + 40;
        doc.moveTo(tableStartX, unitCostY - 5)
           .lineTo(tableStartX + tableWidth, unitCostY - 5)
           .stroke('#CCCCCC');
        
        doc.text('Unit Cost:', tableStartX + 5, unitCostY);
        const unitCosts = [0.125, 0.098, 0.075];
        unitCosts.forEach((cost, index) => {
            doc.text(`$${cost.toFixed(3)}`, tableStartX + colWidth * (index + 1) + 5, unitCostY, { 
                width: colWidth - 10, 
                align: 'center' 
            });
        });
        
        // Estimate Price row
        const priceY = tableY + 55;
        doc.moveTo(tableStartX, priceY - 5)
           .lineTo(tableStartX + tableWidth, priceY - 5)
           .stroke('#CCCCCC');
        
        doc.text('Estimate Price:', tableStartX + 5, priceY);
        quantities.forEach((quantity, index) => {
            const totalPrice = (quantity * unitCosts[index]);
            doc.text(`$${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                tableStartX + colWidth * (index + 1) + 5, priceY, { 
                width: colWidth - 10, 
                align: 'center' 
            });
        });
        
        // Notes section (matching your reference)
        const notesY = tableY + 120;
        doc.fontSize(10)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('Notes:', contentStartX, notesY);
        
        const notesText = `• Final pricing may vary based on artwork complexity and material specifications
• This quote is valid for 30 days from the date above
• Production time starts after artwork approval and payment confirmation
• Shipping costs are included for DAP delivery within the continental US
• Custom packaging options available upon request
• All materials meet industry quality standards`;
        
        doc.fontSize(9)
           .font('Helvetica')
           .text(notesText, contentStartX, notesY + 15, {
               width: pageWidth - contentStartX - 50,
               lineGap: 3
           });
        
        // Footer section (matching your reference)
        const footerY = pageHeight - 120;
        
        // Use print247usa.png image instead of text
        try {
            const imagePath = './public/print247usa.png';
            
            // Add the print247usa.png image
            doc.image(imagePath, contentStartX + 25, footerY - 5, {
                width: 70,
                height: 70
            });
            
        } catch (imageError) {
            console.log('Could not load print247usa.png, falling back to text');
            // Fallback to circle and text if image fails
            doc.circle(contentStartX + 60, footerY + 20, 35)
               .stroke(primaryColor)
               .lineWidth(2);
            
            doc.fontSize(7)
               .fillColor(primaryColor)
               .font('Helvetica-Bold')
               .text('PROUDLY BASED', contentStartX + 25, footerY + 5, { width: 70, align: 'center' })
               .text('IN THE USA', contentStartX + 25, footerY + 15, { width: 70, align: 'center' });
            
            doc.fontSize(8)
               .font('Helvetica-Bold')
               .fillColor('#0066CC')
               .text('Print247.us', contentStartX + 25, footerY + 30, { width: 70, align: 'center' });
        }
        
        // Authorization section with proper formatting
        doc.fontSize(10)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text('S.M. Authorized By:', contentStartX + 150, footerY)
           .fontSize(9)
           .font('Helvetica')
           .text('_________________________________', contentStartX + 150, footerY + 15);
        
        // Date section (matching your reference format)
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Date:', pageWidth - 150, footerY)
           .fontSize(9)
           .font('Helvetica')
           .text('_________________________________', pageWidth - 150, footerY + 15)
           .text('09/23/2025', pageWidth - 150, footerY + 30);
        
        // Footer line
        doc.moveTo(contentStartX, footerY + 50)
           .lineTo(pageWidth - 50, footerY + 50)
           .stroke('#CCCCCC');
        
        // Footer text (matching your reference)
        doc.fontSize(8)
           .fillColor(grayColor)
           .font('Helvetica')
           .text('This quote is valid for 30 days from the date above. Final pricing subject to artwork review.', 
                 contentStartX, footerY + 60, { 
                     width: pageWidth - contentStartX - 50, 
                     align: 'center' 
                 });
        
        // Finalize PDF
        doc.end();
        
        // Wait for PDF to be ready
        return new Promise((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
        
    } catch (error) {
        console.error('Error creating full test PDF:', error);
        throw error;
    }
}

async function generateFullTestPDF() {
    try {
        console.log('🧪 Creating complete PDF layout test...');
        
        const pdfBuffer = await createFullTestPDF();
        
        if (pdfBuffer && pdfBuffer.length > 0) {
            console.log('✅ Full PDF generated successfully!');
            console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
            
            // Save test PDF
            const testFilename = `full-layout-test-${Date.now()}.pdf`;
            fs.writeFileSync(testFilename, pdfBuffer);
            console.log(`💾 Full test PDF saved as: ${testFilename}`);
            console.log('📂 You can open this PDF to see the complete layout');
            
        } else {
            console.log('❌ PDF generation failed - empty buffer');
        }
        
    } catch (error) {
        console.error('❌ PDF generation test failed:', error.message);
    }
}

// Run the test
generateFullTestPDF();