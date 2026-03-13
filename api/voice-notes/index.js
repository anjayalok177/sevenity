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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { data, error } = await supabase
      .from('voice_notes')
      .select('*')
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate signed URL playback untuk setiap rekaman (berlaku 1 jam)
    const withUrls = await Promise.all(
      data.map(async (item) => {
        const { data: urlData } = await supabase.storage
          .from('voice-notes')
          .createSignedUrl(item.file_path, 3600);
        return { ...item, file_url: urlData?.signedUrl || null };
      })
    );

    const today = new Date().toISOString().split('T')[0];
    const todayCount = data.filter(d => d.created_at.startsWith(today)).length;
    const totalSize  = data.reduce((sum, d) => sum + (d.file_size || 0), 0);

    return res.status(200).json({
      data: withUrls,
      stats: { total: data.length, today: todayCount, totalSize }
    });

  } catch (err) {
    console.error('[voice-notes GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
