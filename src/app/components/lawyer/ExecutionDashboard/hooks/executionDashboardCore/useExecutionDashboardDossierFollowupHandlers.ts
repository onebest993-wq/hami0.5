// @ts-nocheck
/** طلبات الإضبارة + الطلبات اليدوية + تحركات الطرف الآخر — موجة 6 */
import { useCallback, useEffect, useMemo, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { DossierActionPayload, DossierActionType } from '../../components/DossierActionsModal';
import { SPECIAL_REQUEST_MANUAL_MODE } from '../../components/requestsTabConstants';
import { useStandardSubmit } from '@/app/hooks/useStandardSubmit';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    dispatchDomainIsolationBlocked,
    isFollowupRequestKindAllowed,
} from '@/app/utils/executionDomainIsolation';
import { appendSpecialFollowupRequest } from '@/app/utils/executorSeizureDecisionQueue';
import {
    createInabaCorrespondenceLogEntry,
    getInabaCorrespondenceLog,
    patchParentInabaCorrespondenceLog,
} from '../../utils/inabaCorrespondenceLog';
import {
    resolveCreditorOtherPartyTrackDecision,
    submitCreditorOtherPartyTrackToDecisions,
} from '@/app/utils/otherPartyCreditorTrackDecisionUtils';
import { buildTimelineEventsFromOtherPartyActionLog } from '@/app/utils/otherPartyActionLogTimeline';
import {
    buildDossierActionFullContent,
    buildDossierActionPayloadJson,
    DOSSIER_ACTION_TITLE_MAP,
    validateDossierActionPayload,
} from './executionDashboardDossierAction';

export type UseExecutionDashboardDossierFollowupHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    parentExecutionFile: ExecutionFile | null | undefined;
    isInabaActive: boolean;
    isUnifiedTabActive: boolean;
    isRepresentingDebtor: boolean;
    timelineEvents: TimelineEvent[];
    specialRequestDate: string;
    specialRequestManualTitle: string;
    specialRequestContent: string;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    openDecisionsModalWithBoot: (boot?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    setDossierActionModalOpen: Dispatch<SetStateAction<boolean>>;
    setDossierActionModalSaving: Dispatch<SetStateAction<boolean>>;
    setDossierActionModalType: Dispatch<SetStateAction<DossierActionType | null>>;
    setExecutionStorageTick: Dispatch<SetStateAction<number>>;
    setSpecialRequestTemplatePick: Dispatch<SetStateAction<string>>;
    setSpecialRequestContent: Dispatch<SetStateAction<string>>;
    setSpecialRequestManualTitle: Dispatch<SetStateAction<string>>;
    setSpecialRequestDate: Dispatch<SetStateAction<string>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function useExecutionDashboardDossierFollowupHandlers({
    executionDataRef,
    executionData,
    executionId,
    decisionsStorageExecutionId,
    parentExecutionFile,
    isInabaActive,
    isUnifiedTabActive,
    isRepresentingDebtor,
    timelineEvents,
    specialRequestDate,
    specialRequestManualTitle,
    specialRequestContent,
    nextTimelineId,
    pushTimelineEvent,
    persistExecutionMerge,
    showToast,
    openDecisionsModalWithBoot,
    setDossierActionModalOpen,
    setDossierActionModalSaving,
    setDossierActionModalType,
    setExecutionStorageTick,
    setSpecialRequestTemplatePick,
    setSpecialRequestContent,
    setSpecialRequestManualTitle,
    setSpecialRequestDate,
    setTimelineEvents,
}: UseExecutionDashboardDossierFollowupHandlersParams) {
    const handleDossierAction = useCallback(
        (payload: DossierActionPayload): boolean => {
            const today = getLocalTodayYmd();
            const title = DOSSIER_ACTION_TITLE_MAP[payload.actionType];
            const validation = validateDossierActionPayload(payload);
            if (!validation.ok) {
                showToast(validation.message, 'warning');
                setDossierActionModalSaving(false);
                return false;
            }

            const fullContent = buildDossierActionFullContent(payload);
            const payloadJson = buildDossierActionPayloadJson(payload);

            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: today,
                content: fullContent,
                decisionTitle: title,
                ...(payloadJson ? { payloadJson } : {}),
            });
            if (!decisionId) {
                showToast(`يوجد طلب "${title}" مماثل قيد البت لدى المنفذ.`, 'warning', {
                    decisionsLink: true,
                });
                setDossierActionModalOpen(false);
                setDossierActionModalSaving(false);
                return false;
            }

            if (payload.actionType === 'inaba_correspondence') {
                const entry = createInabaCorrespondenceLogEntry({
                    subFileId: String(payload.inabaCorrespondenceSubFileId || ''),
                    directorate: String(payload.inabaCorrespondenceDirectorate || ''),
                    subject: String(payload.inabaCorrespondenceSubject || ''),
                    requestDate: today,
                    decisionRowId: decisionId,
                });
                const prev = getInabaCorrespondenceLog(
                    isInabaActive && parentExecutionFile
                        ? parentExecutionFile
                        : (executionData as ExecutionFile | null),
                );
                const next = [entry, ...prev];
                if (isInabaActive || isUnifiedTabActive) {
                    patchParentInabaCorrespondenceLog(decisionsStorageExecutionId, () => next);
                } else {
                    persistExecutionMerge({ inaba_correspondence_log: next });
                }
                setExecutionStorageTick((t) => t + 1);
            }

            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: `${title} — قيد البت`,
                description: `بتاريخ ${today}:\n\n${fullContent}`,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                    dossierActionPayload: payload,
                },
            });
            setDossierActionModalOpen(false);
            setDossierActionModalSaving(false);
            showToast(`تم إرسال "${title}" إلى القرارات والطعون بانتظار الموافقة.`, 'success');
            return true;
        },
        [
            decisionsStorageExecutionId,
            pushTimelineEvent,
            nextTimelineId,
            showToast,
            setDossierActionModalOpen,
            setDossierActionModalSaving,
            isInabaActive,
            parentExecutionFile,
            executionData,
            isUnifiedTabActive,
            persistExecutionMerge,
            setExecutionStorageTick,
        ],
    );

    const handleOpenDossierAction = useCallback(
        (actionType: DossierActionType) => {
            setDossierActionModalType(actionType);
            setDossierActionModalOpen(true);
        },
        [setDossierActionModalOpen, setDossierActionModalType],
    );

    const { runSubmit: runSpecialFollowupSubmit } = useStandardSubmit({
        validate: () => {
            const followupGate = isFollowupRequestKindAllowed(
                executionData as Record<string, unknown> | null | undefined,
                decisionsStorageExecutionId,
                'special_followup',
            );
            if (!followupGate.allowed) {
                dispatchDomainIsolationBlocked(followupGate.reasonAr, 'special_followup');
                return false;
            }
            const d = specialRequestDate.trim();
            if (!d) return false;
            return Boolean(specialRequestManualTitle.trim()) && Boolean(specialRequestContent.trim());
        },
        validationMessage: 'أكمل موضوع الطلب والتاريخ والتفاصيل',
        submit: () => {
            const d = specialRequestDate.trim();
            const content = specialRequestContent.trim();
            const title = specialRequestManualTitle.trim() || 'طلب يدوي';
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content: content || title,
                decisionTitle: title,
                payloadJson: JSON.stringify({
                    kind: 'manual_followup',
                    v: 1,
                }),
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return false;
            }
            const now = new Date().toISOString();
            const fullBody = `بتاريخ ${d}:\n\n${content || title}`;
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: `${title} — قيد البت`,
                description: fullBody,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            setSpecialRequestTemplatePick(SPECIAL_REQUEST_MANUAL_MODE);
            setSpecialRequestContent('');
            setSpecialRequestManualTitle('');
            setSpecialRequestDate(getLocalTodayYmd());
        },
        onClose: () => {},
        successMessage:
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ — افتح «القرارات والطعون» من الشريط عند الحاجة',
        showToast,
        successToastOptions: { decisionsLink: true },
    });

    const handleOtherPartyActionLogOnly = useCallback(
        (input: { date: string; content: string }): { ok: boolean } => {
            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            if (!d || !content) {
                showToast('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
                return { ok: false };
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'تحرك الطرف الآخر',
                description: content,
                type: 'other_party',
                source: 'تحركات الطرف الآخر',
            });
            showToast('تم تسجيل التحرك في السجل الزمني.', 'success');
            return { ok: true };
        },
        [nextTimelineId, pushTimelineEvent, showToast],
    );

    const handleOtherPartyActionSubmitToDecisions = useCallback(
        (input: { date: string; content: string }): { ok: boolean; decisionId?: string } => {
            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            if (!d || !content) {
                showToast('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
                return { ok: false };
            }
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content,
                appealRequestOrigin: 'debtor_side',
                decisionTitle: 'تحرك الطرف الآخر — قيد البت',
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return { ok: false };
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'تحرك الطرف الآخر — قيد البت',
                description: `بتاريخ ${d}:\n\n${content}`,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            showToast('تم حفظ التحرك في السجل.', 'success');
            return { ok: true, decisionId };
        },
        [decisionsStorageExecutionId, nextTimelineId, pushTimelineEvent, showToast],
    );

    const handleCreditorTrackSubmit = useCallback(
        (input: { optionId: string; label: string; date: string }): { ok: boolean; decisionId?: string } => {
            const storageId = String(
                decisionsStorageExecutionId || executionId || executionDataRef.current?.id || '',
            ).trim();
            const res = submitCreditorOtherPartyTrackToDecisions({
                executionId: storageId || undefined,
                optionId: input.optionId,
                label: input.label,
                requestDate: input.date,
            });
            if (!res.ok) {
                showToast('تعذّر إنشاء البطاقة — قد يوجد طلب مماثل قيد البت.', 'warning', {
                    decisionsLink: true,
                });
                return { ok: false };
            }
            pushTimelineEvent({
                id: nextTimelineId(),
                date: input.date,
                timestamp: new Date().toISOString(),
                title: `${input.label} — قيد البت`,
                description: 'تقدّم وكيل الدائن — متابعة من جانب موكّل المدين.',
                type: 'other_party',
                source: 'تحركات الطرف الآخر',
                metadata: {
                    timelineThreadKey: `executor_decision:${res.decisionId}`,
                    decisionRowId: res.decisionId,
                    otherPartyTrackOptionId: input.optionId,
                },
            });
            showToast('تم إنشاء بطاقة في القرارات والطعون.', 'success', { decisionsLink: true });
            return res;
        },
        [decisionsStorageExecutionId, executionId, executionDataRef, nextTimelineId, pushTimelineEvent, showToast],
    );

    const handleCreditorTrackResolve = useCallback(
        (input: { decisionId: string; resolution: 'approved' | 'rejected' }): boolean => {
            const ok = resolveCreditorOtherPartyTrackDecision({
                executionId: decisionsStorageExecutionId,
                decisionId: input.decisionId,
                resolution: input.resolution,
            });
            if (!ok) {
                showToast('تعذّر تحديث بطاقة القرار.', 'warning');
                return false;
            }
            showToast(
                input.resolution === 'approved' ? 'سُجّلت موافقة المنفذ.' : 'سُجّل رفض المنفذ.',
                'success',
            );
            return true;
        },
        [decisionsStorageExecutionId, showToast],
    );

    const handleCreditorTrackOpenDecision = useCallback(
        (decisionId: string) => {
            openDecisionsModalWithBoot({
                tab: 'current',
                decisionId: String(decisionId || '').trim() || null,
            });
        },
        [openDecisionsModalWithBoot],
    );

    const creditorOtherPartyTrackHandlers = useMemo(
        () => ({
            onSubmitCreditorRequest: handleCreditorTrackSubmit,
            onResolveCreditorDecision: handleCreditorTrackResolve,
            showMessage: (message: string, type?: 'warning' | 'success') =>
                showToast(message, type ?? 'info'),
            onOpenDecision: handleCreditorTrackOpenDecision,
        }),
        [
            handleCreditorTrackSubmit,
            handleCreditorTrackResolve,
            handleCreditorTrackOpenDecision,
            showToast,
        ],
    );

    const otherPartyTabSubmitHandler = useMemo(
        () =>
            isRepresentingDebtor
                ? handleOtherPartyActionLogOnly
                : handleOtherPartyActionSubmitToDecisions,
        [isRepresentingDebtor, handleOtherPartyActionLogOnly, handleOtherPartyActionSubmitToDecisions],
    );

    const otherPartyLogMigratedRef = useRef(false);
    useEffect(() => {
        if (!isRepresentingDebtor || otherPartyLogMigratedRef.current) return;
        const log = executionData?.other_party_actions_log;
        if (!Array.isArray(log) || log.length === 0) return;
        otherPartyLogMigratedRef.current = true;
        const { events: migrated, migratedIds } = buildTimelineEventsFromOtherPartyActionLog(
            log,
            timelineEvents,
            nextTimelineId,
        );
        if (migrated.length === 0) {
            persistExecutionMerge({ other_party_actions_log: [] });
            return;
        }
        const nextTimeline = [...migrated, ...timelineEvents];
        persistExecutionMerge({
            timelineEvents: nextTimeline,
            other_party_actions_log: [],
        });
        setTimelineEvents(nextTimeline);
        if (migratedIds.length > 0) {
            showToast(
                `نُقل ${migratedIds.length} سجل إلى السجل الزمني (تبويب تحركات الطرف الآخر).`,
                'info',
            );
        }
    }, [
        isRepresentingDebtor,
        executionData?.other_party_actions_log,
        timelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    ]);

    const openOtherPartyAppealsModal = useCallback(
        (decisionId?: string) => {
            openDecisionsModalWithBoot({
                tab: 'previous',
                decisionId: String(decisionId || '').trim() || null,
            });
        },
        [openDecisionsModalWithBoot],
    );

    return {
        handleDossierAction,
        handleOpenDossierAction,
        runSpecialFollowupSubmit,
        creditorOtherPartyTrackHandlers,
        otherPartyTabSubmitHandler,
        openOtherPartyAppealsModal,
    };
}
