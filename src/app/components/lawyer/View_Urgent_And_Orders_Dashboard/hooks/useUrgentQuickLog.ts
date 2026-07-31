import { useCallback, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import {
    type UrgentCase,
    type UrgentCaseStatus,
    computeUrgentCaseStatus,
} from '../../Component_Urgent_Card';

export type UrgentQuickLogAction = 'notification' | 'grievance' | 'cassation';

export type UrgentQuickLogModalState = {
    isOpen: boolean;
    actionType: UrgentQuickLogAction;
    caseId: string;
    caseName: string;
};

type QuickLogSubmitPayload = {
    result?: string;
};

export function useUrgentQuickLog(
    cases: UrgentCase[],
    setCases: Dispatch<SetStateAction<UrgentCase[]>>,
    pendingCasesPersistRef: MutableRefObject<boolean>,
) {
    const [quickLogModal, setQuickLogModal] = useState<UrgentQuickLogModalState>({
        isOpen: false,
        actionType: 'notification',
        caseId: '',
        caseName: '',
    });

    const handleQuickAction = useCallback(
        (actionType: UrgentQuickLogAction, caseId: string) => {
            const caseData = cases.find((c) => c.id === caseId);
            if (!caseData) return;

            setQuickLogModal({
                isOpen: true,
                actionType,
                caseId,
                caseName: `${caseData.actionType} - ${caseData.applicantName}`,
            });
        },
        [cases],
    );

    const closeQuickLogModal = useCallback(() => {
        setQuickLogModal((prev) => ({ ...prev, isOpen: false }));
    }, []);

    const handleQuickLogSubmit = useCallback(
        (data: QuickLogSubmitPayload) => {
            setCases((prev) => {
                const next: UrgentCase[] = prev.map((c): UrgentCase => {
                    if (c.id !== quickLogModal.caseId) return c;
                    if (quickLogModal.actionType === 'notification') {
                        const updated: UrgentCase = { ...c, isNotificationConfirmed: true };
                        return { ...updated, status: computeUrgentCaseStatus(updated) };
                    }
                    if (quickLogModal.actionType === 'grievance') {
                        const updated: UrgentCase = {
                            ...c,
                            phase: 'cassation_window',
                            grievanceResult: data.result as UrgentCase['grievanceResult'],
                        };
                        return { ...updated, status: computeUrgentCaseStatus(updated) };
                    }
                    if (quickLogModal.actionType === 'cassation') {
                        return { ...c, phase: 'completed', status: 'completed' as UrgentCaseStatus };
                    }
                    return c;
                });
                pendingCasesPersistRef.current = true;
                return next;
            });
            closeQuickLogModal();
        },
        [closeQuickLogModal, pendingCasesPersistRef, quickLogModal.actionType, quickLogModal.caseId, setCases],
    );

    return {
        quickLogModal,
        handleQuickAction,
        closeQuickLogModal,
        handleQuickLogSubmit,
    };
}
