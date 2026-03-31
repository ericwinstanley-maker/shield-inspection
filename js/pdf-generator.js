// ============================================================
// Shield Inspection Services — PDF Generator
// Uses pdf-lib to fill the existing NYS blank PDF template
// Includes Photo Appendix with labeled, cross-referenced photos
// ============================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { INSPECTION_SECTIONS, A_CODES } from './models.js';
import { getPhoto, blobToDataURL } from './db.js';

// Font sizes for different field types
const FONT_SIZE_COMMENT = 7;
const FONT_SIZE_FIELD = 9;
const FONT_SIZE_SUMMARY = 7;

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
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // ============================================================
  // Collect all photos with references FIRST
  // (so we can add "See Photo P1" to comments before filling)
  // ============================================================
  const photoRefs = collectPhotoReferences(inspection);

  // ============================================================
  // PAGE 1: Cover Page
  // ============================================================
  try {
    setTextField(form, 'Address', `${inspection.cover.street}\n${inspection.cover.city}, ${inspection.cover.state}\n${inspection.cover.zip}`, FONT_SIZE_FIELD);
    setTextField(form, 'Client', inspection.cover.clientName, FONT_SIZE_FIELD);
    setTextField(form, 'Date', inspection.cover.inspectionDate, FONT_SIZE_FIELD);
  } catch (e) { console.warn('Cover page fields:', e.message); }

  // ============================================================
  // PAGE 4: General Information
  // ============================================================
  try {
    setTextField(form, 'Text Field 1', `${inspection.cover.street} ${inspection.cover.city}, ${inspection.cover.state} ${inspection.cover.zip}`, FONT_SIZE_FIELD);
    setTextField(form, 'Text Field 2', inspection.cover.inspectionDate, FONT_SIZE_FIELD);
    setTextField(form, 'Text Field 3', formatTime(inspection.general.timeStarted), FONT_SIZE_FIELD);
    setTextField(form, 'Text Field 4', formatTime(inspection.general.timeCompleted), FONT_SIZE_FIELD);
    setTextField(form, 'Age', inspection.general.approximateAge, FONT_SIZE_FIELD);
    setTextField(form, 'Text Field 8', inspection.general.squareFootage, FONT_SIZE_FIELD);

    // Combo boxes
    trySetCombo(form, 'Combo Box 1', inspection.general.propertyType);
    trySetCombo(form, 'Combo Box 2', inspection.general.garageType);
    trySetCombo(form, 'Driveway', inspection.general.driveway);
  } catch (e) { console.warn('General info fields:', e.message); }

  // ============================================================
  // INSPECTION SECTIONS (Pages 5-15): Fill ratings and comments
  // ============================================================
  fillSectionFields(form, inspection, photoRefs);

  // ============================================================
  // PAGES 16-17: Summary of Concerns
  // ============================================================
  try {
    const summaryText = generateSummaryText(inspection, photoRefs);
    setTextField(form, 'Text Field 166', summaryText, FONT_SIZE_SUMMARY);
  } catch (e) { console.warn('Summary field:', e.message); }

  // ============================================================
  // PAGES 18-20: Addendum Checkboxes
  // ============================================================
  fillAddendumCheckboxes(form, inspection);

  // ============================================================
  // PHOTO APPENDIX: New pages with labeled photos
  // ============================================================
  await generatePhotoAppendix(pdfDoc, font, fontBold, inspection, photoRefs);

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

function setTextField(form, fieldName, value, fontSize) {
  if (!value) return;
  try {
    const field = form.getTextField(fieldName);
    field.setText(String(value));
    if (fontSize) {
      field.setFontSize(fontSize);
    }
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
    setTextField(form, fieldName, value, FONT_SIZE_FIELD);
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
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ============================================================
// Collect photo references for cross-referencing
// Returns an array of { photoId, sectionTitle, itemDesc, itemNum, sectionId, itemIndex, refLabel }
// ============================================================

function collectPhotoReferences(inspection) {
  const refs = [];
  let pNum = 1;

  for (const sec of INSPECTION_SECTIONS) {
    const sectionData = inspection.sections[sec.id];
    if (!sectionData) continue;

    for (let i = 0; i < sectionData.items.length; i++) {
      const item = sectionData.items[i];
      if (item.photos && item.photos.length > 0) {
        for (const photoId of item.photos) {
          refs.push({
            photoId,
            sectionTitle: sec.title.replace(' INSPECTION', '').replace(' & SOLID FUEL-BURNING APPLIANCES', ''),
            sectionId: sec.id,
            itemDesc: sec.items[i].desc,
            itemNum: sec.items[i].num,
            itemIndex: i,
            comments: item.comments || '',
            rating: item.rating || '',
            refLabel: `P${pNum}`
          });
          pNum++;
        }
      }
    }
  }

  return refs;
}

// ============================================================
// Fill inspection section fields (ratings & comments)
// Now includes photo cross-references
// ============================================================

function fillSectionFields(form, inspection, photoRefs) {
  const sectionFieldMap = {
    exterior: { commentFields: ['Text Field 12', 'Text Field 15', 'Text Field 17', 'Text Field 22', 'Text Field 23'] },
    roof: { commentFields: ['Text Field 25', 'Text Field 28', 'Text Field 31', 'Text Field 32'] },
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
    const itemsWithComments = sectionData.items
      .map((it, idx) => ({ ...it, originalIndex: idx }))
      .filter(it => it.comments || (it.photos && it.photos.length > 0));

    for (let i = 0; i < itemsWithComments.length && i < (mapping.commentFields || []).length; i++) {
      const fieldName = mapping.commentFields[i];
      const item = itemsWithComments[i];

      // Build comment text
      let text = item.comments || '';

      // Add photo references
      const itemPhotos = photoRefs.filter(
        pr => pr.sectionId === sec.id && pr.itemIndex === item.originalIndex
      );
      if (itemPhotos.length > 0) {
        const refs = itemPhotos.map(p => p.refLabel).join(', ');
        if (text) text += ` (See Photo ${refs})`;
        else text = `See Photo ${refs}`;
      }

      setTextField(form, fieldName, text, FONT_SIZE_COMMENT);
    }
  }
}

// ============================================================
// Generate Summary of Concerns text
// ============================================================

function generateSummaryText(inspection, photoRefs) {
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

        // Add photo references
        const itemPhotos = photoRefs.filter(
          pr => pr.sectionId === sec.id && pr.itemIndex === i
        );
        if (itemPhotos.length > 0) {
          text += ` (See Photo ${itemPhotos.map(p => p.refLabel).join(', ')})`;
        }

        concerns.push(text);
        sNum++;
      }
    }
  }

  if (inspection.summary.concerns) {
    concerns.push('\n' + inspection.summary.concerns);
  }

  return concerns.join('\n\n');
}

// ============================================================
// Fill Addendum Checkboxes
// ============================================================

function fillAddendumCheckboxes(form, inspection) {
  const codeToCheckbox = {};

  const addendumI = ['A1','A2','A3','A4','A5','A6','A7','A8','A8a','A9','A10','A11','A12','A12a','A13','A14','A15','A16','A17','A18','A19','A20','A21','A22','A23','A24'];
  const cbNamesI = ['CB 8','CB 1','CB 2','CB 3','CB 4','CB 5','CB 6','CB 7','CB 7a','CB 8a','CB 9','CB 10','CB 11','CB 12','CB 12A','CB 13','CB 14','CB 15','CB 16','CB 17','CB 18','CB 19','CB 20','CB 21','CB 22','CB 23','CB 24'];
  for (let i = 0; i < addendumI.length && i < cbNamesI.length; i++) {
    codeToCheckbox[addendumI[i].toUpperCase()] = cbNamesI[i];
  }

  const addendumII = ['A25','A26','A26a','A27','A28','A29','A30','A31','A32','A33','A34','A34a','A35','A36','A37','A37a','A37b','A38','A39','A40','A41','A42','A43','A44','A45','A46','A47','A48','A48a'];
  const cbNamesII = ['CB 25','CB 26','CB 26a','CB 27','CB 28','CB 29','CB 30','CB 31','CB 32','CB 33','CB 34','CB 34a','CB 35','CB 36','CB 37','CB 37a','CB 37b','CB 38','CB 39','CB 40','CB 41','CB 42','CB 43','CB 44','CB 45','CB 46','CB 47','CB 48','CB 48a'];
  for (let i = 0; i < addendumII.length && i < cbNamesII.length; i++) {
    codeToCheckbox[addendumII[i].toUpperCase()] = cbNamesII[i];
  }

  const addendumIII = ['A49','A50','A51','A52','A53','A54','A55'];
  const cbNamesIII = ['CB 49','CB 50','CB 51','CB 52','CB 53','CB 54','CB 55'];
  for (let i = 0; i < addendumIII.length && i < cbNamesIII.length; i++) {
    codeToCheckbox[addendumIII[i].toUpperCase()] = cbNamesIII[i];
  }

  for (const code of (inspection.addendumCodes || [])) {
    const cbName = codeToCheckbox[code.toUpperCase()];
    if (cbName) {
      trySetCheckbox(form, cbName, true);
    }
  }
}

// ============================================================
// Photo Appendix — Generate clean new pages with labeled photos
// ============================================================

async function generatePhotoAppendix(pdfDoc, font, fontBold, inspection, photoRefs) {
  if (photoRefs.length === 0) return;

  // Page dimensions (letter size)
  const pageW = 612;
  const pageH = 792;
  const margin = 40;
  const contentW = pageW - margin * 2;

  // Layout: 2 columns, 2 rows per page = 4 photos per page
  const colW = (contentW - 20) / 2;  // 20px gap between columns
  const photoMaxW = colW - 10;
  const photoMaxH = 200;
  const cellH = 300;  // Total cell height (photo + labels)

  let pageNum = 1;
  let page = null;
  let posIndex = 0;

  // Header bar color (Shield blue)
  const headerBlue = rgb(65 / 255, 101 / 255, 245 / 255);
  const darkText = rgb(0.15, 0.15, 0.15);
  const mutedText = rgb(0.4, 0.4, 0.4);
  const lightBg = rgb(0.96, 0.96, 0.97);

  for (let i = 0; i < photoRefs.length; i++) {
    // Start new page every 4 photos
    if (posIndex % 4 === 0) {
      page = pdfDoc.addPage([pageW, pageH]);

      // Draw header bar
      page.drawRectangle({
        x: 0, y: pageH - 50,
        width: pageW, height: 50,
        color: headerBlue
      });

      // Header text
      page.drawText('PHOTO APPENDIX — Shield Inspection Services', {
        x: margin, y: pageH - 35,
        size: 12, font: fontBold, color: rgb(1, 1, 1)
      });

      // Page number
      page.drawText(`Page ${pageNum}`, {
        x: pageW - margin - 40, y: pageH - 35,
        size: 9, font: font, color: rgb(1, 1, 1)
      });

      // Property address
      const addr = `${inspection.cover.street}, ${inspection.cover.city}, ${inspection.cover.state} ${inspection.cover.zip}`;
      page.drawText(addr, {
        x: margin, y: pageH - 65,
        size: 8, font: font, color: mutedText
      });

      pageNum++;
      posIndex = 0;
    }

    const ref = photoRefs[i];
    const col = posIndex % 2;
    const row = Math.floor(posIndex / 2);

    const cellX = margin + col * (colW + 20);
    const cellY = pageH - 85 - row * cellH;

    // Draw cell background
    page.drawRectangle({
      x: cellX, y: cellY - cellH + 20,
      width: colW, height: cellH - 10,
      color: lightBg,
      borderColor: rgb(0.85, 0.85, 0.87),
      borderWidth: 0.5
    });

    // Draw reference label badge (P1, P2, etc.)
    page.drawRectangle({
      x: cellX + 5, y: cellY - 3,
      width: 30, height: 16,
      color: headerBlue
    });

    page.drawText(ref.refLabel, {
      x: cellX + 9, y: cellY + 1,
      size: 9, font: fontBold, color: rgb(1, 1, 1)
    });

    // Draw section & item label
    page.drawText(`${ref.sectionTitle} — Item #${ref.itemNum}`, {
      x: cellX + 40, y: cellY,
      size: 8, font: fontBold, color: darkText
    });

    // Draw item description (truncated)
    const desc = ref.itemDesc.length > 60 ? ref.itemDesc.substring(0, 57) + '...' : ref.itemDesc;
    page.drawText(desc, {
      x: cellX + 5, y: cellY - 18,
      size: 7, font: font, color: mutedText
    });

    // Try to embed the photo
    let photoY = cellY - 30;
    try {
      const photo = await getPhoto(ref.photoId);
      if (photo && photo.blob) {
        const arrayBuffer = await photo.blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let image;
        if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
          image = await pdfDoc.embedJpg(uint8Array);
        } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
          image = await pdfDoc.embedPng(uint8Array);
        } else {
          image = await pdfDoc.embedJpg(uint8Array);
        }

        const dims = image.scaleToFit(photoMaxW - 10, photoMaxH);
        const imgX = cellX + 5 + (photoMaxW - 10 - dims.width) / 2;
        const imgY = photoY - dims.height;

        page.drawImage(image, {
          x: imgX, y: imgY,
          width: dims.width, height: dims.height
        });

        photoY = imgY - 5;
      }
    } catch (e) {
      console.warn(`Failed to embed photo ${ref.photoId}:`, e.message);
      page.drawText('[Photo unavailable]', {
        x: cellX + 5, y: photoY - 20,
        size: 8, font: font, color: mutedText
      });
      photoY -= 30;
    }

    // Draw comment below photo (if any)
    if (ref.comments) {
      const comment = ref.comments.length > 120 ? ref.comments.substring(0, 117) + '...' : ref.comments;
      // Split into lines if needed
      const maxLineChars = 45;
      const lines = [];
      for (let c = 0; c < comment.length; c += maxLineChars) {
        lines.push(comment.substring(c, c + maxLineChars));
      }

      for (let l = 0; l < Math.min(lines.length, 3); l++) {
        page.drawText(lines[l], {
          x: cellX + 5, y: photoY - 12 - l * 10,
          size: 6.5, font: font, color: darkText
        });
      }
    }

    // Draw rating badge if present
    if (ref.rating) {
      const ratingColors = {
        S: rgb(34 / 255, 197 / 255, 94 / 255),
        M: rgb(245 / 255, 158 / 255, 11 / 255),
        P: rgb(231 / 255, 31 / 255, 48 / 255),
        U: rgb(255 / 255, 23 / 255, 68 / 255),
        NA: rgb(107 / 255, 114 / 255, 128 / 255),
        D: rgb(139 / 255, 92 / 255, 246 / 255)
      };

      const rColor = ratingColors[ref.rating] || mutedText;
      page.drawRectangle({
        x: cellX + colW - 30, y: cellY - 3,
        width: 22, height: 16,
        color: rColor
      });
      page.drawText(ref.rating, {
        x: cellX + colW - 26, y: cellY + 1,
        size: 8, font: fontBold, color: rgb(1, 1, 1)
      });
    }

    posIndex++;
  }
}
