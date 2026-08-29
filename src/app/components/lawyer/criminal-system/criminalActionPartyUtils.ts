import type { CriminalLawyerRole } from './criminalCaseModel';
import type { OurRepresentation } from './criminalProceduralPartyUtils';

export function legacyRoleFromRepresentation(rep: OurRepresentation | ''): CriminalLawyerRole | '' {
    if (rep === 'defendant_side') return 'وكيل المشكو منه';
    if (rep === 'complainant_side') return 'وكيل المشتكي';
    return '';
}

export type CriminalActionParty = {
    id: string;
    fullName: string;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    source: 'complainant' | 'defendant';
    /** متوفى — يُستبعد من القوائم الإجرائية الحية. */
    isDeceased?: boolean;
    /**
     * ⚖️ ازدواجية الصفة — هذا الطرف داخل دعوى متقابلة (إمّا case-level
     * isMutualComplaint=true، أو complainant ذو isCrossComplaint=true). يَستخدمه
     * المُنسِّق الموحّد لاستبدال «مشتكي:/متهم:» ببادئة موحَّدة تَمنع التَناقض في الواجهة.
     */
    inMutualComplaint?: boolean;
    /** مشتكٍ يُعامَل كمتهم (شكوى متقابلة على مستوى الكيس أو isCrossComplaint شخصياً). */
    isAccusedAsComplainant?: boolean;
};

/**
 * 🔖 بادئة الصفة الموحَّدة:
 *  - إن كان الطرف داخل شكوى متقابلة (ازدواجية صفة) → بادئة مُحايدة «الطرف:» لمَنع
 *    التَناقض البصري في القوائم (إذ تتداخل صفة المشتكي والمتهم على نفس الشخص).
 *  - وإلا → نَستخدم البادئة الكلاسيكية «مشتكي:» أو «متهم:».
 */
/** ترميز اسم الحدث إلى الأحرف الأولى (مثل: أ. م. ع). */
export function anonymizeJuvenilePartyName(fullName: string): string {
    const parts = String(fullName ?? '')
        .trim()
        .split(/\s+/)
        .filter((p) => p.length > 0);
    if (!parts.length) return '—';
    return parts.map((p) => `${p.charAt(0)}.`).join(' ');
}

export function displayPartyNameForCase(
    fullName: string,
    options: { isJuvenile?: boolean; isConfidential?: boolean; forExportOrPrint?: boolean },
): string {
    const raw = String(fullName ?? '').trim() || '—';
    if (raw.startsWith('مشكو منه مجهول') || raw.startsWith('حدث مجهول')) return raw;
    if (!options.isJuvenile) return raw;
    if (options.isConfidential || options.forExportOrPrint) {
        return anonymizeJuvenilePartyName(raw);
    }
    return raw;
}

export function formatConcernedPartyLabel(
    party: CriminalActionParty,
    opts?: { anonymizeJuvenile?: boolean },
): string {
    const name = displayPartyNameForCase(String(party.fullName ?? '').trim() || '—', {
        isJuvenile: Boolean(party.isJuvenile),
        isConfidential: opts?.anonymizeJuvenile === true,
        forExportOrPrint: opts?.anonymizeJuvenile === true,
    });
    if (party.inMutualComplaint) {
        const prefix = party.isUnderSeven ? 'الطرف-صغير' : party.isJuvenile ? 'الطرف-حدث' : 'الطرف';
        return `${prefix}: ${name}`;
    }
    if (party.source === 'complainant') {
        if (party.isUnderSeven) return `مشتكي/مجني عليه-صغير: ${name}`;
        return party.isJuvenile ? `مشتكي/مجني عليه-حدث: ${name}` : `مشتكي: ${name}`;
    }
    if (party.isUnderSeven) return `مشكو منه/متهم-صغير: ${name}`;
    return party.isJuvenile ? `مشكو منه/متهم-حدث: ${name}` : `متهم: ${name}`;
}

/** تسمية عرض حالة طلب المحامي (القيم المخزنة pending | approved | rejected). */
export function formatLawyerRequestStatusLabel(status: 'pending' | 'approved' | 'rejected' | 'executed'): string {
    if (status === 'executed') return 'قرار نافذ / مُنفَّذ';
    if (status === 'approved') return 'تم القبول (موافقة)';
    if (status === 'rejected') return 'تم الرفض';
    return 'قيد النظر';
}

export type InvestigationLogStatus = 'awaiting_response' | 'response_received' | 'returned_for_revision';

/** تسمية عرض حالة إجراء المتابعة/الدليل. */
export function formatInvestigationLogStatusLabel(status: InvestigationLogStatus): string {
    if (status === 'response_received') return 'ورد التقرير / الجواب';
    if (status === 'returned_for_revision') return 'أُعيد للتعديل';
    return 'بانتظار الإجابة';
}

export function normalizeInvestigationLogStatus(raw: unknown): InvestigationLogStatus {
    const v = String(raw ?? '').trim();
    if (v === 'response_received' || v === 'completed' || v === 'مُنجز' || v.includes('ورد')) return 'response_received';
    if (v === 'returned_for_revision' || v.includes('أُعيد') || v.includes('اعيد')) return 'returned_for_revision';
    if (v === 'awaiting_response' || v === 'pending' || v.includes('انتظار') || v.includes('النظر')) return 'awaiting_response';
    return 'awaiting_response';
}

/** قائمة الأطراف المستهدفة بالإجراءات (توقيف/كفالة/إفادات…) — مدمجة عند الشكوى المتقابلة. */
export function buildCriminalActionParties(
    complainants: Array<{
        id: string;
        fullName: string;
        isJuvenile?: boolean;
        isUnderSeven?: boolean;
        isCrossComplaint?: boolean;
    }>,
    defendants: Array<{ id: string; fullName: string; isJuvenile?: boolean; isUnderSeven?: boolean }>,
    isMutualComplaint: boolean,
): CriminalActionParty[] {
    // ⚖️ المعيار الموحَّد للشكوى المتقابلة: case-level OR per-complainant flag.
    //    أي مشتكٍ يحمل `isCrossComplaint=true` يُعامَل كمتهم حتى لو لم يَكن الكيس بأكمله متقابلاً.
    const accusedComplainants = complainants.filter(
        (c) => isMutualComplaint || c.isCrossComplaint === true,
    );
    /**
     * 🏷️ علم `inMutualComplaint` يُوضَع على كل طرف في الكيس عندما تَكون الشكوى متقابلة
     *    على مستوى الكيس (isMutualComplaint=true)، أو يَحمل المُشتكي شخصياً علم
     *    isCrossComplaint=true — هذا يُتيح للمُنسِّق استبدال «مشتكي:/متهم:» ببادئة موحَّدة.
     */
    const partiesAreDual = isMutualComplaint || accusedComplainants.length > 0;
    if (accusedComplainants.length === 0) {
        return defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            inMutualComplaint: partiesAreDual,
        }));
    }
    return [
        ...accusedComplainants.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            isJuvenile: c.isJuvenile,
            isUnderSeven: c.isUnderSeven,
            source: 'complainant' as const,
            inMutualComplaint: true,
            isAccusedAsComplainant: true,
        })),
        ...defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            inMutualComplaint: true,
        })),
    ];
}

/**
 * هل هذا المشتكي يَكتسب صفة المتهم؟
 *  - إذا كان `caseRecord.isMutualComplaint === true` (شكوى متقابلة على مستوى الكيس)، فكل المشتكين متّهمون.
 *  - أو إذا كان `complainant.isCrossComplaint === true` (تخصيص لمشتكٍ بعينه).
 */
export function isComplainantAlsoAccused(
    complainant: { isCrossComplaint?: boolean },
    caseRecord: { isMutualComplaint?: boolean },
): boolean {
    return complainant.isCrossComplaint === true || caseRecord.isMutualComplaint === true;
}
