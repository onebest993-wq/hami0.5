// @ts-nocheck
import type { CriminalComplainant, CriminalDefendant } from './criminalStore';
import type { CriminalActionParty } from './criminalStageUtils';
import { displayPartyNameForCase } from './criminalStageUtils';
import { resolveDefendantFullName } from './criminalUnknownDefendant';

export type PartyLifeInput = {
    status?: string;
    personalStage?: string;
};

/** طرف متوفى — لا يُستخدم في إجراءات تتطلب شخصاً حياً. */
export function isPartyDeceased(party: PartyLifeInput): boolean {
    const status = String(party.status ?? '').trim().toLowerCase();
    const ps = String(party.personalStage ?? '').trim();
    if (status === 'متوفى' || status === 'deceased') return true;
    if (ps === 'lawsuit_dropped_death' || ps === 'dropped_death') return true;
    return false;
}

export function buildAllParties(
    complainants: CriminalComplainant[],
    defendants: CriminalDefendant[],
    ctx?: { isMutualComplaint?: boolean },
): CriminalActionParty[] {
    /**
     * 🔖 الكيس يُعتبَر «شكوى متقابلة» إن كان:
     *    - isMutualComplaint=true على مستوى الكيس، أو
     *    - أيّ مشتكٍ يَحمل isCrossComplaint=true.
     *    عندئذٍ نُعَلِّم كل الأطراف بـ inMutualComplaint لاستخدام البادئة الموحَّدة
     *    «الطرف:» بدلاً من «مشتكي:/متهم:» التي تَخلق تَناقضاً مع ازدواجية الصفة.
     */
    const caseDual = ctx?.isMutualComplaint === true;
    const anyCross =
        caseDual ||
        complainants.some(
            (c) => (c as { isCrossComplaint?: boolean }).isCrossComplaint === true,
        );
    return [
        ...complainants.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            isJuvenile: c.isJuvenile,
            isUnderSeven: (c as any).isUnderSeven,
            source: 'complainant' as const,
            isDeceased: isPartyDeceased(c),
            inMutualComplaint: anyCross,
            isAccusedAsComplainant:
                caseDual || (c as { isCrossComplaint?: boolean }).isCrossComplaint === true,
        })),
        ...defendants.map((d) => ({
            id: d.id,
            fullName: resolveDefendantFullName(d) || String(d.fullName ?? '').trim(),
            isJuvenile: Boolean(d.isJuvenile),
            isUnderSeven: (d as any).isUnderSeven,
            source: 'defendant' as const,
            isDeceased: isPartyDeceased(d),
            inMutualComplaint: anyCross,
        })),
    ];
}

/** أحياء فقط — مودالات الإفادات والطلبات والإجراءات الحية. */
export function getActiveParties(parties: CriminalActionParty[]): CriminalActionParty[] {
    return parties.filter((p) => !p.isDeceased);
}

export function buildActiveParties(
    complainants: CriminalComplainant[],
    defendants: CriminalDefendant[],
    ctx?: { isMutualComplaint?: boolean },
): CriminalActionParty[] {
    return getActiveParties(buildAllParties(complainants, defendants, ctx));
}

export type ConcernedPartyLabelOptions = {
    /** في خزانة الأدلة — إظهار شارة المتوفى بجانب الاسم. */
    showDeceasedBadge?: boolean;
    /** إضبارة سرية — يُرمَّز اسم الحدث للعرض/التصدير. */
    anonymizeJuvenileNames?: boolean;
};

export function formatConcernedPartyLabelWithContext(
    party: CriminalActionParty,
    opts?: ConcernedPartyLabelOptions,
): string {
    const name = displayPartyNameForCase(String(party.fullName ?? '').trim() || '—', {
        isJuvenile: Boolean(party.isJuvenile),
        isConfidential: opts?.anonymizeJuvenileNames === true,
        forExportOrPrint: opts?.anonymizeJuvenileNames === true,
    });
    // 🔖 في الشكوى المتقابلة نَستخدم بادئة موحَّدة «الطرف:» لمنع التَناقض في الواجهة.
    const base = party.inMutualComplaint
        ? `${party.isUnderSeven ? 'الطرف-صغير' : party.isJuvenile ? 'الطرف-حدث' : 'الطرف'}: ${name}`
        : party.source === 'complainant'
          ? `${party.isUnderSeven ? 'مشتكي/مجني عليه-صغير' : party.isJuvenile ? 'مشتكي/مجني عليه-حدث' : 'مشتكي'}: ${name}`
          : `${party.isUnderSeven ? 'مشكو منه/متهم-صغير' : party.isJuvenile ? 'مشكو منه/متهم-حدث' : 'متهم'}: ${name}`;
    if (opts?.showDeceasedBadge && party.isDeceased) {
        return `${base} - [متوفى 💀]`;
    }
    return base;
}
