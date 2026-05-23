// ============================================================
// Shield Inspection Services — Database Layer
// Offline-first: IndexedDB cache + Supabase cloud sync
// v2: Photos in Supabase Storage, smart sync, reliable deletes
// ============================================================

import { openDB } from 'idb';
import { getSupabaseClient, isAuthConfigured, getUser } from './auth.js';

const DB_NAME = 'shield-inspection';
const DB_VERSION = 2;
const STORAGE_BUCKET = 'inspection-photos';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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

        // v2: Pending deletes store — tracks deletions that need to sync to cloud
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('pendingDeletes')) {
            db.createObjectStore('pendingDeletes', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('syncMeta')) {
            db.createObjectStore('syncMeta', { keyPath: 'key' });
          }
        }
      }
    });
  }
  return dbPromise;
}

// ============================================================
// INSPECTIONS — Local + Cloud
// ============================================================

/**
 * Save inspection to local IndexedDB ONLY (no cloud sync).
 * Marks the record as dirty for later cloud sync.
 * Used by autoSave() for high-frequency saves.
 */
export async function saveInspectionLocal(inspection) {
  const db = await getDB();
  inspection.updatedAt = new Date().toISOString();
  inspection._dirty = true;
  await db.put('inspections', inspection);
  return inspection;
}

/**
 * Save inspection and immediately sync to cloud.
 * Used for explicit save points (new inspection, important actions).
 */
export async function saveInspection(inspection) {
  const db = await getDB();
  inspection.updatedAt = new Date().toISOString();
  inspection._dirty = true;
  await db.put('inspections', inspection);

  // Sync to cloud in background
  syncInspectionToCloud(inspection).then(async () => {
    // Mark clean after successful sync
    inspection._dirty = false;
    await db.put('inspections', inspection);
  }).catch(e =>
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

/**
 * Delete an inspection and all its photos.
 * Awaits cloud delete — if it fails, stores in pendingDeletes for retry.
 */
export async function deleteInspection(id) {
  const db = await getDB();

  // Collect photo storage paths before deleting locally
  const photos = await getPhotosByInspection(id);
  const storagePaths = [];
  for (const photo of photos) {
    if (photo.storagePath) {
      storagePaths.push(photo.storagePath);
    }
  }

  // Delete locally first
  const tx = db.transaction(['inspections', 'photos'], 'readwrite');
  await tx.objectStore('inspections').delete(id);
  for (const photo of photos) {
    await tx.objectStore('photos').delete(photo.id);
  }
  await tx.done;

  // Attempt cloud delete — await it (don't fire-and-forget)
  try {
    await deleteInspectionFromCloud(id, storagePaths);
  } catch (e) {
    console.warn('Cloud delete failed, queuing for retry:', e.message);
    // Store in pendingDeletes for retry on next sync
    await db.put('pendingDeletes', {
      id: id,
      type: 'inspection',
      storagePaths: storagePaths,
      photoIds: photos.map(p => p.id),
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================================
// PHOTOS — Local + Cloud
// ============================================================

export async function savePhoto(photoData) {
  const db = await getDB();
  photoData._dirty = true;
  await db.put('photos', photoData);

  // Sync photo to cloud (Supabase Storage) in background
  syncPhotoToCloud(photoData).then(async () => {
    photoData._dirty = false;
    await db.put('photos', photoData);
  }).catch(e =>
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
  const photo = await db.get('photos', id);
  await db.delete('photos', id);

  // Delete from cloud (Storage + DB row)
  try {
    await deletePhotoFromCloud(id, photo?.storagePath);
  } catch (e) {
    console.warn('Cloud photo delete failed, queuing for retry:', e.message);
    await db.put('pendingDeletes', {
      id: `photo_${id}`,
      type: 'photo',
      photoId: id,
      storagePath: photo?.storagePath || null,
      timestamp: new Date().toISOString()
    });
  }
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
// CLOUD SYNC — Supabase (Smart Sync)
// ============================================================

/**
 * Main sync orchestrator — call from app on navigation, visibility change, etc.
 * 1. Process any pending deletes
 * 2. Push dirty records to cloud
 */
export async function syncToCloud() {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  try {
    await processPendingDeletes();
    await pushDirtyToCloud();
  } catch (e) {
    console.warn('syncToCloud error:', e.message);
  }
}

async function syncInspectionToCloud(inspection) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  // Strip local-only fields before sending to cloud
  const cloudData = { ...inspection };
  delete cloudData._dirty;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('inspections')
    .upsert({
      id: inspection.id,
      user_id: user.id,
      data: cloudData,
      status: inspection.status,
      updated_at: inspection.updatedAt
    }, { onConflict: 'id' });

  if (error) throw error;
}

/**
 * Delete inspection + photos from cloud.
 * Deletes from both Supabase Storage and the database.
 */
async function deleteInspectionFromCloud(id, storagePaths = []) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const supabase = getSupabaseClient();

  // Delete photo files from Supabase Storage
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths);
    if (storageError) {
      console.warn('Storage delete warning:', storageError.message);
    }
  }

  // Delete photo DB rows
  const { error: photoError } = await supabase
    .from('inspection_photos')
    .delete()
    .eq('inspection_id', id);
  if (photoError) throw photoError;

  // Delete inspection row
  const { error } = await supabase
    .from('inspections')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Upload photo to Supabase Storage (NOT base64 in PostgreSQL).
 * Stores the binary JPEG in the Storage bucket and saves only
 * a lightweight path reference in the inspection_photos table.
 */
async function syncPhotoToCloud(photoData) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const supabase = getSupabaseClient();
  const storagePath = `${user.id}/${photoData.inspectionId}/${photoData.id}.jpg`;

  // Upload binary blob to Supabase Storage
  let blob = null;
  if (photoData.blob instanceof Blob) {
    blob = photoData.blob;
  } else if (typeof photoData.blob === 'string' && photoData.blob.startsWith('data:')) {
    // Convert data URL string to blob
    blob = base64ToBlob(photoData.blob);
  }

  if (blob && blob.size > 0) {
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, {
        contentType: 'image/jpeg',
        upsert: true   // Overwrite if exists
      });

    if (uploadError) throw uploadError;
  }

  // Save lightweight reference in the database (no base64!)
  const { error: dbError } = await supabase
    .from('inspection_photos')
    .upsert({
      id: photoData.id,
      inspection_id: photoData.inspectionId,
      user_id: user.id,
      storage_path: storagePath,
      blob_base64: null    // Explicitly null — no base64 in PostgreSQL
    }, { onConflict: 'id' });

  if (dbError) throw dbError;

  // Save storagePath locally for future reference (delete, etc.)
  const db = await getDB();
  const local = await db.get('photos', photoData.id);
  if (local) {
    local.storagePath = storagePath;
    local._dirty = false;
    await db.put('photos', local);
  }
}

async function deletePhotoFromCloud(id, storagePath) {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const supabase = getSupabaseClient();

  // Delete from Storage
  if (storagePath) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);
  }

  // Delete DB row
  await supabase.from('inspection_photos').delete().eq('id', id);
}

/**
 * Pull inspections and photo metadata from Supabase.
 * Photos are lazy-loaded from Storage — only metadata is pulled here.
 * Also handles one-time migration of legacy base64 photos to Storage.
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

  // Build sets of cloud IDs for reconciliation
  const cloudInspectionIds = new Set((cloudInspections || []).map(r => r.id));

  let pulled = 0;
  for (const row of (cloudInspections || [])) {
    const local = await db.get('inspections', row.id);
    // Cloud wins if no local copy or cloud is newer (and local isn't dirty)
    if (!local || (!local._dirty && new Date(row.updated_at) > new Date(local.updatedAt))) {
      const inspection = row.data;
      inspection.id = row.id;
      inspection.updatedAt = row.updated_at;
      inspection.status = row.status;
      inspection._dirty = false;
      await db.put('inspections', inspection);
      pulled++;
    }
  }

  // ── Reconcile: remove local inspections deleted from cloud ──
  const localInspections = await db.getAll('inspections');
  for (const local of localInspections) {
    if (!cloudInspectionIds.has(local.id) && !local._dirty) {
      // This inspection no longer exists in the cloud and isn't dirty locally
      // → it was deleted on another device, remove it locally too
      await db.delete('inspections', local.id);
      // Also clean up associated local photos
      const orphanPhotos = await db.getAllFromIndex('photos', 'inspectionId', local.id);
      for (const photo of orphanPhotos) {
        await db.delete('photos', photo.id);
      }
    }
  }

  // Pull photo METADATA only — NO blob_base64 in the query (huge I/O savings!)
  const { data: cloudPhotos, error: photoError } = await supabase
    .from('inspection_photos')
    .select('id, inspection_id, user_id, storage_path, created_at')
    .eq('user_id', user.id);

  const cloudPhotoIds = new Set((cloudPhotos || []).map(r => r.id));

  if (!photoError && cloudPhotos) {
    for (const row of cloudPhotos) {
      const local = await db.get('photos', row.id);

      if (row.storage_path) {
        // ── New format: photo is in Supabase Storage ──
        if (!local) {
          // Download from Storage and cache locally
          try {
            const blob = await downloadPhotoFromStorage(row.storage_path);
            await db.put('photos', {
              id: row.id,
              inspectionId: row.inspection_id,
              blob: blob,
              storagePath: row.storage_path,
              _dirty: false
            });
          } catch (dlErr) {
            console.warn(`Failed to download photo ${row.id}:`, dlErr.message);
          }
        } else if (!local.storagePath) {
          // Local exists but doesn't have storagePath — update metadata
          local.storagePath = row.storage_path;
          local._dirty = false;
          await db.put('photos', local);
        }
      } else {
        // ── Legacy format: no storage_path → still base64 in PostgreSQL ──
        if (local && !local.storagePath) {
          // Photo exists locally — just mark dirty to trigger migration upload
          // pushDirtyToCloud() will upload from local IndexedDB to Storage
          // (no need to read blob_base64 from PostgreSQL!)
          if (!local._dirty) {
            local._dirty = true;
            await db.put('photos', local);
          }
        } else if (!local) {
          // Rare case: photo exists in cloud but not locally
          // Need to fetch the base64 individually to pull it down
          try {
            const { data: fullRow, error: fetchErr } = await supabase
              .from('inspection_photos')
              .select('blob_base64')
              .eq('id', row.id)
              .single();

            if (!fetchErr && fullRow?.blob_base64) {
              const blob = base64ToBlob(fullRow.blob_base64);
              await db.put('photos', {
                id: row.id,
                inspectionId: row.inspection_id,
                blob: blob,
                _dirty: true   // Will be migrated to Storage on next push
              });
            }
          } catch (fetchErr) {
            console.warn(`Failed to fetch legacy photo ${row.id}:`, fetchErr.message);
          }
        }
        // Migration to Storage will happen on next pushDirtyToCloud()
      }
    }
  }

  // ── Reconcile: remove local photos deleted from cloud ──
  const localPhotos = await db.getAll('photos');
  for (const local of localPhotos) {
    if (!cloudPhotoIds.has(local.id) && !local._dirty) {
      await db.delete('photos', local.id);
    }
  }

  return { pulled };
}

/**
 * Download a photo file from Supabase Storage.
 */
async function downloadPhotoFromStorage(storagePath) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);

  if (error) throw error;
  return data; // data is a Blob
}

/**
 * Push only dirty (changed) records to the cloud.
 * This replaces the old pushToCloud() which re-pushed EVERYTHING.
 */
export async function pushDirtyToCloud() {
  if (!isAuthConfigured()) return { pushed: 0 };
  const user = await getUser();
  if (!user) return { pushed: 0 };

  const db = await getDB();
  const inspections = await db.getAll('inspections');
  let pushed = 0;

  // Push only dirty inspections
  for (const inspection of inspections) {
    if (inspection._dirty) {
      try {
        await syncInspectionToCloud(inspection);
        inspection._dirty = false;
        await db.put('inspections', inspection);
        pushed++;
      } catch (e) {
        console.warn('Failed to push inspection:', inspection.id, e.message);
      }
    }
  }

  // Push only dirty photos (this also handles legacy→Storage migration)
  const photos = await db.getAll('photos');
  for (const photo of photos) {
    if (photo._dirty) {
      try {
        await syncPhotoToCloud(photo);
        // syncPhotoToCloud updates storagePath and _dirty locally
        pushed++;
      } catch (e) {
        console.warn('Failed to push photo:', photo.id, e.message);
      }
    }
  }

  return { pushed };
}

// Keep legacy name as alias for backward compat during transition
export { pushDirtyToCloud as pushToCloud };

/**
 * Process pending deletes — retry cloud deletions that previously failed.
 */
export async function processPendingDeletes() {
  if (!isAuthConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const db = await getDB();
  const pending = await db.getAll('pendingDeletes');

  for (const entry of pending) {
    try {
      if (entry.type === 'inspection') {
        await deleteInspectionFromCloud(entry.id, entry.storagePaths || []);
      } else if (entry.type === 'photo') {
        await deletePhotoFromCloud(entry.photoId, entry.storagePath);
      }
      // Success — remove from pending
      await db.delete('pendingDeletes', entry.id);
    } catch (e) {
      console.warn(`Pending delete retry failed for ${entry.id}:`, e.message);
      // Leave in pendingDeletes for next retry
    }
  }
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
