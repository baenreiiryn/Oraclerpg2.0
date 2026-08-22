import { requireSession } from './_lib/auth-session.mjs';
import { db } from './_lib/db.mjs';

const TYPES = new Set(['campaign', 'homebrew']);
const MAX_JSON_BYTES = 3_500_000;

function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function clean(value, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function ensureStore() {
  const sql = db();
  await sql`CREATE SCHEMA IF NOT EXISTS oracle_private`;
  await sql`
    CREATE TABLE IF NOT EXISTS oracle_private.user_content (
      user_id text NOT NULL,
      content_type text NOT NULL,
      content_id text NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, content_type, content_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS oracle_user_content_lookup ON oracle_private.user_content (user_id, content_type, updated_at DESC)`;
  await sql`REVOKE ALL ON SCHEMA oracle_private FROM PUBLIC`;
  await sql`REVOKE ALL ON TABLE oracle_private.user_content FROM PUBLIC`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!sameOrigin(req)) return fail(res, 403, 'Origem não autorizada.');

  try {
    const { user } = await requireSession(req);
    await ensureStore();
    const sql = db();

    if (req.method === 'GET') {
      const type = clean(req.query?.type, 30);
      const id = clean(req.query?.id, 180);
      if (!TYPES.has(type)) return fail(res, 400, 'Tipo de conteúdo inválido.');

      if (id) {
        const rows = await sql`
          SELECT content_id, payload, updated_at
          FROM oracle_private.user_content
          WHERE user_id = ${user.id} AND content_type = ${type} AND content_id = ${id}
          LIMIT 1
        `;
        const row = rows[0];
        return res.status(200).json({ ok: true, item: row ? { id: row.content_id, payload: row.payload, updatedAt: row.updated_at } : null });
      }

      const rows = await sql`
        SELECT content_id, payload, updated_at
        FROM oracle_private.user_content
        WHERE user_id = ${user.id} AND content_type = ${type}
        ORDER BY updated_at DESC
        LIMIT 100
      `;
      return res.status(200).json({
        ok: true,
        items: rows.map((row) => ({ id: row.content_id, payload: row.payload, updatedAt: row.updated_at })),
      });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const type = clean(body.type, 30);
      const id = clean(body.id, 180);
      if (!TYPES.has(type) || !id) return fail(res, 400, 'Tipo ou ID de conteúdo inválido.');
      if (body.payload == null || typeof body.payload !== 'object') return fail(res, 400, 'Conteúdo inválido.');
      const serialized = JSON.stringify(body.payload);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_JSON_BYTES) return fail(res, 413, 'Conteúdo grande demais para sincronização da conta.');

      await sql`
        INSERT INTO oracle_private.user_content (user_id, content_type, content_id, payload, updated_at)
        VALUES (${user.id}, ${type}, ${id}, ${serialized}::jsonb, now())
        ON CONFLICT (user_id, content_type, content_id) DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = now()
      `;
      return res.status(200).json({ ok: true, type, id });
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const type = clean(body.type || req.query?.type, 30);
      const id = clean(body.id || req.query?.id, 180);
      if (!TYPES.has(type) || !id) return fail(res, 400, 'Tipo ou ID de conteúdo inválido.');
      await sql`
        DELETE FROM oracle_private.user_content
        WHERE user_id = ${user.id} AND content_type = ${type} AND content_id = ${id}
      `;
      return res.status(200).json({ ok: true, removed: true });
    }

    res.setHeader('Allow', 'GET, PUT, POST, DELETE');
    return fail(res, 405, 'Método não permitido.');
  } catch (error) {
    console.error('Account data endpoint error:', error?.message || error);
    return fail(res, Number(error?.statusCode) || 500, Number(error?.statusCode) ? error.message : 'Falha ao sincronizar dados da conta.');
  }
}
