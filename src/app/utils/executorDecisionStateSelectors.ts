import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    latestExecutorDecisionRow,
    type ExecutorDecisionRowLite,
} from '@/app/utils/executorDecisionSelectors';

export type ExecutorOutcomeFlags = {
    pending: boolean;
    approved: boolean;
    rejected: boolean;
    alternative: boolean;
};

export type UnifiedCollectionDecisionState = 'none' | 'pending' | 'approved' | 'rejected';

type ExecutorDecisionStateRow = ExecutorDecisionRowLite & {
    executorOutcome?: string;
    requestKind?: string;
    lawyerWithdrawn?: boolean;
};

type GuarantorFollowupSnapshot = {
    executor_approved?: boolean;
    details_saved?: boolean;
    guarantee_type?: string | null;
    guarantor_name?: string;
    guarantor_workplace?: string;
    guarantor_salary_iqd?: number | null;
    guarantor_deduction_iqd?: number | null;
    creditor_notation_registered?: boolean;
};

type GuarantorPartySnapshot = {
    hasGuarantor?: boolean;
    guarantorExecutionNotation?: boolean;
    [key: string]: unknown;
};

export type GuarantorApprovalMergeExecutionData = {
    guarantor_followup?: GuarantorFollowupSnapshot;
    debtors?: GuarantorPartySnapshot[];
    creditors?: GuarantorPartySnapshot[];
};

function emptyOutcomeFlags(): ExecutorOutcomeFlags {
    return {
        pending: false,
        approved: false,
        rejected: false,
        alternative: false,
    };
}

export function resolveExecutorOutcomeFlags(
    row: ExecutorDecisionStateRow | null | undefined,
): ExecutorOutcomeFlags {
    if (!row) return emptyOutcomeFlags();
    if (row.lawyerWithdrawn === true) return emptyOutcomeFlags();

    const outcome = String(row.executorOutcome ?? 'pending').trim();
    if (outcome === 'withdrawn') return emptyOutcomeFlags();
    if (outcome === 'pending' || outcome === '') {
        return { pending: true, approved: false, rejected: false, alternative: false };
    }
    if (outcome === 'alternative') {
        return { pending: false, approved: false, rejected: false, alternative: true };
    }
    if (isExecutorRowEffectivelyApproved(row)) {
        return { pending: false, approved: true, rejected: false, alternative: false };
    }
    if (isExecutorRowRejectedAndFinal(row)) {
        return { pending: false, approved: false, rejected: true, alternative: false };
    }
    return emptyOutcomeFlags();
}

export function getGuarantorRequestOutcomeFromRows(
    rows: ExecutorDecisionStateRow[],
): ExecutorOutcomeFlags {
    return resolveExecutorOutcomeFlags(
        latestExecutorDecisionRow(rows.filter((row) => isGuarantorRequestDecisionRow(row))),
    );
}

export function hasApprovedRequestKindFromRows(
    rows: ExecutorDecisionStateRow[],
    requestKind: string,
): boolean {
    const kind = String(requestKind || '').trim();
    if (!kind) return false;
    return rows.some(
        (row) =>
            String(row.requestKind || '').trim() === kind && isExecutorRowEffectivelyApproved(row),
    );
}

export function getLatestRequestKindDecisionStateFromRows(
    rows: ExecutorDecisionStateRow[],
    requestKind: string,
): UnifiedCollectionDecisionState {
    const kind = String(requestKind || '').trim();
    if (!kind) return 'none';
    const row = latestExecutorDecisionRow(
        rows.filter((entry) => String(entry.requestKind || '').trim() === kind),
    );
    if (!row) return 'none';
    if (isExecutorRowEffectivelyApproved(row)) return 'approved';
    if (isExecutorRowRejectedAndFinal(row)) return 'rejected';
    return 'pending';
}

export function computeGuarantorApprovalMergePatchFromRows(
    decisions: ExecutorDecisionStateRow[],
    executionData: GuarantorApprovalMergeExecutionData | null | undefined,
): Record<string, unknown> {
    const data = executionData;
    if (!data) return {};

    const guarantorFollowup = data.guarantor_followup;
    if (guarantorFollowup?.executor_approved === true) return {};

    const approvedRow = latestExecutorDecisionRow(
        decisions.filter((row) => {
            if (!isGuarantorRequestDecisionRow(row)) return false;
            const outcome = String(row.executorOutcome ?? '').trim();
            return outcome === 'alternative' || isExecutorRowEffectivelyApproved(row);
        }),
    );
    if (!approvedRow) return {};

    const merge: Record<string, unknown> = {
        hasGuarantor: true,
        guarantor_followup: {
            executor_approved: true,
            channel: 'financial',
            details_saved: guarantorFollowup?.details_saved === true,
            guarantee_type: guarantorFollowup?.guarantee_type ?? 'amount',
            guarantor_name: guarantorFollowup?.guarantor_name,
            guarantor_workplace: guarantorFollowup?.guarantor_workplace,
            guarantor_salary_iqd: guarantorFollowup?.guarantor_salary_iqd ?? null,
            guarantor_deduction_iqd: guarantorFollowup?.guarantor_deduction_iqd ?? null,
            creditor_notation_registered:
                guarantorFollowup?.creditor_notation_registered === true,
        },
    };

    if (Array.isArray(data.debtors) && data.debtors.length > 0 && data.debtors[0]) {
        merge.debtors = [{ ...data.debtors[0], hasGuarantor: true }, ...data.debtors.slice(1)];
    }
    if (Array.isArray(data.creditors) && data.creditors.length > 0 && data.creditors[0]) {
        merge.creditors = [
            { ...data.creditors[0], guarantorExecutionNotation: true },
            ...data.creditors.slice(1),
        ];
    }

    return merge;
}
