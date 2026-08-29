export const SHARE_PII_TOKEN = '[محذوف]';

const EMAIL_RE = /([a-zA-Z0-9._%+-]{1,64})@([a-zA-Z0-9.-]{1,253})\.([a-zA-Z]{2,24})/g;
const IRAQ_MOBILE_RE = /(?:\+?964|0)?\s*7\d{2}[\s-]?\d{3}[\s-]?\d{4}/g;
const LONG_ID_RE = /(?:\d[\s-]?){10,16}/g;
const OFFICIAL_REF_INLINE_RE = /(?:صادر|وارد|وصل)\s*[:：]?\s*[\d\u0660-\u0669\-/]+/gi;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scrubCore(input: string, clientName: string | null | undefined, collapseNewlines: boolean): string {
    let out = String(input ?? '');
    const name = clientName?.trim();
    if (name && name.length >= 2) {
        out = out.replace(new RegExp(escapeRegExp(name), 'gi'), SHARE_PII_TOKEN);
    }
    out = out.replace(EMAIL_RE, SHARE_PII_TOKEN);
    out = out.replace(IRAQ_MOBILE_RE, SHARE_PII_TOKEN);
    out = out.replace(LONG_ID_RE, (m) => {
        const digits = m.replace(/[^\d]/g, '');
        if (digits.length < 10 || digits.length > 16) return m;
        return SHARE_PII_TOKEN;
    });
    out = out.replace(OFFICIAL_REF_INLINE_RE, SHARE_PII_TOKEN);
    if (collapseNewlines) {
        return out.replace(/\s{2,}/g, ' ').trim();
    }
    return out.replace(/[^\S\n]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** تنقيح نصي للبيانات الحساسة — آمن لإعادة التشغيل قبل النشر */
export function scrubPiiText(input: string, clientName?: string | null): string {
    return scrubCore(input, clientName, true);
}

/** تنقيح مع الحفاظ على أسطر النص الإجرائي */
export function scrubPiiMultiline(input: string, clientName?: string | null): string {
    return scrubCore(input, clientName, false);
}
