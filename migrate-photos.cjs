// ============================================================
// One-time migration script: Move photos from PostgreSQL base64
// to Supabase Storage. Run with:
//
//   node migrate-photos.cjs <SERVICE_ROLE_KEY>
//
// Get your service_role key from:
//   Supabase Dashboard → Settings → API → service_role (secret)
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rjuuajzgzqqbjedeuidm.supabase.co';
const STORAGE_BUCKET = 'inspection-photos';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('\n❌ Usage: node migrate-photos.cjs <SERVICE_ROLE_KEY>\n');
  console.error('Get your service_role key from:');
  console.error('  Supabase Dashboard → Settings → API → service_role (secret)\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function migrate() {
  console.log('\n📸 Photo Migration: PostgreSQL base64 → Supabase Storage\n');

  // Step 1: Get list of photos that need migration (metadata only — no blobs)
  const { data: photos, error } = await supabase
    .from('inspection_photos')
    .select('id, inspection_id, user_id')
    .is('storage_path', null);

  if (error) {
    console.error('❌ Failed to fetch photo list:', error.message);
    return;
  }

  if (!photos || photos.length === 0) {
    console.log('✅ No photos need migration — all done!');
    return;
  }

  console.log(`Found ${photos.length} photos to migrate\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  // Step 2: Process one photo at a time to avoid memory issues
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const progress = `[${i + 1}/${photos.length}]`;

    try {
      // Fetch blob_base64 for this single photo
      const { data: fullRow, error: fetchErr } = await supabase
        .from('inspection_photos')
        .select('blob_base64')
        .eq('id', photo.id)
        .single();

      if (fetchErr) throw new Error(`Fetch failed: ${fetchErr.message}`);
      if (!fullRow?.blob_base64) {
        console.log(`${progress} ⏭️  Skipped ${photo.id} — no blob_base64 data`);
        skipped++;
        continue;
      }

      // Decode base64 data URL to binary buffer
      const base64Str = fullRow.blob_base64;
      const base64Data = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length === 0) {
        console.log(`${progress} ⏭️  Skipped ${photo.id} — empty blob`);
        skipped++;
        continue;
      }

      // Upload to Supabase Storage
      const storagePath = `${photo.user_id}/${photo.inspection_id}/${photo.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Update DB row: set storage_path and clear blob_base64
      const { error: updateError } = await supabase
        .from('inspection_photos')
        .update({
          storage_path: storagePath,
          blob_base64: null
        })
        .eq('id', photo.id);

      if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

      success++;
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`${progress} ✅ Migrated ${photo.id} (${sizeMB} MB)`);

    } catch (e) {
      failed++;
      console.error(`${progress} ❌ Failed ${photo.id}: ${e.message}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Migration complete!`);
  console.log(`  ✅ Migrated: ${success}`);
  console.log(`  ⏭️  Skipped:  ${skipped}`);
  console.log(`  ❌ Failed:   ${failed}`);
  console.log(`${'='.repeat(50)}\n`);

  if (failed === 0 && skipped === 0) {
    console.log('🎉 All photos migrated! You can now drop the blob_base64 column:');
    console.log('   ALTER TABLE public.inspection_photos DROP COLUMN blob_base64;');
    console.log('   VACUUM FULL public.inspection_photos;\n');
  }
}

migrate().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
