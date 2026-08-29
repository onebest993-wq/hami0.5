import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase, CriminalStoreState, LawyerRequest, TimelineEvent } from './criminalStore';
import { resolveProceedingsBlockAppealabilityLite } from './criminalRequestsEntryLite';
import type { ProceduralItemLink } from './proceduralItemLink';
import type { ProceduralNavTarget } from './proceduralContainersEngine';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type { CriminalDashboardConfirmAction } from './useCriminalDashboardModalUiState';
import { useCriminalDashboardProceduralData } from './useCriminalDashboardProceduralData';

type UseCriminalDashboardTrashProceduralHandlersParams = {
    id: string;
    criminalCase: CriminalCase;
    editingRequestId: string | null;
    lawyerRequests: LawyerRequest[];
    linkedTimelineFromProcedural: TimelineEvent | null;
    setLinkedTimelineFromProcedural: Dispatch<SetStateAction<TimelineEvent | null>>;
    setProceduralNavTarget: Dispatch<SetStateAction<ProceduralNavTarget | null>>;
    setActiveTab: Dispatch<SetStateAction<CriminalDashboardTab>>;
    isRequestsModalOpen: boolean;
    closeRequestsModal: () => void;
    openRequestViewModal: (request: LawyerRequest) => void;
    confirmAction: CriminalDashboardConfirmAction;
    setConfirmAction: Dispatch<SetStateAction<CriminalDashboardConfirmAction>>;
    moveLawyerRequestToTrash: CriminalStoreState['moveLawyerRequestToTrash'];
    moveJudicialDecisionToTrash: CriminalStoreState['moveJudicialDecisionToTrash'];
    patchJudicialDecisionLifecycle: CriminalStoreState['patchJudicialDecisionLifecycle'];
    reopenClosedCase: CriminalStoreState['reopenClosedCase'];
    reopenCaseReason: string;
    setReopenCaseReason: (value: string) => void;
    setIsReopenCaseOpen: Dispatch<SetStateAction<boolean>>;
    showLegalToast: (message: string, durationMs?: number) => void;
};

/**
 * سلة المهملات (نقل الطلبات/القرارات) + المراجع الإجرائية/التايم-لاين المرتبط + مودال التأكيد
 * العام + إعادة فتح القضية المغلقة + تعديل قابلية الطعن على أمر الحبس — مستخرَجة من الـ runtime
 * دون أي تغيير في المنطق أو الترتيب.
 */
export function useCriminalDashboardTrashProceduralHandlers({
    id,
    criminalCase,
    editingRequestId,
    lawyerRequests,
    linkedTimelineFromProcedural,
    setLinkedTimelineFromProcedural,
    setProceduralNavTarget,
    setActiveTab,
    isRequestsModalOpen,
    closeRequestsModal,
    openRequestViewModal,
    confirmAction,
    setConfirmAction,
    moveLawyerRequestToTrash,
    moveJudicialDecisionToTrash,
    patchJudicialDecisionLifecycle,
    reopenClosedCase,
    reopenCaseReason,
    setReopenCaseReason,
    setIsReopenCaseOpen,
    showLegalToast,
}: UseCriminalDashboardTrashProceduralHandlersParams) {
    const showLegalError = useCallback(
        (message?: string) => {
            showLegalToast(
                message?.trim() ||
                    'تعذّر تنفيذ الإجراء بسبب نقص/تعارض في البيانات. يمكنك المتابعة بالتوثيق وتعديل التفاصيل لاحقاً.',
                4500,
            );
        },
        [showLegalToast],
    );

    const promptMoveToTrash = useCallback(
        (title: string, message: string, onConfirm: () => void) => {
            setConfirmAction({
                title,
                message,
                confirmText: 'نقل للسلة',
                onConfirm,
            });
        },
        [setConfirmAction],
    );

    const handleMoveRequestToTrash = useCallback(
        (request: LawyerRequest) => {
            promptMoveToTrash(
                'نقل إلى سلة المهملات',
                'سيتم إخفاء الطلب/القرار مع إمكانية استرجاعه من سلة المهملات.',
                () => {
                    const err = moveLawyerRequestToTrash(id, request.id);
                    if (err) {
                        showLegalToast(err, 4500);
                        return;
                    }
                    showLegalToast('✓ تم نقل الطلب إلى سلة المهملات.', 3500);
                },
            );
        },
        [id, moveLawyerRequestToTrash, promptMoveToTrash, showLegalToast],
    );

    const handleMoveDecisionToTrash = useCallback(
        (decision: JudicialDecision) => {
            promptMoveToTrash(
                'نقل إلى سلة المهملات',
                'سيتم إخفاء بطاقة القرار مع إمكانية استرجاعها من سلة المهملات.',
                () => {
                    const err = moveJudicialDecisionToTrash(id, decision.id);
                    if (err) {
                        showLegalToast(err, 4500);
                        return;
                    }
                    showLegalToast('✓ تم نقل القرار إلى سلة المهملات.', 3500);
                },
            );
        },
        [id, moveJudicialDecisionToTrash, promptMoveToTrash, showLegalToast],
    );

    const handleRequestOrderProceedingsBlockChange = useCallback(
        (decision: JudicialDecision, blocksProceedings: boolean) => {
            const err = patchJudicialDecisionLifecycle(id, decision.id, {
                decisionAppealability: resolveProceedingsBlockAppealabilityLite(blocksProceedings),
            });
            if (err) {
                showLegalToast(err, 5000);
            }
        },
        [id, patchJudicialDecisionLifecycle, showLegalToast],
    );

    const {
        timelineEvents,
        getProceduralRefsForRequest,
        activeRequestProceduralReferences,
        linkedTimelineProceduralReferences,
    } = useCriminalDashboardProceduralData({
        criminalCase,
        editingRequestId,
        linkedTimelineFromProcedural,
    });

    const navigateToProceduralItem = useCallback(
        (target: ProceduralNavTarget) => {
            setActiveTab('tracking');
            setProceduralNavTarget(target);
            setLinkedTimelineFromProcedural(null);
            if (isRequestsModalOpen) closeRequestsModal();
        },
        [closeRequestsModal, isRequestsModalOpen, setActiveTab, setLinkedTimelineFromProcedural, setProceduralNavTarget],
    );

    const openProceduralLinkedRecord = useCallback(
        (link: ProceduralItemLink) => {
            if (link.kind === 'request') {
                const req = lawyerRequests.find((r) => r.id === link.id);
                if (!req) {
                    showLegalToast('الطلب المرتبط لم يعد موجوداً في القضية.', 4500);
                    return;
                }
                setActiveTab('requests');
                window.setTimeout(() => openRequestViewModal(req), 0);
                return;
            }
            const ev = timelineEvents.find((e) => e.id === link.id);
            if (!ev) {
                showLegalToast('حدث التايم لاين المرتبط غير موجود.', 4500);
                return;
            }
            setLinkedTimelineFromProcedural(ev);
        },
        [lawyerRequests, openRequestViewModal, setActiveTab, setLinkedTimelineFromProcedural, showLegalToast, timelineEvents],
    );

    const closeConfirmAction = useCallback(() => setConfirmAction(null), [setConfirmAction]);
    const runConfirmAction = useCallback(() => {
        const action = confirmAction;
        if (!action) return;
        setConfirmAction(null);
        action.onConfirm();
    }, [confirmAction, setConfirmAction]);

    const openReopenCase = useCallback(() => {
        setReopenCaseReason('');
        setIsReopenCaseOpen(true);
    }, [setIsReopenCaseOpen, setReopenCaseReason]);

    const submitReopenCase = useCallback(() => {
        const reason = reopenCaseReason.trim();
        if (!reason) return;
        reopenClosedCase(id, reason);
        setIsReopenCaseOpen(false);
    }, [id, reopenCaseReason, reopenClosedCase, setIsReopenCaseOpen]);

    return {
        showLegalError,
        handleMoveRequestToTrash,
        handleMoveDecisionToTrash,
        handleRequestOrderProceedingsBlockChange,
        timelineEvents,
        getProceduralRefsForRequest,
        activeRequestProceduralReferences,
        linkedTimelineProceduralReferences,
        navigateToProceduralItem,
        openProceduralLinkedRecord,
        closeConfirmAction,
        runConfirmAction,
        openReopenCase,
        submitReopenCase,
    };
}
