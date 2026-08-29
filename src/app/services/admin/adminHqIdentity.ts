/** بريد مدير المنصّة المتفق عليه — مصدر واحد للبوابة والتحقق من الجلسة */
const HEADQUARTERS_MASTER_EMAIL = 'hami.apps@proton.me';

export function isHeadquartersMasterMailbox(email: string | null | undefined): boolean {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!normalized.includes('@')) return false;
    if (normalized === HEADQUARTERS_MASTER_EMAIL) return true;
    const fromVite = String(import.meta.env.VITE_ADMIN_MASTER_EMAIL ?? '')
        .trim()
        .toLowerCase();
    return Boolean(fromVite.includes('@') && fromVite === normalized);
}
