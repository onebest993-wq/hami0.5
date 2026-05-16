export function todayYmd(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function maxYmd(a?: string, b?: string): string {
    const aa = typeof a === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a) ? a : '';
    const bb = typeof b === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b) ? b : '';
    if (!aa) return bb || '';
    if (!bb) return aa || '';
    return aa > bb ? aa : bb;
}

export function safeMaxToday(min?: string, today = todayYmd()): string | undefined {
    const mm = typeof min === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(min) ? min : '';
    if (mm && mm > today) return undefined;
    return today;
}

export function addDaysYmd(ymd: string, durationDays: number): string {
    const m = String(ymd || '').match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) return '';
    const [y, mo, d] = m[1].split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    dt.setDate(dt.getDate() + durationDays);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
