/**
 * Fix the broken Check Box1642 in blank-template.pdf
 * 
 * Problem: Check Box1642 has TWO widgets (Yes and No positions) that both
 * share the same onValue ('Yes'). This makes it impossible for pdf-lib to
 * check one without checking both.
 * 
 * Fix: Remove Check Box1642, create two separate fields:
 *   - CB1642_Yes (at the Yes position)
 *   - CB1642_No  (at the No position)
 */

const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');

async function fixTemplate() {
  const inputPath = 'public/assets/blank-template.pdf';
  const outputPath = 'public/assets/blank-template.pdf'; // overwrite in place

  console.log('Loading template:', inputPath);
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // --- Step 1: Get Check Box1642 widget positions ---
  const cb1642 = form.getCheckBox('Check Box1642');
  const widgets = cb1642.acroField.getWidgets();

  console.log(`Check Box1642 has ${widgets.length} widgets:`);
  const rects = [];
  for (let i = 0; i < widgets.length; i++) {
    const rect = widgets[i].getRectangle();
    console.log(`  Widget ${i}: x=${rect.x.toFixed(1)}, y=${rect.y.toFixed(1)}, w=${rect.width.toFixed(1)}, h=${rect.height.toFixed(1)}`);
    rects.push(rect);
  }

  // The Insulation & Ventilation page is page 14 (1-indexed), so index 13
  const insPage = pdfDoc.getPages()[13];
  console.log('Target page:', insPage ? 'found (index 13)' : 'NOT FOUND');

  // --- Step 2: Remove the broken field ---
  try {
    form.removeField(cb1642);
    console.log('Removed Check Box1642 successfully');
  } catch (e) {
    console.error('Failed to remove Check Box1642:', e.message);
    console.log('Trying alternative removal...');
    
    // Alternative: remove at the raw dictionary level
    const acroForm = pdfDoc.catalog.lookup(PDFName.of('AcroForm'));
    if (acroForm) {
      const fields = acroForm.lookup(PDFName.of('Fields'));
      if (fields && typeof fields.size === 'function') {
        for (let i = fields.size() - 1; i >= 0; i--) {
          const fieldRef = fields.get(i);
          const field = pdfDoc.context.lookup(fieldRef);
          if (field) {
            const name = field.lookup(PDFName.of('T'));
            if (name && name.value === 'Check Box1642') {
              fields.remove(i);
              console.log('Removed field from AcroForm Fields array at index', i);
              break;
            }
          }
        }
      }
    }
    
    // Remove widget annotations from page
    const pageAnnots = insPage.node.lookup(PDFName.of('Annots'));
    if (pageAnnots) {
      console.log(`Page has ${pageAnnots.size()} annotations`);
      // We'll just proceed - the new fields will overlay the old widget positions
    }
  }

  // --- Step 3: Create two new properly named checkbox fields ---
  const cbYes = form.createCheckBox('CB1642_Yes');
  cbYes.addToPage(insPage, {
    x: rects[0].x,
    y: rects[0].y,
    width: rects[0].width,
    height: rects[0].height,
  });
  console.log(`Created CB1642_Yes at (${rects[0].x.toFixed(1)}, ${rects[0].y.toFixed(1)})`);

  const cbNo = form.createCheckBox('CB1642_No');
  cbNo.addToPage(insPage, {
    x: rects[1].x,
    y: rects[1].y,
    width: rects[1].width,
    height: rects[1].height,
  });
  console.log(`Created CB1642_No at (${rects[1].x.toFixed(1)}, ${rects[1].y.toFixed(1)})`);

  // --- Step 4: Verify ---
  console.log('\nVerification:');
  try {
    form.getCheckBox('CB1642_Yes');
    console.log('  CB1642_Yes: exists ✓');
  } catch (e) {
    console.log('  CB1642_Yes: NOT FOUND ✗');
  }
  try {
    form.getCheckBox('CB1642_No');
    console.log('  CB1642_No: exists ✓');
  } catch (e) {
    console.log('  CB1642_No: NOT FOUND ✗');
  }
  try {
    form.getCheckBox('Check Box1642');
    console.log('  Check Box1642: STILL EXISTS (removal failed) ✗');
  } catch (e) {
    console.log('  Check Box1642: removed ✓');
  }
  try {
    form.getCheckBox('Check Box1643');
    console.log('  Check Box1643 (N/A): exists ✓');
  } catch (e) {
    console.log('  Check Box1643 (N/A): NOT FOUND ✗');
  }

  // --- Step 5: Save ---
  const fixedBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, fixedBytes);
  console.log(`\nSaved fixed template to ${outputPath} (${(fixedBytes.length / 1024).toFixed(0)} KB)`);
}

fixTemplate().catch(e => {
  console.error('Script failed:', e);
  process.exit(1);
});
