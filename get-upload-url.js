import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileName, fileType, senderName, duration, fileSize } = req.body;

  if (!fileName || !senderName) {
    return res.status(400).json({ error: 'fileName dan senderName wajib diisi' });
  }

  if (fileSize > 50 * 1024 * 1024) {
    return res.status(400).json({ error: 'File terlalu besar (max 50MB)' });
  }

  try {
    const filePath = `voice-notes/${Date.now()}_${fileName}`;

    // Buat signed URL untuk upload langsung ke Supabase Storage (berlaku 5 menit)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('voice-notes')
      .createSignedUploadUrl(filePath);

    if (signedError) throw signedError;

    // Simpan metadata ke database dengan status 'pending'
    const { data: record, error: dbError } = await supabase
      .from('voice_notes')
      .insert({
        sender_name: senderName,
        file_path: filePath,
        file_size: fileSize,
        duration: duration,
        mime_type: fileType,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return res.status(200).json({
      signedUrl: signedData.signedUrl,
      filePath,
      recordId: record.id
    });

  } catch (err) {
    console.error('[get-upload-url] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
