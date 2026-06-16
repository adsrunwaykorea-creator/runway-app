/** Production admin allow-list (comma-separated). Server-only env. */
export function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function hasAdminAccess(
  role: string | null | undefined,
  email: string | null | undefined,
): boolean {
  const normalizedRole = (role ?? '').toString().toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'manager') {
    return true;
  }

  const normalizedEmail = (email ?? '').trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return parseAdminEmails().includes(normalizedEmail);
}

/** Client: localhost dev bypass. Never true on production build + non-localhost host. */
export function isAdminDevBypassClient(): boolean {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
  }

  return process.env.NODE_ENV === 'development';
}

/** Server/API: production always false. */
export function isAdminDevBypassServer(request?: Request): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const host = request?.headers.get('host') ?? '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}
