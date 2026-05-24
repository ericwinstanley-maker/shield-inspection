const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const f = form.getField('Utilities 3');
    console.log(f.constructor.name);
    if (f.constructor.name === 'PDFDropdown') {
        const drop = form.getDropdown('Utilities 3');
        console.log('Options:', drop.getOptions());
    } else if (f.constructor.name === 'PDFTextField') {
        console.log('TextField!');
    }
})();
