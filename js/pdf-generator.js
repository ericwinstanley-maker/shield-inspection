// ============================================================
// Shield Inspection Services — PDF Generator
// Uses pdf-lib to fill the existing NYS blank PDF template
// ============================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { INSPECTION_SECTIONS, A_CODES } from './models.js';
import { getPhoto, blobToDataURL } from './db.js';

/**
 * Generate a completed inspection PDF by filling the NYS blank template
 * @param {Object} inspection - The inspection data object
 * @returns {Uint8Array} - The PDF bytes
 */
export async function generatePDF(inspection) {
  // Load the blank template
  const templateUrl = '/assets/blank-template.pdf';
  const templateBytes = await fetch(templateUrl).then(res => {
    if (!res.ok) throw new Error('Failed to load PDF template');
    return res.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ============================================================
  // PAGE 1: Cover Page
  // ============================================================
  try {
    setTextField(form, 'Address', `${inspection.cover.street}\n${inspection.cover.city}, ${inspection.cover.state}\n${inspection.cover.zip}`);
    setTextField(form, 'Client', inspection.cover.clientName);
    setTextField(form, 'Date', inspection.cover.inspectionDate);
  } catch (e) { console.warn('Cover page fields:', e.message); }

  // ============================================================
  // PAGE 4: General Information
  // ============================================================
  try {
    setTextField(form, 'Text Field 1', `${inspection.cover.street} ${inspection.cover.city}, ${inspection.cover.state} ${inspection.cover.zip}`);
    setTextField(form, 'Text Field 2', inspection.cover.inspectionDate);
    setTextField(form, 'Text Field 3', formatTime(inspection.general.timeStarted));
    setTextField(form, 'Text Field 4', formatTime(inspection.general.timeCompleted));
    setTextField(form, 'Age', inspection.general.approximateAge);
    setTextField(form, 'Text Field 8', inspection.general.squareFootage);

    // Combo boxes
    trySetCombo(form, 'Combo Box 1', inspection.general.propertyType);
    trySetCombo(form, 'Combo Box 2', inspection.general.garageType);
    trySetCombo(form, 'Driveway', inspection.general.driveway);
  } catch (e) { console.warn('General info fields:', e.message); }

  // ============================================================
  // INSPECTION SECTIONS (Pages 5-15): Fill ratings and comments
  // ============================================================
  fillSectionFields(form, inspection);

  // ============================================================
  // PAGES 16-17: Summary of Concerns
  // ============================================================
  try {
    const summaryText = generateSummaryText(inspection);
    setTextField(form, 'Text Field 166', summaryText);
  } catch (e) { console.warn('Summary field:', e.message); }

  // ============================================================
  // PAGES 18-20: Addendum Checkboxes
  // ============================================================
  fillAddendumCheckboxes(form, inspection);

  // ============================================================
  // PAGES 21-22: Photos
  // ============================================================
  await fillPhotos(pdfDoc, form, inspection);

  // ============================================================
  // Flatten form and return bytes
  // ============================================================
  try {
    form.flatten();
  } catch (e) {
    console.warn('Could not flatten form:', e.message);
  }

  return pdfDoc.save();
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function setTextField(form, fieldName, value) {
  if (!value) return;
  try {
    const field = form.getTextField(fieldName);
    field.setText(String(value));
  } catch (e) {
    // Field may not exist; skip silently
  }
}

function trySetCombo(form, fieldName, value) {
  if (!value) return;
  try {
    const field = form.getDropdown(fieldName);
    const options = field.getOptions();
    if (options.includes(value)) {
      field.select(value);
    }
  } catch (e) {
    // Try as text field fallback
    setTextField(form, fieldName, value);
  }
}

function trySetCheckbox(form, fieldName, checked) {
  try {
    const field = form.getCheckBox(fieldName);
    if (checked) field.check();
    else field.uncheck();
  } catch (e) {
    // Skip
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  // Convert 24h "HH:mm" to "H:MM AM/PM"
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ============================================================
// Fill inspection section fields (ratings & comments)
// Maps section data back to the PDF's form field names
// ============================================================

function fillSectionFields(form, inspection) {
  // This maps section IDs to their approximate text field naming pattern in the PDF.
  // The PDF uses sequential "Text Field NN" names for comments
  // and "Check Box NNN" / "CheckBoxGrpNN" for ratings.
  //
  // Since the PDF field naming isn't perfectly consistent, we use a best-effort
  // approach: write the comment text into the known text fields for each section.

  const sectionFieldMap = {
    exterior: { startField: 12, commentFields: ['Text Field 12', 'Text Field 15', 'Text Field 17', 'Text Field 22', 'Text Field 23'] },
    roof: { startField: 25, commentFields: ['Text Field 25', 'Text Field 28', 'Text Field 31', 'Text Field 32'] },
    structural: { commentFields: ['Text Field 33', 'Text Field 34', 'Text Field 35'] },
    plumbing: { commentFields: ['Text Field 47', 'Text Field 50', 'Text Field 51', 'Text Field 52', 'Text Field 60', 'Text Field 62', 'Text Field 63'] },
    electrical: { commentFields: ['Text Field 67', 'Text Field 68', 'Text Field 78', 'Text Field 210', 'Text Field 212', 'Text125 Electrical'] },
    heating: { commentFields: ['Text Field 84', 'Text Field 85', 'Text Field 217'] },
    airConditioning: { commentFields: ['Text Field 106', 'Text Field 107', 'Text Field 108', 'Text Field 109'] },
    interior: { commentFields: ['Text Field 111', 'Text Field 117', 'Text Field 122', 'Text Field 126', 'Text Field 129', 'Text Field 130'] },
    insulationVentilation: { commentFields: ['Text Field 132', 'Text Field 139'] },
    fireplace: { commentFields: ['Text Field 140', 'Text Field 141'] }
  };

  for (const sec of INSPECTION_SECTIONS) {
    const sectionData = inspection.sections[sec.id];
    if (!sectionData) continue;

    const mapping = sectionFieldMap[sec.id];
    if (!mapping) continue;

    // Write comments into available fields
    const itemsWithComments = sectionData.items.filter(it => it.comments);
    for (let i = 0; i < itemsWithComments.length && i < (mapping.commentFields || []).length; i++) {
      const fieldName = mapping.commentFields[i];
      const item = itemsWithComments[i];
      // Build a comment string with rating prefix
      const prefix = item.rating ? `${getRatingPrefix(sec.id, i + 1)}- ` : '';
      setTextField(form, fieldName, prefix + item.comments);
    }
  }
}

function getRatingPrefix(sectionId, itemIndex) {
  // Generate the S-number prefix based on overall item ordering
  // This is simplified - the actual report uses sequential S-numbers across all sections
  return `S${itemIndex}`;
}

// ============================================================
// Generate Summary of Concerns text
// ============================================================

function generateSummaryText(inspection) {
  const concerns = [];
  let sNum = 1;

  for (const sec of INSPECTION_SECTIONS) {
    const sectionData = inspection.sections[sec.id];
    if (!sectionData) continue;

    for (let i = 0; i < sectionData.items.length; i++) {
      const item = sectionData.items[i];
      if (item.rating === 'P' || item.rating === 'U') {
        const itemDef = sec.items[i];
        let text = `S${sNum}- `;
        if (item.comments) {
          text += item.comments;
        } else {
          text += itemDef.desc + ' - rated ' + (item.rating === 'P' ? 'Poor' : 'Unsafe');
        }
        concerns.push(text);
        sNum++;
      }
    }
  }

  // Add custom summary notes
  if (inspection.summary.concerns) {
    concerns.push('\n' + inspection.summary.concerns);
  }

  return concerns.join('\n\n');
}

// ============================================================
// Fill Addendum Checkboxes
// ============================================================

function fillAddendumCheckboxes(form, inspection) {
  // Map A-codes to their checkbox field names in the PDF
  const codeToCheckbox = {};

  // Addendum I (A1-A24): CB 1 through CB 24 (with some variants)
  const addendumI = ['A1','A2','A3','A4','A5','A6','A7','A8','A8a','A9','A10','A11','A12','A12a','A13','A14','A15','A16','A17','A18','A19','A20','A21','A22','A23','A24'];
  const cbNamesI = ['CB 8','CB 1','CB 2','CB 3','CB 4','CB 5','CB 6','CB 7','CB 7a','CB 8a','CB 9','CB 10','CB 11','CB 12','CB 12A','CB 13','CB 14','CB 15','CB 16','CB 17','CB 18','CB 19','CB 20','CB 21','CB 22','CB 23','CB 24'];
  for (let i = 0; i < addendumI.length && i < cbNamesI.length; i++) {
    codeToCheckbox[addendumI[i].toUpperCase()] = cbNamesI[i];
  }

  // Addendum II (A25-A48a): CB 25 through CB 48a
  const addendumII = ['A25','A26','A26a','A27','A28','A29','A30','A31','A32','A33','A34','A34a','A35','A36','A37','A37a','A37b','A38','A39','A40','A41','A42','A43','A44','A45','A46','A47','A48','A48a'];
  const cbNamesII = ['CB 25','CB 26','CB 26a','CB 27','CB 28','CB 29','CB 30','CB 31','CB 32','CB 33','CB 34','CB 34a','CB 35','CB 36','CB 37','CB 37a','CB 37b','CB 38','CB 39','CB 40','CB 41','CB 42','CB 43','CB 44','CB 45','CB 46','CB 47','CB 48','CB 48a'];
  for (let i = 0; i < addendumII.length && i < cbNamesII.length; i++) {
    codeToCheckbox[addendumII[i].toUpperCase()] = cbNamesII[i];
  }

  // Addendum III (A49-A55): CB 49 through CB 55
  const addendumIII = ['A49','A50','A51','A52','A53','A54','A55'];
  const cbNamesIII = ['CB 49','CB 50','CB 51','CB 52','CB 53','CB 54','CB 55'];
  for (let i = 0; i < addendumIII.length && i < cbNamesIII.length; i++) {
    codeToCheckbox[addendumIII[i].toUpperCase()] = cbNamesIII[i];
  }

  // Check the boxes for selected codes
  for (const code of (inspection.addendumCodes || [])) {
    const cbName = codeToCheckbox[code.toUpperCase()];
    if (cbName) {
      trySetCheckbox(form, cbName, true);
    }
  }
}

// ============================================================
// Fill Photo Pages (Pages 21-22)
// ============================================================

async function fillPhotos(pdfDoc, form, inspection) {
  // Collect all photos across all sections
  const allPhotos = [];
  for (const sec of INSPECTION_SECTIONS) {
    const sectionData = inspection.sections[sec.id];
    if (!sectionData) continue;

    for (let i = 0; i < sectionData.items.length; i++) {
      const item = sectionData.items[i];
      if (item.photos && item.photos.length > 0) {
        for (const photoId of item.photos) {
          allPhotos.push({
            photoId,
            sectionTitle: sec.title,
            itemDesc: sec.items[i].desc,
            itemNum: sec.items[i].num
          });
        }
      }
    }
  }

  if (allPhotos.length === 0) return;

  // Get the photo pages (pages 21 and 22, 0-indexed: 20 and 21)
  const pages = pdfDoc.getPages();

  // Place photos on the photo pages
  // Layout: 2 columns x 3 rows per page = 6 photos per page
  const photosPerPage = 6;
  const colWidth = 250;
  const rowHeight = 200;
  const startX = 50;
  const startY = 700;
  const photoWidth = 230;
  const photoHeight = 170;

  for (let p = 0; p < 2 && p * photosPerPage < allPhotos.length; p++) {
    const pageIndex = 20 + p; // Pages 21-22
    if (pageIndex >= pages.length) break;
    const page = pages[pageIndex];

    for (let i = 0; i < photosPerPage; i++) {
      const photoIndex = p * photosPerPage + i;
      if (photoIndex >= allPhotos.length) break;

      const photoInfo = allPhotos[photoIndex];
      try {
        const photo = await getPhoto(photoInfo.photoId);
        if (!photo || !photo.blob) continue;

        const arrayBuffer = await photo.blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let image;
        // Detect image type
        if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
          image = await pdfDoc.embedJpg(uint8Array);
        } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
          image = await pdfDoc.embedPng(uint8Array);
        } else {
          // Try JPEG as default
          image = await pdfDoc.embedJpg(uint8Array);
        }

        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = startX + col * colWidth;
        const y = startY - row * rowHeight;

        // Scale image to fit
        const dims = image.scaleToFit(photoWidth, photoHeight);
        page.drawImage(image, {
          x: x + (photoWidth - dims.width) / 2,
          y: y - dims.height,
          width: dims.width,
          height: dims.height
        });

      } catch (e) {
        console.warn(`Failed to embed photo ${photoInfo.photoId}:`, e.message);
      }
    }
  }
}
