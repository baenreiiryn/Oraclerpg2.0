import { neon } from '@neondatabase/serverless';

function sqlClient() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) {
    const error = new Error('Database connection is not configured.');
    error.statusCode = 503;
    throw error;
  }
  return neon(url);
}

let initialized;
export async function ensureCredentialStore() {
  if (!initialized) {
    initialized = (async () => {
      const sql = sqlClient();
      await sql`
        CREATE TABLE IF NOT EXISTS public.oracle_ai_credentials (
          user_id text NOT NULL,
          provider_id text NOT NULL,
          base_url text,
          model_id text,
          vision_model_id text,
          secret_ciphertext text NOT NULL,
          secret_iv text NOT NULL,
          secret_tag text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, provider_id)
        )
      `;
    })();
  }
  return initialized;
}

export function db() {
  return sqlClient();
}
