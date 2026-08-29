import type { CriminalCase, CriminalComplainant } from './criminalStore';

/** الاسم المعياري لمشتكي الحق العام / الادعاء العام في الإضبارة. */
export const PUBLIC_RIGHT_COMPLAINANT_NAME = 'الحق العام';

function newPartyId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `pp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isPublicRightComplainantName(name: unknown): boolean {
    const n = String(name ?? '').trim();
    return n === PUBLIC_RIGHT_COMPLAINANT_NAME || n === 'الادعاء العام';
}

export function makePublicRightComplainant(): CriminalComplainant {
    return {
        id: newPartyId(),
        fullName: PUBLIC_RIGHT_COMPLAINANT_NAME,
        address: '',
        phone: '',
        isJuvenile: false,
        isUnderSeven: false,
        birthDate: '',
        guardianName: '',
        guardianRelationship: '',
    };
}

/** مشتكون عاديون (غير الحق العام) في الإضبارة. */
function filterPrivateComplainants(complainants: CriminalComplainant[]): CriminalComplainant[] {
    return (Array.isArray(complainants) ? complainants : []).filter(
        (c) => !isPublicRightComplainantName(c.fullName),
    );
}

function caseHasPublicRightComplainant(caseRecord: {
    isPublicProsecutionComplainant?: boolean;
    complainants?: CriminalComplainant[];
}): boolean {
    if (caseRecord.isPublicProsecutionComplainant === true) return true;
    return (Array.isArray(caseRecord.complainants) ? caseRecord.complainants : []).some((c) =>
        isPublicRightComplainantName(c.fullName),
    );
}

/**
 * بعد تنازل جميع المشتكين العاديين — إن كانت المادة تتضمن حقاً عاماً،
 * يُعرض «الحق العام» كمشتكٍ لضمان استمرار الدعوى.
 */
export function resolveEffectiveComplainantsForDisplay(
    caseRecord: CriminalCase,
): CriminalComplainant[] {
    const raw = Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [];
    if (caseRecord.isPublicProsecutionComplainant === true) {
        const existing = raw.find((c) => isPublicRightComplainantName(c.fullName));
        return existing ? [existing] : [makePublicRightComplainant()];
    }
    const privateOnes = filterPrivateComplainants(raw);
    const shouldPromotePublicRight =
        caseRecord.articleIncludesPublicRight === true &&
        caseRecord.isPrivateRightWaived === true;
    if (shouldPromotePublicRight) {
        const existing = raw.find((c) => isPublicRightComplainantName(c.fullName));
        const publicOne = existing ?? makePublicRightComplainant();
        return raw.some((c) => isPublicRightComplainantName(c.fullName))
            ? raw
            : [publicOne, ...privateOnes];
    }
    return raw.length ? raw : privateOnes;
}

/** يُطبَّق عند التنازل عن الحق الشخصي — يُضيف مشتكي الحق العام عند استيفاء الشروط. */
export function applyPublicRightAfterPrivateWaiver(caseRecord: CriminalCase): CriminalCase {
    if (caseRecord.articleIncludesPublicRight !== true) return caseRecord;
    if (caseRecord.isPrivateRightWaived !== true) return caseRecord;
    if (caseHasPublicRightComplainant(caseRecord)) return caseRecord;
    const complainants = Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [];
    return {
        ...caseRecord,
        complainants: [makePublicRightComplainant(), ...complainants],
    };
}
