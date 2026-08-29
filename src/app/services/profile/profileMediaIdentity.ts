/** هوية وسائط الملف بلا query — لا تستخدم data: كامل كمفتاح React/كاش */
export function profileMediaIdentity(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:')) {
        const comma = trimmed.indexOf(',');
        const meta = (comma >= 0 ? trimmed.slice(0, comma) : trimmed.slice(0, 48)).slice(0, 64);
        const payloadLen = comma >= 0 ? trimmed.length - comma - 1 : 0;
        let hash = 0;
        const sampleStart = Math.max(0, trimmed.length - 48);
        for (let i = sampleStart; i < trimmed.length; i += 1) {
            hash = (hash * 33 + trimmed.charCodeAt(i)) >>> 0;
        }
        return `${meta}:L${payloadLen}:h${hash.toString(16)}`;
    }
    try {
        const base =
            typeof window !== 'undefined' ? window.location.href : 'https://hami.local/';
        const parsed = new URL(trimmed, base);
        return `${parsed.origin}${parsed.pathname}`;
    } catch {
        return trimmed.split('?')[0] ?? trimmed;
    }
}
