const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
    const pdf = await PDFDocument.load(fs.readFileSync('public/assets/blank-template.pdf'));
    const form = pdf.getForm();
    const pages = pdf.getPages();
    
    const TARGET_PAGE_0_INDEXED = 9; // page 10
    console.log(`Scanning page ${TARGET_PAGE_0_INDEXED} (0-indexed)`)

    let results = [];
    for (const f of form.getFields()) {
        const widgets = f.acroField.getWidgets();
        for (const w of widgets) {
            const ref = w.dict.get(w.dict.context.obj('P'));
            if (!ref) continue;
            const pageIdx = pages.findIndex(p => p.ref === ref);
            if (pageIdx !== TARGET_PAGE_0_INDEXED) continue;
            const rect = w.getRectangle();
            if (rect.x > 490) continue; // skip right-side rating checkboxes
            results.push({
                type: f.constructor.name,
                name: f.getName(),
                x: Math.round(rect.x),
                y: Math.round(rect.y)
            });
        }
    }
    
    results.sort((a, b) => b.y - a.y || a.x - b.x);
    for (const r of results) {
        console.log(`${r.type}: ${r.name} x=${r.x} y=${r.y}`);
    }
})();
