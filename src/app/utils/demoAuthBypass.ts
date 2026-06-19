/** تجربة بدون تسجيل — DEV دائماً، أو VITE_DEMO_BYPASS_AUTH=true على Vercel */
export function isDemoBypassAuthEnabled(): boolean {
    if (import.meta.env.DEV) return true;
    return String(import.meta.env.VITE_DEMO_BYPASS_AUTH ?? '').toLowerCase() === 'true';
}
