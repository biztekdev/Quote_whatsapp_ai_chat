/**
 * Quote PDF Generator Service
 * Generates PDF quotes matching the ERP HTML template design exactly
 */

class QuotePDFGenerator {
    constructor() {
        this.primaryColor = '#000000';
        this.grayColor = '#666666';
        this.lightGrayColor = '#CCCCCC';
        this.blueColor = '#0066CC';
        this.redColor = '#CC0000';
    }

    async generateQuotePDF(conversationData) {
        try {
            console.log("Starting Quote PDF generation...");
            
            // Import PDFKit dynamically
            const PDFDocument = (await import('pdfkit')).default;
            
            const doc = new PDFDocument({ 
                size: 'A4',
                margin: 0,
                layout: 'portrait'
            });
            
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => console.log("Quote PDF generation completed"));
            
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            
            // Generate quote content matching HTML template
            await this.generateContent(doc, conversationData, pageWidth, pageHeight);
            
            // Finalize PDF
            doc.end();
            
            // Return PDF buffer
            return new Promise((resolve) => {
                doc.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            
        } catch (error) {
            console.error('Error generating Quote PDF:', error);
            throw error;
        }
    }

    async generateContent(doc, conversationData, pageWidth, pageHeight) {
        // === LAYOUT EXACTLY MATCHING YOUR ERP ===
        
        // Left column width (for vertical QUOTE text)
        const leftColumnWidth = 120;
        const contentStartX = leftColumnWidth + 10;
        const contentWidth = pageWidth - contentStartX - 30;
        
        // === LEFT COLUMN WITH LOGOS AND VERTICAL QUOTE ===
        await this.renderLeftColumn(doc, leftColumnWidth, pageHeight);
        
        // === MAIN CONTENT AREA - MORE COMPACT LIKE YOUR ERP ===
        let currentY = 70; // Start higher up
        
        // Disclaimer section
        currentY = await this.renderDisclaimer(doc, contentStartX, currentY, contentWidth);
        
        // Quote details table
        currentY = await this.renderQuoteDetails(doc, conversationData, contentStartX, currentY, contentWidth);
        
        // Pricing table
        currentY = await this.renderPricingTable(doc, conversationData, contentStartX, currentY, contentWidth);
        
        // Authorization section - positioned like your ERP
        await this.renderAuthorization(doc, contentStartX, pageHeight - 80, contentWidth);
    }

    async renderLeftColumn(doc, leftColumnWidth, pageHeight) {
        // Top logo - positioned exactly like your ERP
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            
            const logoPath = path.join(process.cwd(), 'public', 'logo.png');
            await fs.access(logoPath);
            
            doc.image(logoPath, 5, 28, {
                width: 80,
                height: 80
            });
        } catch {
            // Fallback circular logo placeholder
            doc.circle(45, 68, 40)
               .fillAndStroke('#CCCCCC', this.primaryColor);
            doc.fontSize(12)
               .fillColor(this.primaryColor)
               .font('Helvetica-Bold')
               .text('LOGO', 35, 63);
        }
        
        // Vertical QUOTE text - positioned exactly like your ERP
        doc.save()
           .translate(25, 400)
           .rotate(-90)
           .fontSize(80)
           .fillColor('#000000')
           .font('Helvetica-Bold')
           .text('QUOTE', 0, 0)
           .restore();
        
        // Bottom USA logo - positioned like your ERP
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            
            const usaLogoPath = path.join(process.cwd(), 'public', 'print247usa.png');
            await fs.access(usaLogoPath);
            
            doc.image(usaLogoPath, 10, pageHeight - 100, {
                width: 60,
                height: 60
            });
        } catch {
            // Fallback circular USA logo placeholder
            doc.circle(40, pageHeight - 70, 30)
               .fillAndStroke('#E8E8E8', this.primaryColor);
            doc.fontSize(8)
               .fillColor(this.primaryColor)
               .font('Helvetica-Bold')
               .text('USA', 32, pageHeight - 74);
        }
    }

    async renderDisclaimer(doc, startX, startY, width) {
        // Add date and version in top right (exactly like your ERP)
        const currentDate = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        doc.fontSize(10)
           .fillColor(this.primaryColor)
           .font('Helvetica')
           .text(currentDate, 470, 15);
        
        // Generate quote number exactly like your ERP format
        const quoteNumber = this.generateQuoteNumber();
        doc.fontSize(10)
           .text(`${quoteNumber} (Version 1)`, 400, 30);
        
        // Disclaimer title - exactly like your ERP
        doc.fontSize(11)
           .fillColor(this.primaryColor)
           .font('Helvetica-Bold')
           .text('Disclaimer:', startX, startY);
        
        // Disclaimer text - exactly like your ERP with proper justification
        const disclaimerText = 'We want to emphasize that our estimate is comprehensive, encompassing all essential operations and materials in line with industry standards. If you have any queries, please don\'t hesitate to reach out. The estimate remains valid for 30 days from the specified date, and pricing adjustments may occur after a final artwork inspection. The countdown for delivery initiation starts upon design file approval and payment receipt. We value your business and eagerly anticipate the opportunity to serve you in the future. Feel free to contact us for any further information or clarification you may need. Any additional tariff, duty, and taxes on goods at the time of arrival, if applicable, shall be paid by the receiver/customer.';
        
        doc.fontSize(10)
           .fillColor(this.primaryColor)
           .font('Helvetica')
           .text(disclaimerText, startX, startY + 16, {
               width: width - 10,
               align: 'justify',
               lineGap: 3,
               wordSpacing: 0.5,
               characterSpacing: 0.1
           });
        
        return startY + 105; // Proper spacing like your ERP
    }

    async renderQuoteDetails(doc, conversationData, startX, startY, width) {
        // Extract data from conversation
        const customerName = 'Pure Global Inc'; // Default from template
        const jobName = this.extractJobName(conversationData);
        const skuCount = conversationData.skus || 4;
        const material = this.extractMaterial(conversationData);
        const dimensions = this.extractDimensions(conversationData);
        const finishes = this.extractFinishes(conversationData);
        
        // Quote details data (exactly like your ERP format)
        const details = [
            ['Query No:', this.generateQuoteNumber() + ' (Version 1)'],
            ['Customer:', customerName],
            ['Job Name:', jobName],
            ['No of Sku\'s:', skuCount.toString()],
            ['Turnaround Time:', '12 - 15 Business Days (*T&C Applies)'],
            ['Shipping:', 'DAP (Delivered At Place)'],
            ['Stock:', material],
            ['Finished Size:', dimensions],
            ['Finishing:', 'White + CMYK 4/0'],
            ['Extra Finishes:', finishes],
            ['Representative:', 'Liza John']
        ];
        
        let currentY = startY;
        
        // Render each detail row with exact ERP styling
        details.forEach(([label, value]) => {
            // Label - smaller font like your ERP
            doc.fontSize(10)
               .fillColor(this.primaryColor)
               .font('Helvetica')
               .text(label, startX, currentY + 4);
            
            // Underline - solid black like your ERP
            const lineY = currentY + 18;
            doc.moveTo(startX + 120, lineY)
               .lineTo(startX + width - 20, lineY)
               .lineWidth(1)
               .stroke(this.primaryColor);
            
            // Value - bold and properly positioned
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text(value, startX + 125, currentY + 6);
            
            currentY += 26; // Tighter spacing like your ERP
        });
        
        return currentY + 15;
    }

    async renderPricingTable(doc, conversationData, startX, startY, width) {
        const tableY = startY;
        
        // Get pricing data
        const pricingData = conversationData.pricingData;
        if (!pricingData || !pricingData.qty || !pricingData.unit_cost) {
            return tableY + 100; // Skip if no pricing data
        }
        
        const { qty, unit_cost } = pricingData;
        
        // Table dimensions - exactly like your ERP
        const tableWidth = width - 80; // More compact like ERP
        const colWidth = tableWidth / 4;
        const rowHeight = 22; // Smaller rows exactly like your ERP
        
        // Table border - solid black like your ERP
        doc.rect(startX + 40, tableY, tableWidth, rowHeight * 4)
           .lineWidth(1)
           .stroke(this.primaryColor);
        
        // Headers row - black background like your ERP
        doc.rect(startX + 40, tableY, tableWidth, rowHeight)
           .fillAndStroke(this.primaryColor, this.primaryColor);
        
        // Header text (white on black) - exactly like your ERP
        doc.fontSize(10)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text('Tier\'s:', startX + 50, tableY + 6)
           .text('Tier 1', startX + 40 + colWidth + 5, tableY + 6, { width: colWidth - 10, align: 'center' })
           .text('Tier 2', startX + 40 + colWidth * 2 + 5, tableY + 6, { width: colWidth - 10, align: 'center' })
           .text('Tier 3', startX + 40 + colWidth * 3 + 5, tableY + 6, { width: colWidth - 10, align: 'center' });
        
        // Vertical lines - solid black
        for (let i = 1; i < 4; i++) {
            doc.moveTo(startX + 40 + colWidth * i, tableY)
               .lineTo(startX + 40 + colWidth * i, tableY + rowHeight * 4)
               .lineWidth(1)
               .stroke(this.primaryColor);
        }
        
        // Quantities row
        const qtyY = tableY + rowHeight;
        doc.moveTo(startX + 40, qtyY)
           .lineTo(startX + 40 + tableWidth, qtyY)
           .lineWidth(1)
           .stroke(this.primaryColor);
        
        doc.fontSize(10)
           .fillColor(this.primaryColor)
           .font('Helvetica-Bold')
           .text('Quantities:', startX + 50, qtyY + 6);
        
        qty.forEach((quantity, index) => {
            doc.font('Helvetica')
               .text(quantity.toLocaleString(), startX + 40 + colWidth * (index + 1) + 5, qtyY + 6, { 
                width: colWidth - 10, 
                align: 'center' 
            });
        });
        
        // Unit Cost row
        const costY = tableY + rowHeight * 2;
        doc.moveTo(startX + 40, costY)
           .lineTo(startX + 40 + tableWidth, costY)
           .lineWidth(1)
           .stroke(this.primaryColor);
        
        doc.font('Helvetica-Bold')
           .text('Unit Cost :', startX + 50, costY + 6);
        
        unit_cost.forEach((cost, index) => {
            doc.font('Helvetica')
               .text(cost.toFixed(3), startX + 40 + colWidth * (index + 1) + 5, costY + 6, { 
                width: colWidth - 10, 
                align: 'center' 
            });
        });
        
        // Estimate Price row (light gray background like your ERP)
        const priceY = tableY + rowHeight * 3;
        doc.rect(startX + 40, priceY, tableWidth, rowHeight)
           .fillAndStroke('#E8E8E8', this.primaryColor);
        
        doc.fontSize(10)
           .fillColor(this.primaryColor)
           .font('Helvetica-Bold')
           .text('Estimate Price:', startX + 50, priceY + 6);
        
        qty.forEach((quantity, index) => {
            const totalPrice = Math.round(quantity * unit_cost[index]);
            doc.font('Helvetica-Bold')
               .text(totalPrice.toString(), startX + 40 + colWidth * (index + 1) + 5, priceY + 6, { 
                width: colWidth - 10, 
                align: 'center' 
            });
        });
        
        return tableY + rowHeight * 4 + 15;
    }

    async renderAuthorization(doc, startX, startY, width) {
        // Authorized By section - exactly like your ERP
        doc.fontSize(12)
           .fillColor(this.primaryColor)
           .font('Helvetica-Oblique') // Signature-style font
           .text('S M.', startX + 20, startY);
        
        // Underline for signature - solid black like your ERP
        doc.moveTo(startX, startY + 20)
           .lineTo(startX + 120, startY + 20)
           .lineWidth(1)
           .stroke(this.primaryColor);
        
        doc.fontSize(10)
           .font('Helvetica')
           .text('Authorized By', startX + 20, startY + 25);
        
        // Date section - positioned like your ERP
        const currentDate = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric' 
        });
        
        const dateX = startX + width - 120;
        doc.fontSize(10)
           .text(currentDate, dateX + 20, startY);
        
        // Underline for date
        doc.moveTo(dateX, startY + 20)
           .lineTo(dateX + 120, startY + 20)
           .lineWidth(1)
           .stroke(this.primaryColor);
        
        doc.text('Date', dateX + 45, startY + 25);
    }

    // Generate quote number exactly like your ERP system
    generateQuoteNumber() {
        const currentDate = new Date();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        return `${randomNum}-${year}-${month} / 1`;
    }

    // Helper methods to extract data from conversation
    extractJobName(conversationData) {
        if (conversationData.selectedProduct?.name) {
            const productName = conversationData.selectedProduct.name;
            const quantity = conversationData.quantity ? conversationData.quantity[0] : '';
            return `${quantity} ${productName}`;
        }
        return 'WhatsApp Quote Request'; // Default
    }

    extractMaterial(conversationData) {
        if (conversationData.selectedMaterial && Array.isArray(conversationData.selectedMaterial)) {
            return conversationData.selectedMaterial.map(m => m.name).join(' + ');
        } else if (conversationData.selectedMaterial?.name) {
            return conversationData.selectedMaterial.name;
        }
        return 'PP Silver Sticker'; // Default from template
    }

    extractDimensions(conversationData) {
        if (conversationData.dimensions && Array.isArray(conversationData.dimensions)) {
            const dims = conversationData.dimensions.map(d => d.value);
            return `${dims.join(' x ')} Inch`;
        }
        return '5 x 5 x 5 Inch'; // Default based on test data
    }

    extractFinishes(conversationData) {
        if (conversationData.selectedFinish && Array.isArray(conversationData.selectedFinish)) {
            return conversationData.selectedFinish.map(f => f.name).join(' + ');
        } else if (conversationData.selectedFinish?.name) {
            return conversationData.selectedFinish.name;
        }
        return 'Spot UV + Hot Foil'; // Default based on test data
    }
}

export default QuotePDFGenerator;