import type { CriminalComplainant, CriminalDefendant } from './criminalStore';

/**
 * تفريق/شطب الإضبارة — يُتاح فقط عند تعدد الأطراف:
 * أكثر من متهم، أو أكثر من مشتكي، أو كلاهما.
 */
export function caseAllowsSeveranceOrDossierStrike(
    complainants: CriminalComplainant[] | undefined,
    defendants: CriminalDefendant[] | undefined,
): boolean {
    const complainantCount = Array.isArray(complainants) ? complainants.length : 0;
    const defendantCount = Array.isArray(defendants) ? defendants.length : 0;
    return complainantCount > 1 || defendantCount > 1;
}

/** متهمون قابلون للاختيار في مودال التفريق (غير مقفلين وغير مغلقين تحقيقياً). */
export function countSeveranceSelectableDefendants(
    defendants: CriminalDefendant[] | undefined,
): number {
    return filterSeveranceSelectableDefendants(defendants).length;
}

/** شطر الإضبارة يتطلب متهمين قابلين للتفريق على الأقل — لا يكفي تعدد المشتكين وحده. */
export function caseAllowsDefendantSeverance(defendants: CriminalDefendant[] | undefined): boolean {
    return countSeveranceSelectableDefendants(defendants) >= 2;
}

export function filterSeveranceSelectableDefendants(
    defendants: CriminalDefendant[] | undefined,
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        if ((d as { isPartyRecordLocked?: boolean }).isPartyRecordLocked) return false;
        const status = String(d.investigationStatus ?? '').trim();
        if (status === 'closed_pending' || status === 'closed_final') return false;
        return true;
    });
}

/** تحقق اختيار المتهمين للتفريق (قائمة، يوميات قاضي، التزام). */
export function validateDefendantSeveranceSelection(
    defendants: CriminalDefendant[] | undefined,
    targetIds: string[],
): string | null {
    const selectable = filterSeveranceSelectableDefendants(defendants);
    if (selectable.length < 2) {
        return 'لا يُتاح التفريق إلا عند وجود متهمين اثنين قابلين للتفريق على الأقل في الإضبارة.';
    }
    const selectableIdSet = new Set(selectable.map((d) => d.id));
    const valid = (Array.isArray(targetIds) ? targetIds : [])
        .map((id) => String(id ?? '').trim())
        .filter((id) => id && selectableIdSet.has(id));
    if (!valid.length) {
        return 'حدّد متهماً واحداً على الأقل للتفريق (غير مقفل أو مغلق تحقيقياً).';
    }
    if (valid.length >= selectable.length) {
        return 'لا يمكن شطر كل المتهمين — يجب أن يبقى متهم واحد على الأقل في الإضبارة الأم.';
    }
    return null;
}

export function validateSeveranceOrDossierStrikePartyRule(
    complainants: CriminalComplainant[] | undefined,
    defendants: CriminalDefendant[] | undefined,
): string | null {
    if (!caseAllowsSeveranceOrDossierStrike(complainants, defendants)) {
        return 'لا يُتاح التفريق أو شطب الإضبارة إلا عند وجود أكثر من متهم أو أكثر من مشتكي في الإضبارة.';
    }
    return null;
}
