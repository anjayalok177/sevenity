import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass) {
    return res.status(500).json({ error: 'Admin password belum dikonfigurasi' });
  }

  // Pastikan panjang sama sebelum constant-time compare
  const pwBuf   = Buffer.alloc(128, 0);
  const adminBuf = Buffer.alloc(128, 0);
  Buffer.from(password || '').copy(pwBuf);
  Buffer.from(adminPass).copy(adminBuf);

  const isValid = crypto.timingSafeEqual(pwBuf, adminBuf);

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Token sederhana berbasis base64 password
  const token = Buffer.from(adminPass).toString('base64');
  return res.status(200).json({ token });
}
