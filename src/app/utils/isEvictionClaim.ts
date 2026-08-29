/** تمييز مطالبة التخلية/تسليم العقار — بلا state machine ولا استراتيجيات. */
export function isEvictionClaim(claimType: string | undefined | null): boolean {
    const c = (claimType || '').trim();
    if (c === 'eviction') return true;
    return (
        c.includes('تخلية مأجور') ||
        c.includes('تسليم عقار') ||
        c.includes('تخلية') ||
        c.includes('إخلاء') ||
        c.toLowerCase().includes('eviction')
    );
}
