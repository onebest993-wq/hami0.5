import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

export function coerciveOutcomeFromDecisionRow(row: Record<string, unknown> | null | undefined): {
    pending: boolean;
    approved: boolean;
    rejected: boolean;
    alternative: boolean;
} {
    const last = row ?? null;
    if (!last) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    if ((last as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    const out = String((last as { executorOutcome?: string }).executorOutcome || 'pending');
    if (out === 'withdrawn') {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    if (out === 'pending') {
        return { pending: true, approved: false, rejected: false, alternative: false };
    }
    if (out === 'alternative') {
        return { pending: false, approved: false, rejected: false, alternative: true };
    }
    if (isExecutorRowEffectivelyApproved(last)) {
        return { pending: false, approved: true, rejected: false, alternative: false };
    }
    if (isExecutorRowRejectedAndFinal(last)) {
        return { pending: false, approved: false, rejected: true, alternative: false };
    }
    return { pending: false, approved: false, rejected: false, alternative: false };
}
