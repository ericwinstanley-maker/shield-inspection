// ============================================================
// Shield Inspection Services — IndexedDB Database Layer
// Offline-first storage for inspections, photos, and settings
// ============================================================

import { openDB } from 'idb';

const DB_NAME = 'shield-inspection';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Inspections store
        if (!db.objectStoreNames.contains('inspections')) {
          const store = db.createObjectStore('inspections', { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('updatedAt', 'updatedAt');
        }

        // Photos store (blobs stored separately for performance)
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('inspectionId', 'inspectionId');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      }
    });
  }
  return dbPromise;
}

// ============================================================
// INSPECTIONS
// ============================================================

export async function saveInspection(inspection) {
  const db = await getDB();
  inspection.updatedAt = new Date().toISOString();
  await db.put('inspections', inspection);
  return inspection;
}

export async function getInspection(id) {
  const db = await getDB();
  return db.get('inspections', id);
}

export async function getAllInspections() {
  const db = await getDB();
  const all = await db.getAll('inspections');
  // Sort by most recently updated
  return all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function deleteInspection(id) {
  const db = await getDB();
  // Delete associated photos too
  const photos = await getPhotosByInspection(id);
  const tx = db.transaction(['inspections', 'photos'], 'readwrite');
  await tx.objectStore('inspections').delete(id);
  for (const photo of photos) {
    await tx.objectStore('photos').delete(photo.id);
  }
  await tx.done;
}

// ============================================================
// PHOTOS
// ============================================================

export async function savePhoto(photoData) {
  const db = await getDB();
  await db.put('photos', photoData);
  return photoData;
}

export async function getPhoto(id) {
  const db = await getDB();
  return db.get('photos', id);
}

export async function getPhotosByInspection(inspectionId) {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'inspectionId', inspectionId);
}

export async function deletePhoto(id) {
  const db = await getDB();
  await db.delete('photos', id);
}

// ============================================================
// SETTINGS
// ============================================================

export async function getSetting(key) {
  const db = await getDB();
  const record = await db.get('settings', key);
  return record ? record.value : null;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

// ============================================================
// PHOTO UTILITIES
// ============================================================

/**
 * Compress an image file to a manageable size for storage
 * Returns a Blob of the compressed image
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create a thumbnail from an image blob
 */
export async function createThumbnail(blob, size = 150) {
  return compressImage(
    new File([blob], 'thumb.jpg', { type: 'image/jpeg' }),
    size,
    0.6
  );
}

/**
 * Convert a blob to a data URL for display
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
