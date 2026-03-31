// ============================================================
// Shield Inspection Services — Database Layer
// Offline-first: IndexedDB cache + Supabase cloud sync
// ============================================================

import { openDB } from 'idb';
import { getSupabaseClient, isAuthConfigured, getUser } from './auth.js';

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
// INSPECTIONS — Local + Cloud
// ============================================================

export async function saveInspection(inspection) {
  const db = await getDB();
  inspection.updatedAt = new Date().toISOString();
  await db.put('inspections', inspection);

  // Sync to cloud in background
  syncInspectionToCloud(inspection).catch(e =>
    console.warn('Cloud sync failed (will retry):', e.message)
  );

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

  // Delete from cloud
  deleteInspectionFromCloud(id).catch(e =>
    console.warn('Cloud delete failed:', e.message)
  );
}

// ============================================================
// PHOTOS — Local + Cloud
// ============================================================

export async function savePhoto(photoData) {
  const db = await getDB();
  await db.put('photos', photoData);

  // Sync photo to cloud in background
  syncPhotoToCloud(photoData).catch(e =>
    console.warn('Photo cloud sync failed:', e.message)
  );

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

  // Delete from cloud
  deletePhotoFromCloud(id).catch(e =>
    console.warn('Cloud photo delete failed:', e.message)
  );
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
// CLOUD SYNC — Supabase
// ============================================================

async function syncInspectionToCloud(inspection) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('inspections')
    .upsert({
      id: inspection.id,
      user_id: user.id,
      data: inspection,
      status: inspection.status,
      updated_at: inspection.updatedAt
    }, { onConflict: 'id' });

  if (error) throw error;
}

async function deleteInspectionFromCloud(id) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const supabase = getSupabaseClient();
  await supabase.from('inspections').delete().eq('id', id);
}

async function syncPhotoToCloud(photoData) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  // Convert blob to base64 for storage
  let base64 = '';
  if (photoData.blob instanceof Blob) {
    base64 = await blobToBase64(photoData.blob);
  } else if (typeof photoData.blob === 'string') {
    base64 = photoData.blob;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('inspection_photos')
    .upsert({
      id: photoData.id,
      inspection_id: photoData.inspectionId,
      user_id: user.id,
      blob_base64: base64
    }, { onConflict: 'id' });

  if (error) throw error;
}

async function deletePhotoFromCloud(id) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const supabase = getSupabaseClient();
  await supabase.from('inspection_photos').delete().eq('id', id);
}

/**
 * Pull all inspections from Supabase and merge into local IndexedDB
 * Called after login to sync data across devices
 */
export async function pullFromCloud() {
  if (!isAuthConfigured()) return { pulled: 0 };
  const user = await getUser();
  if (!user) return { pulled: 0 };

  const supabase = getSupabaseClient();
  const db = await getDB();

  // Pull inspections
  const { data: cloudInspections, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  if (!cloudInspections || cloudInspections.length === 0) return { pulled: 0 };

  let pulled = 0;
  for (const row of cloudInspections) {
    const local = await db.get('inspections', row.id);
    // Cloud wins if no local copy or cloud is newer
    if (!local || new Date(row.updated_at) > new Date(local.updatedAt)) {
      const inspection = row.data;
      inspection.id = row.id;
      inspection.updatedAt = row.updated_at;
      inspection.status = row.status;
      await db.put('inspections', inspection);
      pulled++;
    }
  }

  // Pull photos for all inspections
  const { data: cloudPhotos, error: photoError } = await supabase
    .from('inspection_photos')
    .select('*')
    .eq('user_id', user.id);

  if (!photoError && cloudPhotos) {
    for (const row of cloudPhotos) {
      const local = await db.get('photos', row.id);
      if (!local) {
        // Convert base64 back to blob
        const blob = base64ToBlob(row.blob_base64);
        await db.put('photos', {
          id: row.id,
          inspectionId: row.inspection_id,
          blob: blob
        });
      }
    }
  }

  return { pulled };
}

/**
 * Push all local inspections to the cloud
 * Called to ensure local-only data gets synced
 */
export async function pushToCloud() {
  if (!isAuthConfigured()) return { pushed: 0 };
  const user = await getUser();
  if (!user) return { pushed: 0 };

  const db = await getDB();
  const inspections = await db.getAll('inspections');
  let pushed = 0;

  for (const inspection of inspections) {
    try {
      await syncInspectionToCloud(inspection);
      pushed++;
    } catch (e) {
      console.warn('Failed to push inspection:', inspection.id, e.message);
    }
  }

  // Push photos
  const photos = await db.getAll('photos');
  for (const photo of photos) {
    try {
      await syncPhotoToCloud(photo);
    } catch (e) {
      console.warn('Failed to push photo:', photo.id, e.message);
    }
  }

  return { pushed };
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

/**
 * Convert a Blob to base64 string for cloud storage
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:image/jpeg;base64,/9j/4AAQ..."
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a base64 data URL back to a Blob
 */
function base64ToBlob(base64) {
  try {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  } catch {
    return new Blob([], { type: 'image/jpeg' });
  }
}
