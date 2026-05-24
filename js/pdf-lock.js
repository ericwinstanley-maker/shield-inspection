// ============================================================
// PDF Lock — Owner-password protection for inspection reports
// Uses @pdfsmaller/pdf-encrypt (AES-256, PDF 2.0 standard)
//
// Customers can OPEN and VIEW the PDF without a password,
// but CANNOT modify, annotate, or fill forms.
// ============================================================

import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

/**
 * Add owner-password protection to a PDF.
 * Customers can open and view/print freely but cannot edit.
 *
 * @param {Uint8Array} pdfBytes - The unencrypted PDF bytes
 * @param {string} ownerPassword - Secret password (not shared with customers)
 * @returns {Promise<Uint8Array>} - The encrypted PDF bytes
 */
export async function lockPDF(pdfBytes, ownerPassword) {
  return encryptPDF(pdfBytes, {
    ownerPassword,
    userPassword: '',      // No password needed to open
    permissions: {
      print: true,                   // Allow printing
      copy: true,                    // Allow text/image copy
      modify: false,                 // ❌ Block content modification
      annotate: false,               // ❌ Block adding annotations
      fillForms: false,              // ❌ Block form filling
      assembleDocument: false,       // ❌ Block page insertion/deletion
      printHighQuality: true,        // Allow high-res printing
      extractForAccessibility: true, // Allow screen readers
    },
  });
}
