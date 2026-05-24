const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const drop = form.getDropdown('Utilities 2');
    
    drop.addOptions(['3.5']);
    drop.select('3.5');
    
    console.log('Successfully selected 3.5. Options is now:', drop.getOptions());
})();
