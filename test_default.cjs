const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const field = form.getCheckBox('Check Box1642');
    console.log('Is Check Box1642 checked?', field.isChecked());
})();
