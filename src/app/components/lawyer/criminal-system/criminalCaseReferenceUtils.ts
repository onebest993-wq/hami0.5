import { formatCriminalStageLabel } from './criminalStageUtils';

/** مدخلات مرجع الإضبارة — واجهة ضيقة لتجنّب الاعتماد الدائري على criminalStore. */
type CriminalCaseReferenceInput = {
    location?: {
        caseNumber?: string;
        investigationDossierNumber?: string;
        baseRegisterNumberAndDate?: string;
        investigationCourtName?: string;
        courtName?: string;
    };
    basics?: { stage?: string };
};

/** يكتشف معرّفات داخلية (UUID / createId) — لا تُعرض للمستخدم. */
export function isInternalCaseIdentifier(value: string): boolean {
    const s = String(value ?? '').trim();
    if (!s) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return true;
    if (/^\d+_\d+[a-z0-9]+$/i.test(s)) return true;
    if (/^[0-9a-f]{8,}$/i.test(s) && !s.includes('/')) return true;
    return false;
}

/** يميّز رقم إضبارة/قضية حقيقي عن نص اختبار عشوائي في حقل الرقم. */
export function looksLikeRealCaseReference(value: string): boolean {
    const s = String(value ?? '').trim();
    if (!s) return false;
    if (isInternalCaseIdentifier(s)) return false;
    if (/\d/.test(s)) return true;
    if (/[\/\\–—]/.test(s)) return true;
    // نص عربي/لاتيني بلا أرقام ولا فواصل مرجعية — إدخال عشوائي (مثل ىرلاىرلاى)
    if (/^[\u0600-\u06FFa-zA-Z\s.,،]+$/u.test(s)) return false;
    return s.length >= 16;
}

/** يُعيد المرجع إن كان حقيقياً، وإلا سلسلة فارغة (للعرض والتخزين). */
export function sanitizeCaseReferenceField(value: string | undefined): string {
    const s = String(value ?? '').trim();
    return looksLikeRealCaseReference(s) ? s : '';
}

/** رقم الإضبارة الرسمي فقط — بلا UUID ولا معرّفات داخلية. */
export function resolveOfficialCaseNumber(c: CriminalCaseReferenceInput | undefined): string {
    if (!c) return '—';
    const caseNumber = String(c.location?.caseNumber ?? '').trim();
    if (caseNumber && looksLikeRealCaseReference(caseNumber)) return caseNumber;
    const register = String(c.location?.baseRegisterNumberAndDate ?? '').trim();
    if (register && looksLikeRealCaseReference(register)) return register;
    return '—';
}

/** تسمية عرض للإضبارة — رقم رسمي أو محكمة/مرحلة (بلا UUID ولا معرّفات داخلية). */
export function resolveCriminalCaseDisplayLabel(c: CriminalCaseReferenceInput | undefined): string {
    if (!c) return '—';
    const candidates = [
        String(c.location?.caseNumber ?? '').trim(),
        String(c.location?.investigationDossierNumber ?? '').trim(),
        String(c.location?.baseRegisterNumberAndDate ?? '').trim(),
    ];
    for (const raw of candidates) {
        if (looksLikeRealCaseReference(raw)) return raw;
    }
    const court = String(c.location?.investigationCourtName ?? c.location?.courtName ?? '').trim();
    const stage = formatCriminalStageLabel(String(c.basics?.stage ?? '').trim());
    if (court && stage) return `${court} — ${stage}`;
    if (court) return court;
    if (stage) return stage;
    return 'إضبارة تحقيق';
}
