import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyToken(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return token === expected;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'DELETE') return res.status(405).end();

  const { id } = req.query;

  try {
    // Ambil file_path dulu sebelum hapus
    const { data: record, error: fetchErr } = await supabase
      .from('voice_notes')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    // Hapus file dari storage
    if (record?.file_path) {
      await supabase.storage
        .from('voice-notes')
        .remove([record.file_path]);
    }

    // Hapus record dari database
    const { error: delErr } = await supabase
      .from('voice_notes')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[voice-notes DELETE] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
