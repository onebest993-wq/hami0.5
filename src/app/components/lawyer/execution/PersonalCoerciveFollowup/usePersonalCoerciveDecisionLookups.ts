import {
    getGoverningDossierPresentationRow,
    getGoverningPersonalCoerciveSubtypeRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorDecisionReadQueries';
import { isGuarantorRequestDecisionRow, type PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';

export interface UsePersonalCoerciveDecisionLookupsOptions {
    exId: string;
    exKey: string | undefined;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    detentionJudgeEligibleDecisionId: string | null | undefined;
    allDecisionRows: Record<string, unknown>[];
}

/**
 * استعلامات قراءة قرارات المنفذ الحاكمة لكل نوع طلب إكراهي — تُستخدم كمصدر واحد
 * لتحديد رقم/صف القرار المرتبط دون تكرار منطق البحث في كل مكان.
 */
export function usePersonalCoerciveDecisionLookups({
    exId,
    exKey,
    activeDebtorKey,
    primaryDebtorKey,
    detentionJudgeEligibleDecisionId,
    allDecisionRows,
}: UsePersonalCoerciveDecisionLookupsOptions) {
    const findLatestDecisionIdForSubtype = (subtype: PersonalCoerciveSubtype): string | null => {
        const hit = getGoverningPersonalCoerciveSubtypeRow(exKey, subtype, {
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        return id || null;
    };

    const findLatestDecisionRowForSubtype = (subtype: PersonalCoerciveSubtype) =>
        getGoverningPersonalCoerciveSubtypeRow(exKey, subtype, {
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });

    const findGoverningDossierDecisionId = (): string | null => {
        const hit = getGoverningDossierPresentationRow(exKey, {
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        const eligible = String(detentionJudgeEligibleDecisionId ?? '').trim();
        return id || eligible || null;
    };

    const findLatestGuarantorDecisionId = (): string | null => {
        if (!exId) return null;
        const rows = readExecutorDecisionsArray(exId);
        const hit = rows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        return id || null;
    };

    const findLatestGuarantorDecisionRow = (): Record<string, unknown> | null => {
        if (!exId) return null;
        const hit = allDecisionRows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        return (hit as Record<string, unknown> | undefined) ?? null;
    };

    return {
        findLatestDecisionIdForSubtype,
        findLatestDecisionRowForSubtype,
        findGoverningDossierDecisionId,
        findLatestGuarantorDecisionId,
        findLatestGuarantorDecisionRow,
    };
}
