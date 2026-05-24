const fs = require('fs');
const { PDFDocument, StandardFonts } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.getPages()[13]; // Page 14
    page.drawText('X', { x: 89, y: 656, size: 14, font: font });
    page.drawText('X', { x: 125, y: 655, size: 14, font: font });
    fs.writeFileSync('test_draw.pdf', await pdf.save());
    console.log('Saved test_draw.pdf');
})();
