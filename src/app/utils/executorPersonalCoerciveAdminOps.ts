import { isExecutorHubRowSuperseded } from '@/app/utils/executorRequestGoverningSelectors';
import { isGuarantorRequestDecisionRow } from '@/app/utils/executorDecisionSelectors';

type ExecutorAdminRow = Record<string, unknown>;

function asTrimmed(value: unknown): string {
    return String(value ?? '').trim();
}

function isExecutiveDossierPresentationSubtypeLocal(
    subtype: string | null | undefined,
): boolean {
    const value = asTrimmed(subtype);
    return value === 'executive_dossier_presentation' || value === 'executive_detention';
}

function rowMatchesDebtorScope(
    row: ExecutorAdminRow,
    debtorKey?: string,
    primaryDebtorKey?: string,
): boolean {
    const targetDebtorKey = asTrimmed(debtorKey);
    if (!targetDebtorKey) return true;
    const rowDebtorKey = asTrimmed(row.personalCoerciveDebtorKey);
    if (rowDebtorKey) return rowDebtorKey === targetDebtorKey;
    return Boolean(asTrimmed(primaryDebtorKey)) && targetDebtorKey === asTrimmed(primaryDebtorKey);
}

export function appendExecutiveDetentionJudgeDecisionRows(input: {
    rows: ExecutorAdminRow[];
    parentExecutorDecisionId: string;
    outcome: 'approved' | 'rejected';
    rejectionReason?: string;
    debtorKey?: string;
    todayYmd: string;
    nowIso: string;
    decisionId: string;
}): { rows: ExecutorAdminRow[]; ok: boolean; decisionId?: string } {
    const parentId = asTrimmed(input.parentExecutorDecisionId);
    if (!parentId) return { rows: input.rows, ok: false };

    let rows = input.rows.map((row) => {
        if (asTrimmed(row.personalCoerciveSubtype) !== 'executive_detention_judge') return row;
        if (asTrimmed(row.parentExecutorDecisionId) !== parentId) return row;
        if (isExecutorHubRowSuperseded(row)) return row;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: input.nowIso,
            isArchived: true,
        };
    });

    const existing = rows.find(
        (row) =>
            asTrimmed(row.personalCoerciveSubtype) === 'executive_detention_judge' &&
            asTrimmed(row.parentExecutorDecisionId) === parentId &&
            !isExecutorHubRowSuperseded(row),
    ) as { id?: string } | undefined;
    if (existing) {
        return { rows, ok: true, decisionId: asTrimmed(existing.id) || undefined };
    }

    const outcome = input.outcome;
    const reason = asTrimmed(input.rejectionReason);
    const row = {
        id: input.decisionId,
        title:
            outcome === 'approved'
                ? 'قرار قاضي البداءة — الموافقة على حبس المدين'
                : 'قرار قاضي البداءة — رفض حبس المدين',
        body:
            outcome === 'rejected' && reason
                ? `سبب الرفض: ${reason}`
                : outcome === 'approved'
                  ? 'وافق قاضي البداءة على حبس المدين التنفيذي بعد عرض الإضبارة.'
                  : 'رفض قاضي البداءة طلب حبس المدين التنفيذي.',
        date: input.todayYmd,
        resolvedAt: input.nowIso,
        appealStatus: 'pending' as const,
        executorOutcome: outcome,
        status: outcome === 'approved' ? 'accepted' : 'rejected',
        requestKind: 'personal_coercive' as const,
        personalCoerciveSubtype: 'executive_detention_judge' as const,
        parentExecutorDecisionId: parentId,
        appealRequestOrigin: 'creditor_side' as const,
        appealBaseBranch: outcome === 'approved' ? 'after_approval' : 'after_rejection',
        cassationOnlyAppeal: true,
        executiveDetentionJudgeOutcome: outcome,
        appealPhase: null,
        grievanceRejectedAwaitingTamyeez: false,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        noAppealChosen: false,
        ...(asTrimmed(input.debtorKey)
            ? { personalCoerciveDebtorKey: asTrimmed(input.debtorKey) }
            : {}),
    };

    rows = [row, ...rows];
    return { rows, ok: true, decisionId: input.decisionId };
}

export function archiveExecutiveDetentionCycleDecisionRows(input: {
    rows: ExecutorAdminRow[];
    debtorKey?: string;
    primaryDebtorKey?: string;
    nowIso: string;
}): ExecutorAdminRow[] {
    return input.rows.map((row) => {
        if (asTrimmed(row.requestKind) !== 'personal_coercive') return row;
        if (!rowMatchesDebtorScope(row, input.debtorKey, input.primaryDebtorKey)) return row;
        const subtype = asTrimmed(row.personalCoerciveSubtype);
        if (!isExecutiveDossierPresentationSubtypeLocal(subtype) && subtype !== 'executive_detention_judge') {
            return row;
        }
        if (isExecutorHubRowSuperseded(row)) return row;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: input.nowIso,
            isArchived: true,
        };
    });
}

export function supersedeGuarantorRequestDecisionRows(input: {
    rows: ExecutorAdminRow[];
    nowIso: string;
}): { rows: ExecutorAdminRow[]; count: number } {
    let count = 0;
    const rows = input.rows.map((row) => {
        if (!isGuarantorRequestDecisionRow(row)) return row;
        if (isExecutorHubRowSuperseded(row)) return row;
        count += 1;
        return {
            ...row,
            requestCycleSuperseded: true,
            requestCycleSupersededAt: input.nowIso,
            isArchived: true,
        };
    });
    return { rows, count };
}
