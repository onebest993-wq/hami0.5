import { extractCaseRefsFromText } from './extractCaseRefs';

/** يمنع عرض نصوص عشوائية كـ «رقم قضية» في التثبيت والربط */
export function isLikelyCaseReference(value: string): boolean {
    const t = value.trim();
    if (!t || t === '—' || t === 'جديد' || t === 'غير محدد') return false;
    if (extractCaseRefsFromText(t).length > 0) return true;
    if (/^\d{4}\s*\/\s*\S+/.test(t)) return true;
    if (/^\d{3,}/.test(t) && /[\/\-]/.test(t)) return true;
    return false;
}

export function sanitizePinCaseNumber(caseNumber: string, ...fallbackText: string[]): string {
    const direct = caseNumber.trim();
    if (isLikelyCaseReference(direct)) return direct;
    for (const part of fallbackText) {
        const refs = extractCaseRefsFromText(part);
        if (refs[0]) return refs[0];
    }
    return '';
}

/** سطر فرعي تحت التثبيت — لا يعرض نصوص عشوائية قصيرة كاسم موكل */
export function sanitizePinSubtitle(
    caseNumber: string,
    title: string,
    clientName: string,
): string {
    const caseLabel = sanitizePinCaseNumber(caseNumber, title, clientName);
    if (caseLabel) return caseLabel;
    const client = clientName.trim();
    const titleTrim = title.trim();
    if (!client || client === titleTrim) return '';
    if (isLikelyCaseReference(client)) return client;
    if (/\s/.test(client)) return client;
    if (client.length >= 8) return client;
    return '';
}
