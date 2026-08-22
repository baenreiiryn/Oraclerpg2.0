import crypto from 'node:crypto';

const DEFAULT_NEON_AUTH_BASE_URL = 'https://ep-wandering-hill-ay3garr2.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth';
let cachedJwks;
let cachedAt = 0;

function authError(message = 'Authentication required.') {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function getJwks(authBaseUrl) {
  const now = Date.now();
  if (cachedJwks && now - cachedAt < 5 * 60 * 1000) return cachedJwks;
  const response = await fetch(`${authBaseUrl}/.well-known/jwks.json`, { cache: 'no-store' });
  if (!response.ok) throw authError('Unable to validate authentication token.');
  cachedJwks = await response.json();
  cachedAt = now;
  return cachedJwks;
}

async function verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw authError('Invalid or expired session.');

  let header;
  let payload;
  try {
    header = decodePart(parts[0]);
    payload = decodePart(parts[1]);
  } catch {
    throw authError('Invalid or expired session.');
  }

  if (header.alg !== 'EdDSA' || !header.kid) throw authError('Invalid or expired session.');

  const authBaseUrl = process.env.NEON_AUTH_BASE_URL || DEFAULT_NEON_AUTH_BASE_URL;
  const origin = new URL(authBaseUrl).origin;
  const jwks = await getJwks(authBaseUrl);
  const jwk = Array.isArray(jwks?.keys) ? jwks.keys.find((key) => key.kid === header.kid) : null;
  if (!jwk) {
    cachedJwks = null;
    const refreshed = await getJwks(authBaseUrl);
    const refreshedKey = Array.isArray(refreshed?.keys) ? refreshed.keys.find((key) => key.kid === header.kid) : null;
    if (!refreshedKey) throw authError('Invalid or expired session.');
    return verifyWithKey(token, parts, payload, refreshedKey, origin);
  }

  return verifyWithKey(token, parts, payload, jwk, origin);
}

function verifyWithKey(token, parts, payload, jwk, origin) {
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    throw authError('Unable to validate authentication token.');
  }

  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], 'base64url');
  const valid = crypto.verify(null, signingInput, publicKey, signature);
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

  if (!valid || !payload.sub || !payload.exp || payload.exp <= now) throw authError('Invalid or expired session.');
  if (payload.iss !== origin || !audience.includes(origin)) throw authError('Invalid authentication token issuer.');

  return payload;
}

export async function requireSession(request) {
  const authorization = request.headers.authorization || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) throw authError();

  const payload = await verifyJwt(bearer);

  return {
    user: {
      id: payload.sub,
      name: payload.name || '',
      email: payload.email || '',
      image: payload.image || null,
    },
    session: {
      token: bearer,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    },
  };
}
