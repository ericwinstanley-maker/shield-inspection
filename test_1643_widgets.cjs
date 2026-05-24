const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const cb = form.getCheckBox('Check Box1643');
    const widgets = cb.acroField.getWidgets();
    console.log('Widgets for Check Box1643:');
    widgets.forEach((w, i) => {
        const rect = w.getRectangle();
        console.log(`Choice ${i+1}: x=${Math.round(rect.x)}, y=${Math.round(rect.y)}, name=${w.getOnValue()}`);
    });
})();
