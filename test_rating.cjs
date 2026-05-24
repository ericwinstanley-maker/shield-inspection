const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const groups = ['CheckBoxGrp57', 'CheckBoxGrp58', 'CheckBoxGrp59', 'CheckBoxGrp60'];
    groups.forEach(g => {
        const cb = form.getCheckBox(g);
        const widgets = cb.acroField.getWidgets();
        console.log(`\nWidgets for ${g}:`);
        widgets.forEach((w, i) => {
            const rect = w.getRectangle();
            console.log(`Choice ${i+1}: x=${Math.round(rect.x)}, y=${Math.round(rect.y)}, name=${w.getOnValue()}`);
        });
    });
})();
