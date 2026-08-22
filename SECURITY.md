# OracleRPG Security Policy

## Public repository boundary

The repository may contain application code, schemas, SRD-compatible content, public provider endpoints, and non-secret configuration examples.

The repository must never contain:

- API keys, OAuth client secrets, database passwords, or bearer tokens;
- `.env` files or production environment values;
- plaintext BYOK credentials;
- private keys or signing material;
- exported user sessions or production user data.

## Secrets and environment variables

Production secrets are configured only in the hosting/database platforms. `.env` and `.env.*` are ignored by Git; `.env.example` contains names only.

`ORACLE_BYOK_ENCRYPTION_KEY` is server-only and must be a fresh base64-encoded 32-byte random value. It must never be sent to the browser or committed to Git.

## BYOK credentials

Personal provider credentials are accepted only by authenticated server endpoints. They are encrypted before persistence with AES-256-GCM, stored in the private database schema, scoped to the authenticated user ID, and are never returned to the browser after being saved.

The frontend may store the active provider identifier as a preference, but never the provider credential.

## Authentication

Protected server endpoints derive the user identity from a valid, unexpired Neon Auth session token. Caller-provided user IDs are not trusted for authorization.

## Release gates

Before a release to `main`, CI must pass:

1. current-tree secret and unsafe-storage audit;
2. full reachable Git-history high-confidence secret scan;
3. TypeScript typecheck;
4. workspace tests;
5. Oracle AI architecture release gate.

If a real secret is ever committed, deleting it in a later commit is not sufficient. Rotate the credential first, then rewrite Git history before making the repository public.

## Reporting

Do not post suspected credentials in public issues. Revoke or rotate exposed credentials immediately before investigating further.
