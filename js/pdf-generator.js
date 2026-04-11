// ============================================================
// Shield Inspection Services — PDF Generator
// Uses pdf-lib to fill the existing NYS blank PDF template
// Includes Photo Appendix with labeled, cross-referenced photos
// ============================================================

import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib';
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

function setTextField(form, fieldName, value, fontSize, { autoFit = false } = {}) {
  if (!value) return;
  try {
    const field = form.getTextField(fieldName);
    field.setText(String(value));
    if (autoFit) {
      // fontSize 0 tells the PDF renderer to auto-scale text to fit the field
      field.enableMultiline();
      field.setFontSize(0);
    } else if (fontSize) {
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

/**
 * Word-wrap text to a maximum line length, respecting explicit newlines
 */
function wordWrap(text, maxChars) {
  const result = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      if (!word) continue;
      if (line.length + word.length + 1 > maxChars && line.length > 0) {
        result.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) result.push(line);
    else result.push(''); // preserve blank lines
  }
  return result;
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

    // --- custom logic for Exterior Item 1 ---
    if (sec.id === 'exterior' && sectionData.items[0]) {
      const item1 = sectionData.items[0];
      // Keys must match app.js storage format: opt.toLowerCase().replace(/[^a-z0-9]/g, '')
      const optMap = {
        'vinyl': 'Check Box 23',
        'aluminum': 'Check Box 24',
        'brick': 'Check Box 25',
        'wood': 'Check Box 26',
        'composition': 'Check Box 27',
        'stucco': 'Check Box 28',
        'asbshingles': 'Check Box 29'
      };
      
      Object.keys(item1.selectedOptions || {}).forEach(opt => {
        if (item1.selectedOptions[opt] && optMap[opt]) {
          trySetCheckbox(form, optMap[opt], true);
        }
      });
      
      if (item1.otherText) {
        setTextField(form, 'Text Field 13', item1.otherText, 9, { autoFit: true });
      }
      
      if (item1.rating) {
        const ratingMap = { 'S': 'Yes', 'M': 'Yes1', 'P': 'Yes2', 'U': 'Yes3' };
        const valName = ratingMap[item1.rating];
        if (valName) {
          try {
            const f = form.getField('CheckBoxGrp1');
            const widgets = f.acroField.getWidgets();
            f.acroField.dict.set(PDFName.of('V'), PDFName.of(valName));
            widgets.forEach(w => {
              const onVal = w.getOnValue();
              if (onVal && onVal.value === valName) w.setAppearanceState(PDFName.of(valName));
              else w.setAppearanceState(PDFName.of('Off'));
            });
          } catch(e) { }
        }
      }
    }
    // ----------------------------------------

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
  const headerHeight = 70;  // header bar + address
  const bottomMargin = 40;
  const lineHeight = 9;
  const commentFontSize = 6.5;
  const maxLineChars = 85;  // full-width allows many more chars per line
  const photoMaxW = contentW - 20;
  const photoMaxH = 280;

  // Colors
  const headerBlue = rgb(65 / 255, 101 / 255, 245 / 255);
  const darkText = rgb(0.15, 0.15, 0.15);
  const mutedText = rgb(0.4, 0.4, 0.4);
  const lightBg = rgb(0.96, 0.96, 0.97);

  let pageNum = 1;
  let page = null;
  let cursorY = 0; // tracks current vertical position

  function startNewPage() {
    page = pdfDoc.addPage([pageW, pageH]);

    // Draw header bar
    page.drawRectangle({
      x: 0, y: pageH - 50,
      width: pageW, height: 50,
      color: headerBlue
    });

    page.drawText('PHOTO APPENDIX — Shield Inspection Services', {
      x: margin, y: pageH - 35,
      size: 12, font: fontBold, color: rgb(1, 1, 1)
    });

    page.drawText(`Page ${pageNum}`, {
      x: pageW - margin - 40, y: pageH - 35,
      size: 9, font: font, color: rgb(1, 1, 1)
    });

    const addr = `${inspection.cover.street}, ${inspection.cover.city}, ${inspection.cover.state} ${inspection.cover.zip}`;
    page.drawText(addr, {
      x: margin, y: pageH - 65,
      size: 8, font: font, color: mutedText
    });

    pageNum++;
    cursorY = pageH - headerHeight - 10;
  }

  for (let i = 0; i < photoRefs.length; i++) {
    const ref = photoRefs[i];

    // --- Pre-compute comment lines so we know total height ---
    let commentLines = [];
    if (ref.comments) {
      let fullComment = ref.comments;

      // Expand A-code references with full addendum text
      const aCodeMatches = ref.comments.match(/A\d+[a-z]?/gi);
      if (aCodeMatches) {
        const uniqueCodes = [...new Set(aCodeMatches.map(c => c.toUpperCase()))];
        for (const code of uniqueCodes) {
          const aCodeDef = A_CODES.find(ac => ac.code.toUpperCase() === code);
          if (aCodeDef) {
            fullComment += `\n${aCodeDef.code} - ${aCodeDef.text}`;
          }
        }
      }

      commentLines = wordWrap(fullComment, maxLineChars);
    }

    // --- Determine photo dimensions ---
    let image = null;
    let imgW = 0, imgH = 0;
    try {
      const photo = await getPhoto(ref.photoId);
      if (photo && photo.blob) {
        const arrayBuffer = await photo.blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
          image = await pdfDoc.embedJpg(uint8Array);
        } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
          image = await pdfDoc.embedPng(uint8Array);
        } else {
          image = await pdfDoc.embedJpg(uint8Array);
        }

        const dims = image.scaleToFit(photoMaxW, photoMaxH);
        imgW = dims.width;
        imgH = dims.height;
      }
    } catch (e) {
      console.warn(`Failed to load photo ${ref.photoId}:`, e.message);
    }

    // Calculate total entry height:
    // label header (25) + description (15) + photo + gap (10) + comment lines + padding (20)
    const commentBlockH = commentLines.length * lineHeight;
    const entryHeight = 25 + 15 + (image ? imgH + 10 : 30) + commentBlockH + 30;

    // Start new page if needed or if this is the first photo
    if (!page || cursorY - entryHeight < bottomMargin) {
      startNewPage();
    }

    const entryX = margin;
    const entryTop = cursorY;

    // --- Draw cell background ---
    page.drawRectangle({
      x: entryX, y: entryTop - entryHeight,
      width: contentW, height: entryHeight,
      color: lightBg,
      borderColor: rgb(0.85, 0.85, 0.87),
      borderWidth: 0.5
    });

    // --- Reference label badge (P1, P2, etc.) ---
    page.drawRectangle({
      x: entryX + 5, y: entryTop - 18,
      width: 30, height: 16,
      color: headerBlue
    });
    page.drawText(ref.refLabel, {
      x: entryX + 9, y: entryTop - 14,
      size: 9, font: fontBold, color: rgb(1, 1, 1)
    });

    // --- Section & item label ---
    page.drawText(`${ref.sectionTitle} — Item #${ref.itemNum}`, {
      x: entryX + 42, y: entryTop - 14,
      size: 9, font: fontBold, color: darkText
    });

    // --- Rating badge (top right) ---
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
        x: entryX + contentW - 30, y: entryTop - 18,
        width: 22, height: 16,
        color: rColor
      });
      page.drawText(ref.rating, {
        x: entryX + contentW - 26, y: entryTop - 14,
        size: 8, font: fontBold, color: rgb(1, 1, 1)
      });
    }

    // --- Item description ---
    const desc = ref.itemDesc.length > 90 ? ref.itemDesc.substring(0, 87) + '...' : ref.itemDesc;
    page.drawText(desc, {
      x: entryX + 5, y: entryTop - 30,
      size: 7, font: font, color: mutedText
    });

    // --- Photo ---
    let photoBottomY = entryTop - 45;
    if (image) {
      const imgX = entryX + 10 + (photoMaxW - imgW) / 2;
      const imgY = photoBottomY - imgH;

      page.drawImage(image, {
        x: imgX, y: imgY,
        width: imgW, height: imgH
      });

      photoBottomY = imgY - 8;
    } else {
      page.drawText('[Photo unavailable]', {
        x: entryX + 10, y: photoBottomY - 15,
        size: 8, font: font, color: mutedText
      });
      photoBottomY -= 25;
    }

    // --- Comment + expanded A-codes ---
    for (let l = 0; l < commentLines.length; l++) {
      page.drawText(commentLines[l], {
        x: entryX + 8, y: photoBottomY - l * lineHeight,
        size: commentFontSize, font: font, color: darkText
      });
    }

    // Move cursor down past this entry + some spacing
    cursorY = entryTop - entryHeight - 10;
  }
}

