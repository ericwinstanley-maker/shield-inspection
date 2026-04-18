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
  // Remove pages we no longer need from the template
  // Must remove in reverse order to keep indices stable
  //   Index 21: Photos Regarding Your Inspection - II
  //   Index 20: Photos Regarding Your Inspection - I
  //   Index 16: Summary of Concerns (page 2 w/ signature)
  //   Index 15: Summary of Concerns (page 1)
  // ============================================================
  for (const pageIdx of [21, 20, 16, 15]) {
    try { pdfDoc.removePage(pageIdx); } catch (e) {
      console.warn(`Could not remove page ${pageIdx}:`, e.message);
    }
  }

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
  // PAGE 1: Cover Photo (front of house, below Date)
  // ============================================================
  if (inspection.cover.coverPhotoId) {
    try {
      const coverPhoto = await getPhoto(inspection.cover.coverPhotoId);
      if (coverPhoto && coverPhoto.blob) {
        const arrayBuffer = await coverPhoto.blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let coverImage;
        if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
          coverImage = await pdfDoc.embedJpg(uint8Array);
        } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
          coverImage = await pdfDoc.embedPng(uint8Array);
        } else {
          coverImage = await pdfDoc.embedJpg(uint8Array);
        }

        // Position the photo on page 1, centered below the Date field
        const coverPage = pdfDoc.getPages()[0];
        const pageWidth = coverPage.getWidth();

        // Max photo dimensions — fit in the space below Date (y=184) with some padding
        const maxPhotoW = 320;
        const maxPhotoH = 140;
        const dims = coverImage.scaleToFit(maxPhotoW, maxPhotoH);

        // Date field bottom is at y=184. Place photo centered below with a small gap.
        const photoX = (pageWidth - dims.width) / 2;
        const photoY = 170 - dims.height;  // 14pt gap below Date field bottom

        coverPage.drawImage(coverImage, {
          x: photoX,
          y: photoY,
          width: dims.width,
          height: dims.height,
        });
      }
    } catch (e) {
      console.warn('Cover photo embed failed:', e.message);
    }
  }

  // ============================================================
  // PAGE 2: Inspection Fee (contract page)
  // ============================================================
  try {
    const feeVal = inspection.cover.inspectionFee;
    if (feeVal) {
      const field = form.getTextField('Text9');
      field.setText('$' + String(feeVal));
      field.setFontSize(FONT_SIZE_FIELD);
      field.setAlignment(1); // 1 = left align within the field
    }
  } catch (e) { console.warn('Inspection fee field:', e.message); }

  // ============================================================
  // PAGE 3: Contract Authorization (realtor release, email)
  // ============================================================
  try {
    // Realtor release checkboxes: Check Box3 = yes, Check Box4 = no
    if (inspection.cover.realtorRelease === 'yes') {
      trySetCheckbox(form, 'Check Box3', true);
      trySetCheckbox(form, 'Check Box4', false);
    } else if (inspection.cover.realtorRelease === 'no') {
      trySetCheckbox(form, 'Check Box3', false);
      trySetCheckbox(form, 'Check Box4', true);
    }
    // Realtor name
    setTextField(form, 'Text3', inspection.cover.realtorName, FONT_SIZE_FIELD);
    // Client email
    setTextField(form, 'Text4', inspection.cover.clientEmail, FONT_SIZE_FIELD);
  } catch (e) { console.warn('Contract auth fields:', e.message); }

  // ============================================================
  // PAGE 3: Client Signature & Date
  // ============================================================
  if (inspection.cover.clientSignature) {
    try {
      // Decode the data URL to raw bytes
      const dataUrl = inspection.cover.clientSignature;
      const base64 = dataUrl.split(',')[1];
      const binaryStr = atob(base64);
      const sigBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        sigBytes[i] = binaryStr.charCodeAt(i);
      }

      const sigImage = await pdfDoc.embedPng(sigBytes);
      const page3 = pdfDoc.getPages()[2];

      // Client Signature area: x=263, y=279, w=150, h=32
      const sigDims = sigImage.scaleToFit(150, 32);
      page3.drawImage(sigImage, {
        x: 263,
        y: 279,
        width: sigDims.width,
        height: sigDims.height,
      });
    } catch (e) {
      console.warn('Client signature embed failed:', e.message);
    }
  }

  // Signature date
  try {
    const sigDate = inspection.cover.signatureDate || inspection.cover.inspectionDate || '';
    setTextField(form, 'Text8', sigDate, FONT_SIZE_FIELD);
  } catch (e) { console.warn('Signature date field:', e.message); }

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

    // Attending / Present checkboxes
    const attendees = inspection.general.attendees || [];
    const attendeeMap = {
      'Client':                       'Check Box 1',   // Row 1 left
      'Real Estate Agent for Seller':  'Check Box 3',   // Row 1 middle
      'Tenant':                        'Check Box 6',   // Row 1 right
      'Owner':                         'Check Box 2',   // Row 2 left
      'Real Estate Agent for Buyer':   'Check Box 4',   // Row 2 middle
      'No one':                        'Check Box 5',   // Row 2 right
    };
    for (const [label, fieldName] of Object.entries(attendeeMap)) {
      trySetCheckbox(form, fieldName, attendees.includes(label));
    }
  } catch (e) { console.warn('General info fields:', e.message); }

  // ============================================================
  // INSPECTION SECTIONS (Pages 5-15): Fill ratings and comments
  // ============================================================
  const deferredDraws = fillSectionFields(form, pdfDoc, font, inspection, photoRefs);

  // ============================================================
  // ADDENDUM CHECKBOXES (now pages 16-18 after removal)
  // ============================================================
  fillAddendumCheckboxes(form, inspection);

  // ============================================================
  // PHOTO APPENDIX: New pages with labeled photos
  // ============================================================
  await generatePhotoAppendix(pdfDoc, font, fontBold, inspection, photoRefs);

  // Update appearance streams for all fields
  form.updateFieldAppearances();

  // ============================================================
  // Pre-flatten fixup: repair broken Check Box1642
  // ============================================================
  // Check Box1642 (Insulation Item 2 - Attic Vents Yes/No) has DUPLICATE
  // onValues: both widgets have onValue 'Yes'. This causes form.flatten()
  // to crash, leaving checkboxes interactive and potentially checked.
  //
  // Fix strategy:
  // 1. Rename second widget's onValue from 'Yes' to 'No' (so they're unique)
  // 2. Force ALL widgets to 'Off' appearance state (since we draw our own checkmarks)
  // 3. Set the field value to 'Off'
  try {
    const cb1642 = form.getCheckBox('Check Box1642');
    const widgets1642 = cb1642.acroField.getWidgets();

    // Rename second widget's onValue so flatten() can distinguish them
    if (widgets1642.length >= 2) {
      const noWidget = widgets1642[1];
      const ap = noWidget.dict.lookup(PDFName.of('AP'));
      if (ap) {
        const n = ap.lookup(PDFName.of('N'));
        if (n && typeof n.get === 'function') {
          const yesAppearance = n.get(PDFName.of('Yes'));
          if (yesAppearance) {
            n.set(PDFName.of('No'), yesAppearance);
            n.delete(PDFName.of('Yes'));
          }
        }
      }
    }

    // Force ALL widgets to 'Off' appearance state — critical because
    // uncheck() only sets the first widget, and updateFieldAppearances()
    // may have set some widgets back to 'Yes' state
    cb1642.acroField.setValue(PDFName.of('Off'));
    for (const w of widgets1642) {
      w.setAppearanceState(PDFName.of('Off'));
    }
  } catch (e) {
    console.warn('Could not fix Check Box1642:', e.message);
  }

  try {
    form.flatten();
  } catch (e) {
    console.warn('Could not flatten form (values still visible):', e.message);
  }

  // Execute deferred draw overrides AFTER flatten so they appear on top of
  // the now-static page content (e.g., broken duplicate checkboxes)
  for (const draw of deferredDraws) {
    const page = pdfDoc.getPages()[draw.pageIndex];
    // Draw a checkmark as two lines matching the form's native checkbox style
    const sz = draw.size;
    page.drawLine({
      start: { x: draw.x + 1, y: draw.y + sz * 0.4 },
      end:   { x: draw.x + sz * 0.35, y: draw.y + 1 },
      thickness: 1.5,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawLine({
      start: { x: draw.x + sz * 0.35, y: draw.y + 1 },
      end:   { x: draw.x + sz - 1, y: draw.y + sz - 1 },
      thickness: 1.5,
      color: rgb(0.2, 0.2, 0.2),
    });
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

/**
 * Set a radio-button-style rating group (S/M/P/U) on the PDF.
 * All CheckBoxGrp fields have 4 widgets with on-values [Yes, Yes1, Yes2, Yes3]
 * except CheckBoxGrp28-33 (Electrical) which use [Yes, Yes2, Yes2, Yes3].
 */
function setRatingGroup(form, groupName, rating) {
  if (!rating) return;

  // Standard mapping: S→Yes, M→Yes1, P→Yes2, U→Yes3
  let ratingMap = { 'S': 'Yes', 'M': 'Yes1', 'P': 'Yes2', 'U': 'Yes3' };

  // Electrical groups 28-33 have M widget using 'Yes2' instead of 'Yes1'
  const grpNum = parseInt(groupName.replace('CheckBoxGrp', ''), 10);
  if (grpNum >= 28 && grpNum <= 33) {
    ratingMap = { 'S': 'Yes', 'M': 'Yes2', 'P': 'Yes2', 'U': 'Yes3' };
  }

  const valName = ratingMap[rating];
  if (!valName) return;

  try {
    const f = form.getField(groupName);
    const widgets = f.acroField.getWidgets();
    f.acroField.dict.set(PDFName.of('V'), PDFName.of(valName));
    widgets.forEach(w => {
      const onVal = w.getOnValue();
      // Use decodeText() for reliable comparison — .value is a getter function in this pdf-lib version
      const onValStr = onVal ? onVal.decodeText() : '';
      if (onValStr === valName) w.setAppearanceState(PDFName.of(valName));
      else w.setAppearanceState(PDFName.of('Off'));
    });
  } catch (e) {
    // Field may not exist; skip silently
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

function fillSectionFields(form, pdfDoc, font, inspection, photoRefs) {
  // Deferred draw commands for broken checkboxes — executed AFTER flatten()
  const deferredDraws = [];

  // Comment fields: the right-side COMMENTS column for each item (w=122, x≈388)
  // Ordered top-to-bottom on each page, mapped to items that have comment areas
  const sectionFieldMap = {
    exterior: { commentFields: ['Text Field 12', 'Text Field 15', 'Text Field 17', 'Text Field 18', 'Text Field 20', 'Text Field 19', 'Text Field 21', 'Text Field 22', 'Text Field 23'] },
    roof: { commentFields: ['Text Field 25', 'Text Field 28', 'Text Field 30', 'Text Field 31', 'Text Field 32'] },
    structural: { commentFields: ['Text Field 33', 'Text Field 34', 'Text Field 35', 'Text Field 45', 'Text Field 46'] },
    plumbing: { commentFields: ['Text Field 47', 'Text Field 50', 'Text Field 51', 'Text Field 60', 'Text Field 61', 'Text Field 64', 'Text Field 65', 'Text Field 213'] },
    electrical: { commentFields: ['Text Field 67', 'Text Field 68', 'Text Field 78', 'Text Field 210', 'Text Field 211', 'Text Field 212'] },
    heating: { commentFields: ['Text Field 84', 'Text Field 85', 'Text Field 95', 'Text Field 97', 'Text Field 98', 'Text Field 219', 'Text Field 217', 'Text Field 218', 'Text Field 220', 'Text Field 221', 'Text Field 222', 'Text Field 90'] },
    airConditioning: { commentFields: ['Text Field 106', 'Text Field 107', 'Text Field 108', 'Text Field 1012', 'Text Field 110'] },
    interior: { commentFields: ['Text Field 111', 'Text Field 125', 'Text Field 126', 'Text Field 127', 'Text Field 128', 'Text Field 129', 'Text Field 130', 'Text Field 131', 'Text Field 117'] },
    insulationVentilation: { commentFields: ['Text Field 132', 'Text Field 214', 'Text Field 215', 'Text Field 216', 'Text Field 139'] },
    fireplace: { commentFields: ['Text Field 140', 'Text Field 142', 'Text Field 143', 'Text Field 144', 'Text Field 145', 'Text Field 141'] }
  };

  // Rating group mapping: sectionId → array of CheckBoxGrp names per item index
  // null = item has no rating group on the PDF (e.g. "Other issues" text-only items)
  const ratingGroupMap = {
    exterior:             ['CheckBoxGrp1','CheckBoxGrp2','CheckBoxGrp3','CheckBoxGrp4','CheckBoxGrp5','CheckBoxGrp6','CheckBoxGrp7','CheckBoxGrp8','CheckBoxGrp9', null],
    roof:                 ['CheckBoxGrp10','CheckBoxGrp11','CheckBoxGrp12','CheckBoxGrp13','CheckBoxGrp14', null],
    structural:           ['CheckBoxGrp15','CheckBoxGrp16','CheckBoxGrp17','CheckBoxGrp18','CheckBoxGrp19', null],
    plumbing:             ['CheckBoxGrp20','CheckBoxGrp21','CheckBoxGrp22','CheckBoxGrp23','CheckBoxGrp24','CheckBoxGrp25','CheckBoxGrp26','CheckBoxGrp27', null],
    electrical:           ['CheckBoxGrp28','CheckBoxGrp29','CheckBoxGrp30','CheckBoxGrp31','CheckBoxGrp32','CheckBoxGrp33', null],
    heating:              ['CheckBoxGrp34','CheckBoxGrp35','CheckBoxGrp36','CheckBoxGrp37','CheckBoxGrp38','CheckBoxGrp39','CheckBoxGrp40','CheckBoxGrp41','CheckBoxGrp42','CheckBoxGrp43','CheckBoxGrp44', null],
    airConditioning:      ['CheckBoxGrp45','CheckBoxGrp46','CheckBoxGrp47','CheckBoxGrp48', null],
    interior:             ['CheckBoxGrp49','CheckBoxGrp50','CheckBoxGrp51','CheckBoxGrp52','CheckBoxGrp53','CheckBoxGrp54','CheckBoxGrp55','CheckBoxGrp56', null],
    insulationVentilation:['CheckBoxGrp57','CheckBoxGrp58','CheckBoxGrp59','CheckBoxGrp60', null],
    fireplace:            ['CheckBoxGrp61','CheckBoxGrp62','CheckBoxGrp63','CheckBoxGrp64','CheckBoxGrp65', null]
  };

  // ------------------------------------------------------------------
  // Checkbox option → PDF field mapping for items with selectable options
  // Keys must match: opt.toLowerCase().replace(/[^a-z0-9]/g, '')
  // ------------------------------------------------------------------
  const checkboxFieldMap = {
    // === EXTERIOR ===
    exterior: {
      0: { // Item 1 - Exterior wall covering
        options: {
          'vinyl': 'Check Box 23', 'aluminum': 'Check Box 24', 'brick': 'Check Box 25',
          'wood': 'Check Box 26', 'composition': 'Check Box 27', 'stucco': 'Check Box 28',
          'asbshingles': 'Check Box 29'
        },
        otherField: 'Text Field 13'
      },
      1: { // Item 2 - Flashing and trim
        options: {
          'vinyl': 'Check Box 34', 'wood': 'Check Box 35',
          'aluminum': 'Check Box 36', 'steel': 'Check Box 37'
        },
        otherField: 'Text Field 14'
      },
      2: { // Item 3 - All exterior doors
        options: { 'wood': 'Check Box 42', 'steel': 'Check Box 43' },
        otherField: 'Text Field 16'
      },
      3: { // Item 4 - Decks, balconies, stoops, steps, porches, railings
        options: {
          'attacheddecks': 'Check Box 48', 'balconies': 'Check Box 49',
          'stoops': 'Check Box 50', 'steps': 'Check Box 51',
          'porches': 'Check Box 52', 'associatedrailings': 'Check Box 53'
        }
      },
      5: { // Item 6 - Vegetation/grading
        options: { 'noretainingwallsobserved': 'Check Box 62' }
      },
      6: { // Item 7 - Walkways/patios
        options: { 'nopatioobserved': 'Check Box 67' }
      },
      8: { // Item 9 - Garage
        options: { 'nogarageobserved': 'Check Box 76' }
      }
    },

    // === ROOF ===
    roof: {
      0: { // Item 1 - Roof covering (Asphalt, Shingle, Wood, Rubber)
        options: {
          'asphalt': 'Check Box 85', 'shingle': 'Check Box 87',
          'wood': 'Check Box 88', 'rubber': 'Check Box 90'
        },
        otherField: 'Text Field 26'
      },
      1: { // Item 2 - Roof drainage (Yankee, Plastic, Steel, Aluminum)
        options: {
          'yankee': 'Check Box 96', 'plastic': 'Check Box 97',
          'steel': 'Check Box 98', 'aluminum': 'Check Box 99'
        },
        otherField: 'Text Field 27'
      },
      3: { // Item 4 - Skylights
        options: { 'noskylightsobserved': 'Check Box 105' }
      },
      4: { // Item 5 - Method to inspect
        options: {
          'visualfromtheground': 'Check Box 106', 'binoculars': 'Check Box 107',
          'fromtheatticscuttle': 'Check Box 108', 'drone': 'drone'
        }
      }
    },

    // === STRUCTURAL ===
    structural: {
      0: { // Item 1 - Foundation/framing (Poured concrete, Concrete block, Stone, Cinder block)
        options: {
          'pouredconcrete': 'Check Box 110', 'concreteblock': 'Check Box 112',
          'stone': 'Check Box 114', 'cinderblock': 'Check Box 116'
        },
        otherField: 'Text Field 38'
      },
      3: { // Item 4 - Foundation type (Full basement, Partial basement, Crawl, Slab)
        options: {
          'fullbasement': 'Check Box 126', 'partialbasement': 'Check Box 127',
          'crawl': 'Check Box 130', 'slab': 'Check Box 131'
        },
        percentFields: {
          'partialbasement': 'Text Field 41',
          'crawl': 'Text Field 42',
          'slab': 'Text Field 43'
        },
        otherField: 'Text Field 44'
      }
    },

    // === PLUMBING ===
    plumbing: {
      0: { // Item 1 - Water supply & distribution
        options: {
          'visiblesupply_copper': 'Check Box 137', 'visiblesupply_galvanized': 'Check Box 138',
          'visiblesupply_plastic': 'Check Box 139', 'visiblesupply_lead': 'Check Box 148',
          'watersource_municipal': 'Check Box 149', 'watersource_privatewell': 'Check Box 150'
        },
        extraTextFields: {
          'shutoffValve': 'Text Field 52'
        }
      },
      1: { // Item 2 - Water heating fuel (Gas, Oil, Propane, Electric)
        options: {
          'gas': 'Check Box 151', 'oil': 'Check Box 152',
          'propane': 'Check Box 153', 'electric': 'Check Box 154'
        }
      },
      2: { // Item 3 - Drain/waste/vent
        options: {
          'visiblewastep_copper': 'Check Box 155', 'visiblewastep_galvanized': 'Check Box 156',
          'visiblewastep_plastic': 'Check Box 158', 'visiblewastep_lead': 'Check Box 157',
          'visiblewastep_castiron': 'Check Box 159', 'visiblewastep_nv': 'Check Box 160',
          'galvanizedste_yes': { type: 'radio', field: 'Gavanized', value: 'Choice1' },
          'galvanizedste_no': { type: 'radio', field: 'Gavanized', value: 'Choice2' },
          'galvanizedste_na': { type: 'radio', field: 'Gavanized', value: 'Choice3' }
        },
        extraTextFields: {
          'galvWhere': 'Text Field 59'
        }
      },
      7: { // Item 8 - Traps (P-Type, S-traps, Drum Trap)
        options: {
          'ptype': 'Check Box 162', 'strapslessoptimal': 'Check Box 163',
          'drumtrap': 'Drum trap'
        }
      },
      3: { // Item 4 - Drainage sumps (Sump pump noted, Drain noted)
        options: {
          'sumppumpnote_yes': 'Check Box1660', 'sumppumpnote_no': 'Check Box1661', 'sumppumpnote_na': 'Check Box1662',
          'drainnoted_yes': 'Check Box1663', 'drainnoted_no': 'Check Box1664', 'drainnoted_na': 'Check Box1665'
        }
      },
      5: { // Item 6 - Hot water tank
        options: {
          'tankless': 'Tankless',
          'appearsintact': 'Check Box 161',
          'anycrossconn_yes': { type: 'radio', field: 'Radio Button 4', value: '0' },
          'anycrossconn_no': { type: 'radio', field: 'Radio Button 4', value: '1' },
          'anycrossconn_na': { type: 'radio', field: 'Radio Button 4', value: '2' },
          'ifthewaterhe_yes': 'Check Box1500', 'ifthewaterhe_no': 'Check Box1501', 'ifthewaterhe_na': 'Check Box1503'
        },
        extraTextFields: {
          'brand': 'Text Field 62',
          'age': 'Text Field 63',
          'gallons': 'Gallons',
          'tprValve': 'TPR'
        }
      },
      6: { // Item 7 - Dishwasher cross-connection (Yes, No, N/A)
        options: {
          'yes': 'Check Box1504', 'no': 'Check Box1505', 'na': 'Check Box1506'
        }
      }
    },

    // === ELECTRICAL ===
    electrical: {
      0: { // Item 1 - Service drop (underground & not visible)
        options: { 'undergroundnotvisible': 'Check Box 164' }
      },
      1: { // Item 2 - Service entrance location + Grounding location
        options: {
          'serviceentra_overhead': 'Check Box 180', 'serviceentra_underground': 'Check Box 181',
          'groundingloc_waterpipe': 'Check Box 182', 'groundingloc_rod': 'Check Box 183'
        }
      },
      2: { // Item 3 - 6 Yes/No/N/A checkbox groups
        options: {
          'copperwiring_yes': 'Check Box1507', 'copperwiring_no': 'Check Box1508', 'copperwiring_na': 'Check Box1509',
          'circuitbreak_yes': 'Check Box1510', 'circuitbreak_no': 'Check Box1511', 'circuitbreak_na': 'Check Box1512',
          'fuses_yes': 'Check Box1513', 'fuses_no': 'Check Box1514', 'fuses_na': 'Check Box1515',
          'anyknobtubew_yes': 'Check Box1516', 'anyknobtubew_no': 'Check Box1517', 'anyknobtubew_na': 'Check Box1518',
          'gfcisfunctio_yes': 'Check Box19', 'gfcisfunctio_no': 'Check Box1520', 'gfcisfunctio_na': 'Check Box1523',
          'gfciscircuit_yes': 'Check Box1521', 'gfciscircuit_no': 'Check Box1522', 'gfciscircuit_na': 'Check Box1524'
        }
      },
      3: { // Item 4 - Amperage/voltage, sub-panels
        options: {
          'subpanels_yes': 'Check Box1618', 'subpanels_no': 'Check Box1619', 'subpanels_na': 'Check Box1620'
        },
        extraTextFields: {
          'amperes': 'Combo Box 5',
          'ifYesWhere': 'Text Field 79',
          'locationMainPanel': 'Combo Box 6'
        }
      },
      4: { // Item 5 - Aluminum branch wiring, exposed wiring
        options: {
          'anyaluminumb_yes': 'Check Box1621', 'anyaluminumb_no': 'Check Box1622', 'anyaluminumb_na': 'Check Box1622',
          'anyexposedwi_yes': 'Check Box1623', 'anyexposedwi_no': 'Check Box1624', 'anyexposedwi_na': 'Check Box1625',
          'annualinspectionbyaqualifiedelectricianofaluminumbranchcircuitwiringareminimallysuggested': 'Check Box 189'
        },
        extraTextFields: {
          'aluminumWhere': 'Text Field 81',
          'exposedWhere': 'Text Field 82'
        }
      },
      5: { // Item 6 - Smoke & CO detectors
        options: {
          'smokedetecto_battery': 'Check Box 190', 'smokedetecto_hardwired': 'Check Box 191',
          'testedsmoke_yes': 'Check Box1626', 'testedsmoke_no': 'Check Box1627', 'testedsmoke_na': 'Check Box1628',
          'carbonmonoxi_battery': 'Check Box 192', 'carbonmonoxi_hardwired': 'Check Box 193',
          'testedco_yes': 'Check Box1629', 'testedco_no': 'Check Box1630', 'testedco_na': 'Check Box1631',
          'a5': 'Check Box 241', 'a6': 'Check Box 242'
        }
      }
    },

    // === HEATING ===
    heating: {
      0: { // Item 1 - Installed heating (FHA, GHA, HWBB, ELEC BSBD, RAD., STEAM, SPACE HTR)
        // The PDF has 8 checkboxes for item 1 but we have 7 options (RAD. appears twice on PDF)
        options: {
          'fha': 'Check Box 194', 'gha': 'Check Box 210', 'hwbb': 'Check Box 211',
          'elecbsbd': 'Check Box 212', 'rad': 'Check Box 213',
          'steam': 'Check Box 215', 'spacehtr': 'Check Box 216'
        }
      },
      1: { // Item 2 - Vent systems, flues & chimneys
        options: {
          'uphillslope_yes': 'Check Box1612', 'uphillslope_no': 'Check Box1613', 'uphillslope_na': 'Check Box1614',
          'rustonexhaus_yes': 'Check Box1615', 'rustonexhaus_no': 'Check Box1616', 'rustonexhaus_na': 'Check Box1617'
        }
      },
      2: { // Item 3 - Energy source (Gas, Oil, Propane, Electric, Wood)
        options: {
          'gas': 'Check Box 217', 'oil': 'Check Box 218', 'propane': 'Check Box 219',
          'electric': 'Check Box 220', 'wood': 'Check Box 221'
        }
      },
      3: { // Item 4 - Heating method distinguishing source
        options: {
          'colorofflame_blue': 'Check Box 222', 'colorofflame_orange': 'Check Box 223',
          'colorofflame_red': 'Check Box 224', 'colorofflame_yellow': 'Check Box 225',
          'flamecharact_steady': 'Check Box 226', 'flamecharact_someflickering': 'Check Box 227',
          'flamecharact_significantflickering': 'Check Box 228',
          'corrosionnot_none': 'Check Box 229', 'corrosionnot_some': 'Check Box 230',
          'corrosionnot_significant': 'Check Box 231',
          'anyexposedex_none': 'Check Box 232', 'anyexposedex_yes': 'Check Box 233',
          'anyexposedex_adequate': 'Check Box 234', 'anyexposedex_na': 'Check Box 235'
        },
        extraTextFields: {
          'exposedPipingDetail': 'Text Field 96'
        }
      },
      6: { // Item 7 - Oil storage tank (Inside, Outside, Above ground, Below ground)
        options: {
          'inside': 'Check Box 236', 'outside': 'Check Box 237',
          'aboveground': 'Check Box 238', 'belowground': 'Check Box 239',
          'nawillapplyifoilisnotthefuel': 'Check Box 240'
        },
        otherField: 'Text Field 100',
        extraTextFields: {
          'fillPipeLocation': 'Text Field 101'
        }
      },
      7: { // Item 8 - Pressure-relief valve
        options: {
          'pressurereli_yes': 'Check Box1600', 'pressurereli_no': 'Check Box1601', 'pressurereli_na': 'Check Box1602'
        }
      },
      8: { // Item 9 - Shut-off valves
        options: {
          'shutoffvalve_yes': 'Check Box1603', 'shutoffvalve_no': 'Check Box1604', 'shutoffvalve_na': 'Check Box1605'
        }
      },
      9: { // Item 10 - Scorching
        options: {
          'evidenceofsc_yes': 'Check Box1606', 'evidenceofsc_no': 'Check Box1607', 'evidenceofsc_na': 'Check Box1608'
        }
      },
      10: { // Item 11 - Clearance distance
        options: {
          'satisfactory_yes': 'Check Box1609', 'satisfactory_no': 'Check Box1610', 'satisfactory_na': 'Check Box1611'
        }
      }
    },

    // === AIR CONDITIONING ===
    airConditioning: {
      0: { // Item 1
        options: {
          'disclaimedduetofactorsnotedabove': 'Check Box 255',
          'centralair_na': 'Check Box1632', 'centralair_applicable': 'Check Box1633',
          'tested_yes': 'Check Box1634', 'tested_no': 'Check Box1635',
          'tested_na': 'Check Box1636', 'tested_disclaimed': 'Check Box1637'
        }
      },
      1: { // Item 2
        extraTextFields: {
          'condRefrig': 'Text Field 109',
          'condThermostat': 'Text Field 1010',
          'condDrain': 'Text Field 1011'
        }
      },
      3: { // Item 4
        options: {
          'heatpump_yes': 'Check Box1638', 'heatpump_no': 'Check Box1639',
          'heatpump_na': 'Check Box1640', 'heatpump_disclaimed': 'Check Box1641'
        }
      }
    },

    // === INTERIOR ===
    interior: {
      3: { // Item 4 - Garage doors 
        options: { 'dooropens_manually': 'Check Box 272', 'dooropens_motorized': 'Check Box 273' }
      },
      5: { // Item 6 - Materials used for floor/wall/ceiling
        options: {
          'floorsheathi_wood': 'Check Box 274', 'floorsheathi_vinyllaminate': 'Check Box 275',
          'floorsheathi_ceramic': 'Check Box 276', 'floorsheathi_carpet': 'Check Box 277',
          'wallsheathin_apparent': 'Check Box 278', 'wallsheathin_plaster': 'Check Box 279',
          'wallsheathin_drywall': 'Check Box 280', 'wallsheathin_paneling': 'Check Box 281',
          'ceilings_apparent': 'Check Box 282', 'ceilings_plaster': 'Check Box 283',
          'ceilings_drywall': 'Check Box 284', 'ceilings_wood': 'Check Box 285'
        },
        extraTextFields: {
          'floorOther': 'Text Field 122',
          'wallOther': 'Text Field 123',
          'ceilOther': 'Text Field 124'
        }
      },
      7: { // Item 8 - Living areas
        extraTextFields: {
          'numBedrooms': 'Utilities 2'
        }
      }
    },

    // === INSULATION & VENTILATION ===
    insulationVentilation: {
      1: { // Item 2 - Attic vents noted (Yes/No/N/A)
        // Check Box1642 is fixed pre-flatten (duplicate onValues renamed).
        // We use drawText to draw checkmarks AFTER flatten for Yes/No.
        options: {
          'atticventsno_na': 'Check Box1643'
        },
        drawText: {
          // Coordinates match actual widget positions from PDF scan
          'atticventsno_yes': { x: 89, y: 656, size: 10 },
          'atticventsno_no': { x: 125, y: 655, size: 9 }
        }
      },
      3: { // Item 4 - Vapor retarders (Paper, Plastic, Foil, N/A)
        options: {
          'paper': 'Check Box 1084', 'plastic': 'Check Box 1085',
          'foil': 'Check Box 1086', 'na': 'Check Box 1087'
        },
        otherField: 'Utilities 3'
      }
    },

    // === FIREPLACE ===
    fireplace: {
      0: { // Item 1 - System components (Gas, Wood-burning, Stove, None)
        options: {
          'gas': 'Check Box 1092', 'woodburning': 'Check Box 1093',
          'stove': 'Check Box 1094', 'none': 'Check Box 1095'
        },
        extraTextFields: {
          'numComponents': 'Utilities 4'
        }
      },
      1: { // Item 2 - Vent systems, flues & chimneys (Is fireplace a DIRECT-VENTED gas unit?)
        options: {
          'isfireplacea_yes': 'Check Box1650', 'isfireplacea_no': 'Check Box1651', 'isfireplacea_na': 'Check Box1652'
        }
      }
    }
  };
  // ------------------------------------------------------------------

  for (const sec of INSPECTION_SECTIONS) {
    const sectionData = inspection.sections[sec.id];
    if (!sectionData) continue;

    const mapping = sectionFieldMap[sec.id];
    if (!mapping) continue;

    // --- Set ratings for ALL items in this section ---
    const ratingGroups = ratingGroupMap[sec.id] || [];
    for (let idx = 0; idx < sectionData.items.length; idx++) {
      const item = sectionData.items[idx];
      const groupName = ratingGroups[idx];
      if (groupName && item.rating) {
        setRatingGroup(form, groupName, item.rating);
      }
    }

    // --- Set checkbox options for ALL items in this section ---
    const sectionCBMap = checkboxFieldMap[sec.id] || {};
    for (let idx = 0; idx < sectionData.items.length; idx++) {
      const item = sectionData.items[idx];
      const itemCBMap = sectionCBMap[idx];
      if (!itemCBMap) continue;

      // Set selected option checkboxes (and radio buttons)
      if (item.selectedOptions && itemCBMap.options) {
        Object.keys(item.selectedOptions).forEach(opt => {
          if (item.selectedOptions[opt] && itemCBMap.options[opt]) {
            const mapping = itemCBMap.options[opt];
            if (typeof mapping === 'object' && mapping.type === 'radio') {
              // Handle radio group (e.g., Galvanized steel Yes/No/N/A)
              try {
                const radioGroup = form.getRadioGroup(mapping.field);
                radioGroup.select(mapping.value);
              } catch (e) { console.warn('Radio group not found:', mapping.field, e); }
            } else {
              trySetCheckbox(form, mapping, true);
            }
          }
        });
      }

      // Set "Other" text fields (may be a dropdown like Utilities 3)
      if (item.otherText && itemCBMap.otherField) {
        try {
          const dropdown = form.getDropdown(itemCBMap.otherField);
          // It's a dropdown — inject and select the custom text
          dropdown.addOptions([item.otherText]);
          dropdown.select(item.otherText);
        } catch (e) {
          // Not a dropdown, set as regular text field
          setTextField(form, itemCBMap.otherField, item.otherText, 9, { autoFit: true });
        }
      }

      // Handle drawText overrides (for duplicate/broken PDF checkboxes)
      // Instead of drawing now, collect deferred draw commands to execute
      // AFTER form.flatten() so the checkmark appears on top of static content
      if (itemCBMap.drawText && item.selectedOptions) {
        Object.keys(itemCBMap.drawText).forEach(opt => {
          if (item.selectedOptions[opt]) {
            const coords = itemCBMap.drawText[opt];
            deferredDraws.push({
              pageIndex: sec.pageNum - 1,
              x: coords.x,
              y: coords.y,
              size: coords.size || 10,
            });
          }
        });
      }

      // Set percent fields (e.g., Structural Item 4 foundation %)
      if (item.percentValues && itemCBMap.percentFields) {
        Object.keys(item.percentValues).forEach(key => {
          if (item.percentValues[key] && itemCBMap.percentFields[key]) {
            setTextField(form, itemCBMap.percentFields[key], item.percentValues[key], 9, { autoFit: true });
          }
        });
      }

      // Set extra text fields (e.g., shut-off valve location, brand, age)
      if (item.extraFieldValues && itemCBMap.extraTextFields) {
        Object.keys(itemCBMap.extraTextFields).forEach(key => {
          if (item.extraFieldValues[key]) {
            const fieldName = itemCBMap.extraTextFields[key];
            // Try dropdown first, then text field
            try {
              const dropdown = form.getDropdown(fieldName);
              const options = dropdown.getOptions();
              const val = item.extraFieldValues[key];
              if (options.includes(val)) {
                dropdown.select(val);
              } else {
                // If value doesn't match predefined options, dynamically inject and force-select it
                dropdown.addOptions([val]);
                dropdown.select(val);
              }
            } catch (e) {
              // Not a dropdown, set as text field
              setTextField(form, fieldName, item.extraFieldValues[key], 9, { autoFit: true });
            }
          }
        });
      }

      // Write option group selections into text fields (for groups without PDF checkboxes)
      if (item.selectedOptions && itemCBMap.optionGroupTextFields) {
        Object.keys(itemCBMap.optionGroupTextFields).forEach(groupPrefix => {
          const fieldName = itemCBMap.optionGroupTextFields[groupPrefix];
          // Collect all selected options for this group prefix
          const selected = Object.keys(item.selectedOptions)
            .filter(k => k.startsWith(groupPrefix + '_') && item.selectedOptions[k])
            .map(k => k.substring(groupPrefix.length + 1));
          if (selected.length > 0) {
            setTextField(form, fieldName, selected.join(', '), 9, { autoFit: true });
          }
        });
      }
    }

    // Write comments into available fields
    const itemsWithComments = sectionData.items
      .map((it, idx) => ({ ...it, originalIndex: idx }))
      .filter(it => it.comments || (it.photos && it.photos.length > 0) || (it.extraFieldValues && Object.values(it.extraFieldValues).some(v => v)));

    for (let i = 0; i < itemsWithComments.length; i++) {
      const item = itemsWithComments[i];
      // FIX: Use the item's original absolute index on the page to find its designated comment box
      const fieldName = (mapping.commentFields || [])[item.originalIndex];
      if (!fieldName) continue;

      // Build comment text with extra field values prepended
      let textParts = [];

      // Add extra field values as labeled lines (e.g., "Location of main shut-off valve: ...")
      if (item.extraFieldValues) {
        if (item.extraFieldValues.shutoffValve) {
          textParts.push(`Location of main shut-off valve: ${item.extraFieldValues.shutoffValve}`);
        }
        if (item.extraFieldValues.waterFrom || item.extraFieldValues.waterTo) {
          textParts.push(`Ran water from: ${item.extraFieldValues.waterFrom || ''} to ${item.extraFieldValues.waterTo || ''}`);
        }
      }

      if (item.comments) textParts.push(item.comments);

      let text = textParts.join('\n');

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

    // Clear any unused comment fields for this section by checking the original indices
    for (let i = 0; i < (mapping.commentFields || []).length; i++) {
        const fieldName = mapping.commentFields[i];
        if (!fieldName) continue;
        
        // If this item index was NOT in our itemsWithComments array, it has no comment, so wipe it
        const hasComment = itemsWithComments.some(it => it.originalIndex === i);
        if (!hasComment) {
            setTextField(form, fieldName, '', FONT_SIZE_COMMENT);
        }
    }
  }

  return deferredDraws;
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

  const addendumI = ['A1','A2','A3','A4','A5','A6','A7','A7a','A8','A8a','A9','A10','A11','A12','A12a','A13','A14','A15','A16','A17','A18','A19','A20','A21','A22','A23','A24'];
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
  const contentW = pageW - margin * 2;  // 532
  const bottomMargin = 40;
  const lineHeight = 9;
  const fontSize = 6.5;

  // Photo sizing — smaller to allow text beside it
  const photoMaxW = 200;
  const photoMaxH = 150;
  const photoGap = 12;  // gap between photo and right-side text

  // Text column widths
  const rightTextX = margin + photoMaxW + photoGap;         // where right-column text starts
  const rightTextW = contentW - photoMaxW - photoGap;       // ~320px
  const rightCharsPerLine = Math.floor(rightTextW / 3.7);   // ~86 at 6.5pt
  const fullCharsPerLine = Math.floor(contentW / 3.7);      // ~143 at 6.5pt

  // Colors
  const headerBlue = rgb(65 / 255, 101 / 255, 245 / 255);
  const darkText = rgb(0.15, 0.15, 0.15);
  const mutedText = rgb(0.4, 0.4, 0.4);
  const lightBg = rgb(0.96, 0.96, 0.97);

  let pageNum = 1;
  let page = null;
  let cursorY = 0;

  function startNewPage() {
    page = pdfDoc.addPage([pageW, pageH]);

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
    cursorY = pageH - 80;
  }

  for (let i = 0; i < photoRefs.length; i++) {
    const ref = photoRefs[i];

    // --- Separate user comment from A-code expansions ---
    const userComment = ref.comments || '';
    const aCodeLines = [];

    // Detect A-code references and build expanded lines
    const aCodeMatches = userComment.match(/A\d+[a-z]?/gi);
    if (aCodeMatches) {
      const uniqueCodes = [...new Set(aCodeMatches.map(c => c.toUpperCase()))];
      for (const code of uniqueCodes) {
        const aCodeDef = A_CODES.find(ac => ac.code.toUpperCase() === code);
        if (aCodeDef) {
          // Wrap A-code text at full width
          const wrapped = wordWrap(`${aCodeDef.code} - ${aCodeDef.text}`, fullCharsPerLine);
          aCodeLines.push(...wrapped);
        }
      }
    }

    // Wrap user comment for the right-column (beside photo)
    const rightCommentLines = userComment ? wordWrap(userComment, rightCharsPerLine) : [];

    // --- Load and size the photo ---
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

    // --- Calculate entry height ---
    const headerH = 22;  // P1 badge + section title line
    const descH = 12;    // item description line
    const photoSectionH = image ? imgH : 25;
    const rightTextH = rightCommentLines.length * lineHeight;
    const floatZoneH = Math.max(photoSectionH, rightTextH);  // taller of photo vs right text
    const aCodeBlockH = aCodeLines.length > 0 ? (aCodeLines.length * lineHeight + 6) : 0;  // +6 for gap
    const entryPadding = 15;
    const entryHeight = headerH + descH + floatZoneH + aCodeBlockH + entryPadding;

    // Start new page if entry won't fit
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

    // --- P-label badge ---
    page.drawRectangle({
      x: entryX + 5, y: entryTop - 16,
      width: 28, height: 14,
      color: headerBlue
    });
    page.drawText(ref.refLabel, {
      x: entryX + 8, y: entryTop - 13,
      size: 8, font: fontBold, color: rgb(1, 1, 1)
    });

    // --- Section & item label ---
    page.drawText(`${ref.sectionTitle} — Item #${ref.itemNum}`, {
      x: entryX + 38, y: entryTop - 13,
      size: 8, font: fontBold, color: darkText
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
        x: entryX + contentW - 28, y: entryTop - 16,
        width: 20, height: 14,
        color: rColor
      });
      page.drawText(ref.rating, {
        x: entryX + contentW - 25, y: entryTop - 13,
        size: 7, font: fontBold, color: rgb(1, 1, 1)
      });
    }

    // --- Item description ---
    const desc = ref.itemDesc.length > 100 ? ref.itemDesc.substring(0, 97) + '...' : ref.itemDesc;
    page.drawText(desc, {
      x: entryX + 5, y: entryTop - headerH - 8,
      size: 6.5, font: font, color: mutedText
    });

    // --- Float zone: photo left + comment right ---
    const floatTop = entryTop - headerH - descH;

    // Draw photo (left-aligned)
    if (image) {
      const imgY = floatTop - imgH;
      page.drawImage(image, {
        x: entryX + 5, y: imgY,
        width: imgW, height: imgH
      });
    } else {
      page.drawText('[Photo unavailable]', {
        x: entryX + 10, y: floatTop - 15,
        size: 7, font: font, color: mutedText
      });
    }

    // Draw user comment to the right of the photo
    for (let l = 0; l < rightCommentLines.length; l++) {
      page.drawText(rightCommentLines[l], {
        x: rightTextX, y: floatTop - 10 - l * lineHeight,
        size: fontSize, font: font, color: darkText
      });
    }

    // --- A-code text: full-width below the float zone ---
    if (aCodeLines.length > 0) {
      const aCodeTop = floatTop - floatZoneH - 6;
      for (let l = 0; l < aCodeLines.length; l++) {
        page.drawText(aCodeLines[l], {
          x: entryX + 5, y: aCodeTop - l * lineHeight,
          size: fontSize, font: font, color: darkText
        });
      }
    }

    // Move cursor past this entry + gap between entries
    cursorY = entryTop - entryHeight - 8;
  }
}
