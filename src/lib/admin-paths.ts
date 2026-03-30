/** Staff / admin app lives under this prefix. Public marketing site is at `/`. */
export const ADMIN_BASE = '/admin';

export const adminPaths = {
    login: `${ADMIN_BASE}/login`,
    dashboard: `${ADMIN_BASE}/dashboard`,
    selectBranch: `${ADMIN_BASE}/select-branch`,
} as const;

/** Prefix a path like `/dashboard` → `/admin/dashboard` */
export function adminHref(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    if (p === '/admin' || p.startsWith('/admin/')) return p;
    return `${ADMIN_BASE}${p}`;
}

/** Map `/admin/dashboard` → `dashboard` for page-access keys */
export function adminPageKey(href: string): string {
    return href.replace(new RegExp(`^${ADMIN_BASE}/?`), '').replace(/\/$/, '') || 'dashboard';
}
