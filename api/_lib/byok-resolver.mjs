import { decryptSecret } from './crypto.mjs';
import { db, ensureCredentialStore } from './db.mjs';

export async function resolveByokCredential(userId, providerId) {
  if (!userId || !providerId) return null;
  await ensureCredentialStore();
  const sql = db();
  const rows = await sql`
    SELECT provider_id, base_url, model_id, vision_model_id,
           secret_ciphertext, secret_iv, secret_tag
    FROM oracle_private.ai_credentials
    WHERE user_id = ${userId} AND provider_id = ${providerId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    providerId: row.provider_id,
    baseUrl: row.base_url || '',
    modelId: row.model_id || '',
    visionModelId: row.vision_model_id || '',
    secret: decryptSecret(row),
  };
}
