const DEFAULT_NEON_AUTH_BASE_URL = 'https://ep-wandering-hill-ay3garr2.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // The Neon Auth base URL is a public client configuration value, not a secret.
  // Prefer the Vercel/Neon environment variable when available, but keep the
  // production Auth endpoint as a safe fallback so authentication is not
  // disabled when the integration does not inject NEON_AUTH_BASE_URL.
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL || DEFAULT_NEON_AUTH_BASE_URL;

  return res.status(200).json({
    ok: true,
    authBaseUrl,
  });
}
