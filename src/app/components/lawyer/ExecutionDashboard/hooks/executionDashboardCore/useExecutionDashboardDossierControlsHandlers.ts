// @ts-nocheck
import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { DossierActionPayload, DossierActionType } from '../../components/DossierActionsModal';
import { appendSpecialFollowupRequest } from '@/app/utils/specialFollowupDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    createInabaCorrespondenceLogEntry,
    getInabaCorrespondenceLog,
    patchParentInabaCorrespondenceLog,
} from '../../utils/inabaCorrespondenceLog';
import {
    buildDossierActionFullContent,
    buildDossierActionPayloadJson,
    DOSSIER_ACTION_TITLE_MAP,
    validateDossierActionPayload,
} from './executionDashboardDossierAction';

type UseExecutionDashboardDossierControlsHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string | undefined;
    parentExecutionFile: ExecutionFile | null | undefined;
    isInabaActive: boolean;
    isUnifiedTabActive: boolean;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setDossierActionModalOpen: Dispatch<SetStateAction<boolean>>;
    setDossierActionModalSaving: Dispatch<SetStateAction<boolean>>;
    setDossierActionModalType: Dispatch<SetStateAction<DossierActionType | null>>;
    setExecutionStorageTick: Dispatch<SetStateAction<number>>;
};

export function useExecutionDashboardDossierControlsHandlers({
    executionData,
    decisionsStorageExecutionId,
    parentExecutionFile,
    isInabaActive,
    isUnifiedTabActive,
    nextTimelineId,
    pushTimelineEvent,
    persistExecutionMerge,
    showToast,
    setDossierActionModalOpen,
    setDossierActionModalSaving,
    setDossierActionModalType,
    setExecutionStorageTick,
}: UseExecutionDashboardDossierControlsHandlersParams) {
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
            executionData,
            isInabaActive,
            isUnifiedTabActive,
            nextTimelineId,
            parentExecutionFile,
            persistExecutionMerge,
            pushTimelineEvent,
            setDossierActionModalOpen,
            setDossierActionModalSaving,
            setExecutionStorageTick,
            showToast,
        ],
    );

    const handleOpenDossierAction = useCallback(
        (actionType: DossierActionType) => {
            setDossierActionModalType(actionType);
            setDossierActionModalOpen(true);
        },
        [setDossierActionModalOpen, setDossierActionModalType],
    );

    return useMemo(
        () => ({
            handleDossierAction,
            handleOpenDossierAction,
        }),
        [handleDossierAction, handleOpenDossierAction],
    );
}
