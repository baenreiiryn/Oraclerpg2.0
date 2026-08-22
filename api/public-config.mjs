export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL || '';
  if (!authBaseUrl) {
    return res.status(503).json({ ok: false, error: 'Authentication is not configured.' });
  }
  return res.status(200).json({
    ok: true,
    authBaseUrl,
  });
}
