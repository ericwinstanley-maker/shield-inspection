const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const page = pdf.getPages()[13];
    
    // Simulate drawing X at x=125 (No box)
    page.drawText('X', { x: 125, y: 655, size: 14 });
    // Simulate drawing Check at x=89 (Yes box)
    page.drawText('C', { x: 89, y: 656, size: 14 });
    
    // Simulate Check Box 1643 (N/A)
    const form = pdf.getForm();
    form.getCheckBox('Check Box1643').check();

    fs.writeFileSync('debug_export.pdf', await pdf.save());
    console.log('Saved debug_export.pdf. You can inspect this to see where the coordinates land.');
})();
