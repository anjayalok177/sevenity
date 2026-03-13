import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { recordId, filePath } = req.body;
  if (!recordId || !filePath) {
    return res.status(400).json({ error: 'recordId dan filePath diperlukan' });
  }

  try {
    const { error } = await supabase
      .from('voice_notes')
      .update({ status: 'ready' })
      .eq('id', recordId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[confirm-upload] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
