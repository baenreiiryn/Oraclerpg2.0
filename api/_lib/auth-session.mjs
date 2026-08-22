import { db } from './db.mjs';

function authError(message = 'Authentication required.') {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

export async function requireSession(request) {
  const authorization = request.headers.authorization || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) throw authError();

  const sql = db();
  const rows = await sql`
    SELECT
      s.id AS session_id,
      s.token AS session_token,
      s."expiresAt" AS expires_at,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.image AS user_image
    FROM neon_auth.session s
    JOIN neon_auth."user" u ON u.id = s."userId"
    WHERE s.token = ${bearer}
      AND s."expiresAt" > now()
    LIMIT 1
  `;

  const row = rows[0];
  if (!row?.user_id || !row?.session_id) throw authError('Invalid or expired session.');

  return {
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      image: row.user_image,
    },
    session: {
      id: row.session_id,
      token: row.session_token,
      expiresAt: row.expires_at,
    },
  };
}
