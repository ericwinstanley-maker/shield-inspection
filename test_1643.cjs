const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    form.getCheckBox('Check Box1643').check();
    fs.writeFileSync('test_1643.pdf', await pdf.save());
    console.log('Saved test_1643.pdf');
})();
