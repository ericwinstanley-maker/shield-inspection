const fs = require('fs');
const { PDFDocument, StandardFonts } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const font = await pdf.embedFont(StandardFonts.ZapfDingbats);
    const page = pdf.getPages()[13];
    // ASCII character 52 is '4' in ZapfDingbats encoding
    page.drawText(String.fromCharCode(52), { x: 89, y: 656, size: 16, font: font });
    fs.writeFileSync('test_zapf.pdf', await pdf.save());
    console.log('Saved test_zapf.pdf');
})();
