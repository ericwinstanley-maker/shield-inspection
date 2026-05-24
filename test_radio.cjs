const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const cb = form.getCheckBox('Check Box1642');
    const widgets = cb.acroField.getWidgets();
    console.log('Widget export values:');
    widgets.forEach((w, i) => {
        const onState = w.getOnValue();
        console.log(`Widget ${i}: OnState =`, onState);
    });
})();
