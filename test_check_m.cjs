const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const grp57 = form.getRadioGroup('CheckBoxGrp57');
    const grp58 = form.getRadioGroup('CheckBoxGrp58');
    const grp59 = form.getRadioGroup('CheckBoxGrp59');
    const grp60 = form.getRadioGroup('CheckBoxGrp60');
    
    // UI selections:
    grp57.select('Yes');   // Item 1: S
    grp58.select('Yes1');  // Item 2: M
    grp59.select('Yes2');  // Item 3: P
    grp60.select('Yes3');  // Item 4: U
    
    fs.writeFileSync('test_check_m.pdf', await pdf.save());
    console.log('Saved test_check_m.pdf');
})();
