import { requireSession } from '../_lib/auth-session.mjs';
import { encryptSecret } from '../_lib/crypto.mjs';
import { db, ensureCredentialStore } from '../_lib/db.mjs';

const PROVIDERS = new Set(['openai', 'gemini', 'nvidia', 'openrouter']);

function fail(res, status, message) {
  res.status(status).json({ ok: false, error: message });
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return url.host === req.headers.host;
  } catch {
    return false;
  }
}

function cleanString(value, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeBaseUrl(value) {
  const input = cleanString(value, 500);
  if (!input) return '';
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('A URL base deve usar HTTPS.');
  if (url.username || url.password) throw new Error('A URL base não pode conter credenciais.');
  return url.toString().replace(/\/$/, '');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!sameOrigin(req)) return fail(res, 403, 'Origem não autorizada.');

  try {
    const { user } = await requireSession(req);
    await ensureCredentialStore();
    const sql = db();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT provider_id, base_url, model_id, vision_model_id, updated_at
        FROM public.oracle_ai_credentials
        WHERE user_id = ${user.id}
        ORDER BY provider_id
      `;
      return res.status(200).json({
        ok: true,
        providers: rows.map((row) => ({
          provider: row.provider_id,
          baseUrl: row.base_url || '',
          model: row.model_id || '',
          visionModel: row.vision_model_id || '',
          hasKey: true,
          updatedAt: row.updated_at,
        })),
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const provider = cleanString(body.provider, 40).toLowerCase();
    if (!PROVIDERS.has(provider)) return fail(res, 400, 'Provedor inválido.');

    if (req.method === 'PUT' || req.method === 'POST') {
      const apiKey = cleanString(body.apiKey, 10000);
      if (!apiKey || apiKey.length < 8) return fail(res, 400, 'Chave da API inválida.');
      const encrypted = encryptSecret(apiKey);
      const baseUrl = safeBaseUrl(body.baseUrl);
      const model = cleanString(body.model, 300);
      const visionModel = cleanString(body.visionModel, 300);

      await sql`
        INSERT INTO public.oracle_ai_credentials (
          user_id, provider_id, base_url, model_id, vision_model_id,
          secret_ciphertext, secret_iv, secret_tag, updated_at
        ) VALUES (
          ${user.id}, ${provider}, ${baseUrl || null}, ${model || null}, ${visionModel || null},
          ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.tag}, now()
        )
        ON CONFLICT (user_id, provider_id) DO UPDATE SET
          base_url = EXCLUDED.base_url,
          model_id = EXCLUDED.model_id,
          vision_model_id = EXCLUDED.vision_model_id,
          secret_ciphertext = EXCLUDED.secret_ciphertext,
          secret_iv = EXCLUDED.secret_iv,
          secret_tag = EXCLUDED.secret_tag,
          updated_at = now()
      `;
      return res.status(200).json({ ok: true, provider, hasKey: true });
    }

    if (req.method === 'DELETE') {
      await sql`
        DELETE FROM public.oracle_ai_credentials
        WHERE user_id = ${user.id} AND provider_id = ${provider}
      `;
      return res.status(200).json({ ok: true, provider, removed: true });
    }

    res.setHeader('Allow', 'GET, PUT, POST, DELETE');
    return fail(res, 405, 'Método não permitido.');
  } catch (error) {
    console.error('AI credential endpoint error:', error?.message || error);
    return fail(res, Number(error?.statusCode) || 500, Number(error?.statusCode) ? error.message : 'Falha ao processar configuração de IA.');
  }
}
