// ============================================================
// Shield Inspection Services — EmailJS Integration
// Sends completed inspection PDF via EmailJS
// ============================================================

import emailjs from '@emailjs/browser';
import { getSetting } from './db.js';

let initialized = false;

async function initEmailJS() {
  if (initialized) return;
  const publicKey = await getSetting('emailjs_publickey');
  if (!publicKey) throw new Error('EmailJS public key not configured. Go to Settings to add it.');
  emailjs.init(publicKey);
  initialized = true;
}

/**
 * Send the completed inspection PDF via EmailJS
 * @param {Object} inspection - The inspection data
 * @param {Uint8Array} pdfBytes - The generated PDF bytes
 * @param {string} toEmail - Recipient email address
 */
export async function sendInspectionEmail(inspection, pdfBytes, toEmail) {
  await initEmailJS();

  const serviceId = await getSetting('emailjs_service');
  const templateId = await getSetting('emailjs_template');

  if (!serviceId || !templateId) {
    throw new Error('EmailJS service or template ID not configured. Go to Settings to add them.');
  }

  // Convert PDF to base64 for attachment
  const base64PDF = arrayBufferToBase64(pdfBytes);

  const templateParams = {
    to_email: toEmail,
    from_name: 'Shield Inspection Services',
    subject: `Home Inspection Report - ${inspection.cover.street || 'Inspection'}, ${inspection.cover.city || ''} ${inspection.cover.state || ''}`,
    message: `Home Inspection Report\n\nProperty: ${inspection.cover.street}, ${inspection.cover.city}, ${inspection.cover.state} ${inspection.cover.zip}\nClient: ${inspection.cover.clientName}\nDate: ${inspection.cover.inspectionDate}\n\nPlease find the completed inspection report attached.\n\nShield Inspection Services, Inc.\nP.O. Box 205, Lewiston NY 14092\n(716) 807-7813\nLicense# 16000058435`,
    pdf_attachment: base64PDF,
    client_name: inspection.cover.clientName,
    property_address: `${inspection.cover.street}, ${inspection.cover.city}, ${inspection.cover.state} ${inspection.cover.zip}`,
    inspection_date: inspection.cover.inspectionDate
  };

  try {
    const response = await emailjs.send(serviceId, templateId, templateParams);
    console.log('Email sent successfully:', response.status, response.text);
    return response;
  } catch (error) {
    console.error('EmailJS error:', error);
    throw new Error(`Failed to send email: ${error.text || error.message || 'Unknown error'}`);
  }
}

/**
 * Convert ArrayBuffer/Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
