// ============================================================
// PDF Lock — Owner-password protection for inspection reports
// Uses 128-bit RC4 encryption (PDF 1.4+, V=2, R=3)
//
// Customers can OPEN and VIEW the PDF without a password,
// but CANNOT modify, annotate, or fill forms.
// ============================================================

import { PDFDocument, PDFName, PDFHexString, PDFDict, PDFArray, PDFString, PDFNumber, PDFRawStream } from 'pdf-lib';

// ============================================================
// CONSTANTS
// ============================================================

// Standard 32-byte password padding (PDF spec, Table 3.19)
const PASSWORD_PADDING = new Uint8Array([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
  0x64, 0x00, 0x4B, 0x49, 0x17, 0x32, 0x13, 0xB1,
  0xDB, 0x4E, 0xC8, 0x54, 0xB3, 0x10, 0x4A, 0x57,
  0x04, 0x0B, 0x5B, 0xDB, 0xD6, 0x1B, 0x47, 0x32
]);

// Permission flags for "view + print only, no editing"
// PDF spec section 3.5.2, Table 3.20
// Bits: 3=print, 5=copy, 7-8=reserved(1), 10=accessibility, 12=hires_print
// Bits 13-32 must all be 1
// Result: allow print + copy, disallow modify/annotate/form-fill/assemble
const PERMISSIONS = (
  0xFFFFF000 |  // Bits 13-32: reserved, must be 1
  (1 << 2) |    // Bit 3: allow printing
  (1 << 4) |    // Bit 5: allow copying/extracting text
  (1 << 6) |    // Bit 7: reserved for R=3, must be 1
  (1 << 7) |    // Bit 8: reserved for R=3, must be 1
  (1 << 9) |    // Bit 10: allow accessibility extract
  (1 << 11)     // Bit 12: allow high-quality printing
) | 0;          // Force signed 32-bit int

// ============================================================
// MD5 HASH (RFC 1321)
// ============================================================

const MD5_S = [
  7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
  5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
  4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
  6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21
];

const MD5_K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
}

function md5(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;

  // Pad: append 0x80, then zeros, then 64-bit length (little-endian)
  const padLen = (bytes.length % 64 < 56) ? (56 - bytes.length % 64) : (120 - bytes.length % 64);
  const padded = new Uint8Array(bytes.length + padLen + 8);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  // Write 64-bit length in bits (little-endian, low 32 bits only — sufficient for our use)
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, 0, true);

  let a0 = 0x67452301, b0 = 0xEFCDAB89, c0 = 0x98BADCFE, d0 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }

    let A = a0, B = b0, C = c0, D = d0;

    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16)      { F = (B & C) | (~B & D);       g = i; }
      else if (i < 32) { F = (D & B) | (~D & C);       g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D;                 g = (3 * i + 5) % 16; }
      else              { F = C ^ (B | ~D);              g = (7 * i) % 16; }

      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << MD5_S[i]) | (F >>> (32 - MD5_S[i])))) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const result = new Uint8Array(16);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, a0, true);
  rv.setUint32(4, b0, true);
  rv.setUint32(8, c0, true);
  rv.setUint32(12, d0, true);
  return result;
}

// ============================================================
// RC4 STREAM CIPHER
// ============================================================

function rc4(key, data) {
  // Key-scheduling algorithm (KSA)
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xFF;
    [S[i], S[j]] = [S[j], S[i]];
  }

  // Pseudo-random generation algorithm (PRGA)
  const output = new Uint8Array(data.length);
  let ii = 0, jj = 0;
  for (let k = 0; k < data.length; k++) {
    ii = (ii + 1) & 0xFF;
    jj = (jj + S[ii]) & 0xFF;
    [S[ii], S[jj]] = [S[jj], S[ii]];
    output[k] = data[k] ^ S[(S[ii] + S[jj]) & 0xFF];
  }
  return output;
}

// ============================================================
// PDF ENCRYPTION KEY DERIVATION (PDF spec, Section 3.5)
// ============================================================

/** Pad or truncate a password to exactly 32 bytes */
function padPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const padded = new Uint8Array(32);
  const len = Math.min(encoded.length, 32);
  padded.set(encoded.subarray(0, len));
  if (len < 32) {
    padded.set(PASSWORD_PADDING.subarray(0, 32 - len), len);
  }
  return padded;
}

/** Algorithm 3: Computing the O (owner) value */
function computeOwnerValue(ownerPassword, userPassword) {
  const ownerPadded = padPassword(ownerPassword);

  // Step a-d: Hash the owner password
  let hash = md5(ownerPadded);
  // R=3: rehash 50 times
  for (let i = 0; i < 50; i++) hash = md5(hash);

  // Step e: Use first 16 bytes as RC4 key
  const rc4Key = hash.subarray(0, 16);

  // Step f: Pad user password
  const userPadded = padPassword(userPassword);

  // Step g: RC4 encrypt
  let result = rc4(rc4Key, userPadded);

  // Step h: For R=3, iterate 19 more times with XOR'd key
  for (let i = 1; i <= 19; i++) {
    const xorKey = new Uint8Array(rc4Key.length);
    for (let j = 0; j < rc4Key.length; j++) xorKey[j] = rc4Key[j] ^ i;
    result = rc4(xorKey, result);
  }

  return result; // 32 bytes
}

/** Algorithm 2: Computing the file encryption key */
function computeEncryptionKey(userPassword, O, P, fileId) {
  const userPadded = padPassword(userPassword);

  // Concatenate: paddedPassword + O + P (LE 4 bytes) + fileId
  const pBytes = new Uint8Array(4);
  new DataView(pBytes.buffer).setInt32(0, P, true); // Little-endian

  const input = new Uint8Array(userPadded.length + O.length + 4 + fileId.length);
  let offset = 0;
  input.set(userPadded, offset); offset += userPadded.length;
  input.set(O, offset);          offset += O.length;
  input.set(pBytes, offset);     offset += 4;
  input.set(fileId, offset);

  let hash = md5(input);
  // R=3: rehash 50 times, taking first 16 bytes each time
  for (let i = 0; i < 50; i++) hash = md5(hash.subarray(0, 16));

  return hash.subarray(0, 16); // 16 bytes = 128-bit key
}

/** Algorithm 5: Computing the U (user) value for R=3 */
function computeUserValue(encryptionKey, fileId) {
  // Step a: MD5 of padding + fileId
  const input = new Uint8Array(PASSWORD_PADDING.length + fileId.length);
  input.set(PASSWORD_PADDING);
  input.set(fileId, PASSWORD_PADDING.length);
  let hash = md5(input);

  // Step b: RC4 encrypt with encryption key
  let result = rc4(encryptionKey, hash);

  // Step c: Iterate 19 times with XOR'd key
  for (let i = 1; i <= 19; i++) {
    const xorKey = new Uint8Array(encryptionKey.length);
    for (let j = 0; j < encryptionKey.length; j++) xorKey[j] = encryptionKey[j] ^ i;
    result = rc4(xorKey, result);
  }

  // Step d: Pad to 32 bytes with arbitrary data
  const U = new Uint8Array(32);
  U.set(result.subarray(0, 16));
  // Fill remaining 16 bytes (arbitrary padding)
  for (let i = 16; i < 32; i++) U[i] = 0;

  return U;
}

/** Compute per-object encryption key (Algorithm 1, step for R≥3) */
function computeObjectKey(fileKey, objNum, genNum) {
  // key = MD5(fileKey + objNum(3 bytes LE) + genNum(2 bytes LE))
  const input = new Uint8Array(fileKey.length + 5);
  input.set(fileKey);
  input[fileKey.length]     = objNum & 0xFF;
  input[fileKey.length + 1] = (objNum >> 8) & 0xFF;
  input[fileKey.length + 2] = (objNum >> 16) & 0xFF;
  input[fileKey.length + 3] = genNum & 0xFF;
  input[fileKey.length + 4] = (genNum >> 8) & 0xFF;

  const hash = md5(input);
  // Truncate to min(fileKey.length + 5, 16) bytes
  const keyLen = Math.min(fileKey.length + 5, 16);
  return hash.subarray(0, keyLen);
}

// ============================================================
// OBJECT TREE ENCRYPTION
// ============================================================

/** Convert a PDFString's value to raw bytes */
function pdfStringToBytes(str) {
  const val = str.value || '';
  const bytes = new Uint8Array(val.length);
  for (let i = 0; i < val.length; i++) {
    bytes[i] = val.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

/** Convert a PDFHexString to raw bytes */
function pdfHexToBytes(hexStr) {
  const hex = hexStr.value || '';
  const len = Math.floor(hex.length / 2);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** Convert bytes to hex string */
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Recursively encrypt all strings in a PDF value */
function encryptValue(value, objKey) {
  if (value instanceof PDFString) {
    const raw = pdfStringToBytes(value);
    if (raw.length === 0) return value;
    const encrypted = rc4(objKey, raw);
    return PDFHexString.of(bytesToHex(encrypted));
  }

  if (value instanceof PDFHexString) {
    const raw = pdfHexToBytes(value);
    if (raw.length === 0) return value;
    const encrypted = rc4(objKey, raw);
    return PDFHexString.of(bytesToHex(encrypted));
  }

  if (value instanceof PDFDict) {
    encryptDict(value, objKey);
    return value;
  }

  if (value instanceof PDFArray) {
    encryptArray(value, objKey);
    return value;
  }

  // PDFName, PDFNumber, PDFBool, PDFNull, PDFRef — not encrypted
  return value;
}

/** Encrypt all string values in a PDFDict */
function encryptDict(dict, objKey) {
  const entries = dict.entries();
  for (const [key, value] of entries) {
    const encrypted = encryptValue(value, objKey);
    if (encrypted !== value) {
      dict.set(key, encrypted);
    }
  }
}

/** Encrypt all string values in a PDFArray */
function encryptArray(arr, objKey) {
  const size = arr.size();
  for (let i = 0; i < size; i++) {
    const value = arr.get(i);
    const encrypted = encryptValue(value, objKey);
    if (encrypted !== value) {
      arr.set(i, encrypted);
    }
  }
}

// ============================================================
// MAIN: lockPDF
// ============================================================

/**
 * Add owner-password protection to a PDF.
 * Customers can open and view/print freely but cannot edit.
 *
 * @param {Uint8Array} pdfBytes - The unencrypted PDF bytes
 * @param {string} ownerPassword - Secret password (not shared with customers)
 * @returns {Promise<Uint8Array>} - The encrypted PDF bytes
 */
export async function lockPDF(pdfBytes, ownerPassword) {
  // Load the PDF so all objects are parsed as PDFRawStream (not ContentStream)
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    updateMetadata: false
  });
  const context = pdfDoc.context;

  // Get or generate file ID
  let fileId;
  const existingId = context.trailerInfo.ID;
  if (existingId instanceof PDFArray && existingId.size() > 0) {
    const firstId = existingId.get(0);
    if (firstId instanceof PDFHexString) {
      fileId = pdfHexToBytes(firstId);
    } else if (firstId instanceof PDFString) {
      fileId = pdfStringToBytes(firstId);
    }
  }
  if (!fileId || fileId.length === 0) {
    fileId = new Uint8Array(16);
    crypto.getRandomValues(fileId);
    const idHex = PDFHexString.of(bytesToHex(fileId));
    context.trailerInfo.ID = context.obj([idHex, idHex]);
  }

  // Compute encryption keys
  const userPassword = ''; // No password needed to open
  const O = computeOwnerValue(ownerPassword, userPassword);
  const encryptionKey = computeEncryptionKey(userPassword, O, PERMISSIONS, fileId);
  const U = computeUserValue(encryptionKey, fileId);

  // Create the /Encrypt dictionary
  const encDictObj = PDFDict.withContext(context);
  encDictObj.set(PDFName.of('Filter'), PDFName.of('Standard'));
  encDictObj.set(PDFName.of('V'), PDFNumber.of(2));
  encDictObj.set(PDFName.of('R'), PDFNumber.of(3));
  encDictObj.set(PDFName.of('Length'), PDFNumber.of(128));
  encDictObj.set(PDFName.of('P'), PDFNumber.of(PERMISSIONS));
  encDictObj.set(PDFName.of('O'), PDFHexString.of(bytesToHex(O)));
  encDictObj.set(PDFName.of('U'), PDFHexString.of(bytesToHex(U)));

  const encryptRef = context.register(encDictObj);
  context.trailerInfo.Encrypt = encryptRef;

  // Encrypt all indirect objects
  const objects = context.enumerateIndirectObjects();
  for (const [ref, obj] of objects) {
    // Skip the /Encrypt dictionary itself (its strings must NOT be encrypted)
    if (ref === encryptRef) continue;

    const objKey = computeObjectKey(
      encryptionKey,
      ref.objectNumber,
      ref.generationNumber
    );

    // Encrypt stream contents
    if (obj instanceof PDFRawStream) {
      // Encrypt the stream dictionary's strings
      encryptDict(obj.dict, objKey);
      // Encrypt the stream content bytes
      obj.contents = rc4(objKey, obj.contents);
    } else if (obj instanceof PDFDict) {
      encryptDict(obj, objKey);
    } else if (obj instanceof PDFArray) {
      encryptArray(obj, objKey);
    } else if (obj instanceof PDFString) {
      const encrypted = encryptValue(obj, objKey);
      if (encrypted !== obj) {
        context.assign(ref, encrypted);
      }
    } else if (obj instanceof PDFHexString) {
      const encrypted = encryptValue(obj, objKey);
      if (encrypted !== obj) {
        context.assign(ref, encrypted);
      }
    }
  }

  // Save with encryption metadata
  return pdfDoc.save();
}
