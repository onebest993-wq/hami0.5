import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { formatStoredAmountForInput } from '@/app/utils/execution/amountInput';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

export type UseExecutionGuarantorDetailsModalParams = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
};

export function useExecutionGuarantorDetailsModal({
    executionData,
    executionId,
}: UseExecutionGuarantorDetailsModalParams) {
    const [showGuarantorDetailsModal, setShowGuarantorDetailsModal] = useState(false);
    const [guarantorDetailsDecisionId, setGuarantorDetailsDecisionId] = useState<string | null>(null);
    const [guarantorNameDraft, setGuarantorNameDraft] = useState('');
    const [guarantorWorkplaceDraft, setGuarantorWorkplaceDraft] = useState('');
    const [guarantorSalaryDraft, setGuarantorSalaryDraft] = useState('');
    const [guarantorDeductionDraft, setGuarantorDeductionDraft] = useState('');
    const guarantorAutoOpenStampRef = useRef(0);

    const openGuarantorDetailsModal = useCallback(
        (decisionId?: string) => {
            const exId = String(executionData?.id ?? executionId ?? '').trim();
            const did = String(decisionId ?? '').trim();
            if (did) {
                setGuarantorDetailsDecisionId(did);
            } else if (exId) {
                const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
                const candidates = rows.filter(
                    (r) =>
                        String(r.requestKind || '') === 'guarantor_request' &&
                        (String((r as { executorOutcome?: string }).executorOutcome || '') === 'approved' ||
                            String((r as { executorOutcome?: string }).executorOutcome || '') ===
                                'alternative') &&
                        !Boolean(String((r as { guarantorDetailsSavedAt?: string }).guarantorDetailsSavedAt || '').trim()),
                );
                if (candidates.length > 0) {
                    const best = candidates.reduce((acc, cur) => {
                        const a = String((acc as { resolvedAt?: string; date?: string }).resolvedAt ?? (acc as { date?: string }).date ?? '');
                        const b = String((cur as { resolvedAt?: string; date?: string }).resolvedAt ?? (cur as { date?: string }).date ?? '');
                        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
                    }, candidates[0]);
                    const bestId = String((best as { id?: string }).id || '').trim();
                    if (bestId) setGuarantorDetailsDecisionId(bestId);
                }
            }
            const gf = executionData?.guarantor_followup;
            setGuarantorNameDraft(String(gf?.guarantor_name ?? '').trim());
            setGuarantorWorkplaceDraft(String(gf?.guarantor_workplace ?? '').trim());
            setGuarantorSalaryDraft(formatStoredAmountForInput(gf?.guarantor_salary_iqd));
            setGuarantorDeductionDraft(formatStoredAmountForInput(gf?.guarantor_deduction_iqd));
            setShowGuarantorDetailsModal(true);
        },
        [executionData?.guarantor_followup, executionData?.id, executionId],
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            const nowMs = Date.now();
            if (nowMs - guarantorAutoOpenStampRef.current > 1200) {
                guarantorAutoOpenStampRef.current = nowMs;
                const did = String(ce.detail?.decisionId || '').trim();
                if (did) setGuarantorDetailsDecisionId(did);
                openGuarantorDetailsModal();
            }
        };
        window.addEventListener('hami-open-guarantor-details', handler as EventListener);
        return () =>
            window.removeEventListener('hami-open-guarantor-details', handler as EventListener);
    }, [executionData?.id, executionId, openGuarantorDetailsModal]);

    return {
        showGuarantorDetailsModal,
        setShowGuarantorDetailsModal,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
        guarantorNameDraft,
        setGuarantorNameDraft,
        guarantorWorkplaceDraft,
        setGuarantorWorkplaceDraft,
        guarantorSalaryDraft,
        setGuarantorSalaryDraft,
        guarantorDeductionDraft,
        setGuarantorDeductionDraft,
        openGuarantorDetailsModal,
    };
}
