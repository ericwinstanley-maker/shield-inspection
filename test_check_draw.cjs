const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const page = pdf.getPages()[13];
    const x = 125; // No box
    const y = 655;
    page.drawLine({ start: { x: x + 2, y: y + 5 }, end: { x: x + 5, y: y + 2 }, thickness: 1.5, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: x + 5, y: y + 2 }, end: { x: x + 11, y: y + 10 }, thickness: 1.5, color: rgb(0, 0, 0) });
    fs.writeFileSync('test_check_draw.pdf', await pdf.save());
    console.log('Saved test_check_draw.pdf');
})();
