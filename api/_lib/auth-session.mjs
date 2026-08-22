const AUTH_BASE = process.env.NEON_AUTH_BASE_URL;

export async function requireSession(request) {
  if (!AUTH_BASE) {
    const error = new Error('NEON_AUTH_BASE_URL is not configured.');
    error.statusCode = 503;
    throw error;
  }

  const cookie = request.headers.cookie || '';
  if (!cookie) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  const response = await fetch(`${AUTH_BASE.replace(/\/$/, '')}/get-session`, {
    method: 'GET',
    headers: {
      cookie,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error('Invalid or expired session.');
    error.statusCode = 401;
    throw error;
  }

  const data = await response.json().catch(() => null);
  const user = data?.user || data?.data?.user;
  const session = data?.session || data?.data?.session;
  if (!user?.id || !session) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    throw error;
  }

  return { user, session };
}
