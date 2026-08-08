// @ts-nocheck
import { useCallback, useMemo } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { DossierActionType } from '../../components/DossierActionsModal';
import { useExecutionDashboardDossierAdminFollowupHandlers } from './useExecutionDashboardDossierAdminFollowupHandlers';
import { useExecutionDashboardDossierControlsHandlers } from './useExecutionDashboardDossierControlsHandlers';
import { useExecutionDashboardOtherPartyHandlers } from './useExecutionDashboardOtherPartyHandlers';
import { useOtherPartyActionLogOutcomeSync } from '@/app/application/execution/followup/useOtherPartyActionLogOutcomeSync';

type Params = {
    executionDataRef: React.MutableRefObject<ExecutionFile | null | undefined>;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    decisionsReloadEpoch?: number;
    parentExecutionFile: ExecutionFile | null | undefined;
    isInabaActive: boolean;
    isUnifiedTabActive: boolean;
    isRepresentingDebtor: boolean;
    timelineEvents: TimelineEvent[];
    nextTimelineId: () => string;
    pushTimelineEventRef: React.MutableRefObject<unknown>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    openDecisionsModalWithBoot: (boot?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
    specialRequestDate: string;
    specialRequestManualTitle: string;
    specialRequestContent: string;
    setSpecialRequestTemplatePick: React.Dispatch<React.SetStateAction<string>>;
    setSpecialRequestContent: React.Dispatch<React.SetStateAction<string>>;
    setSpecialRequestManualTitle: React.Dispatch<React.SetStateAction<string>>;
    setSpecialRequestDate: React.Dispatch<React.SetStateAction<string>>;
    setDossierActionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setDossierActionModalSaving: React.Dispatch<React.SetStateAction<boolean>>;
    setDossierActionModalType: React.Dispatch<React.SetStateAction<DossierActionType | null>>;
    setExecutionStorageTick: React.Dispatch<React.SetStateAction<number>>;
};

/** معالجات متابعة الملف — مُثبّتة على Core دون انتظار lazy handler clusters */
export function useExecutionDashboardCoreDossierFollowupHandlers(p: Params) {
    const pushTimelineEvent = useCallback(
        (...args: Parameters<NonNullable<typeof p.pushTimelineEventRef.current>>) => {
            const fn = p.pushTimelineEventRef.current;
            if (typeof fn === 'function') {
                return fn(...args);
            }
            return false;
        },
        [p.pushTimelineEventRef],
    );

    const adminHandlers = useExecutionDashboardDossierAdminFollowupHandlers({
        executionData: p.executionData,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        specialRequestDate: p.specialRequestDate,
        specialRequestManualTitle: p.specialRequestManualTitle,
        specialRequestContent: p.specialRequestContent,
        nextTimelineId: p.nextTimelineId,
        pushTimelineEvent,
        showToast: p.showToast,
        setSpecialRequestTemplatePick: p.setSpecialRequestTemplatePick,
        setSpecialRequestContent: p.setSpecialRequestContent,
        setSpecialRequestManualTitle: p.setSpecialRequestManualTitle,
        setSpecialRequestDate: p.setSpecialRequestDate,
    });

    const controlsHandlers = useExecutionDashboardDossierControlsHandlers({
        executionData: p.executionData,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        parentExecutionFile: p.parentExecutionFile,
        isInabaActive: p.isInabaActive,
        isUnifiedTabActive: p.isUnifiedTabActive,
        nextTimelineId: p.nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge: p.persistExecutionMerge,
        showToast: p.showToast,
        setDossierActionModalOpen: p.setDossierActionModalOpen,
        setDossierActionModalSaving: p.setDossierActionModalSaving,
        setDossierActionModalType: p.setDossierActionModalType,
        setExecutionStorageTick: p.setExecutionStorageTick,
    });

    const otherPartyHandlers = useExecutionDashboardOtherPartyHandlers({
        executionDataRef: p.executionDataRef,
        executionData: p.executionData,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        isRepresentingDebtor: p.isRepresentingDebtor,
        timelineEvents: p.timelineEvents,
        nextTimelineId: p.nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge: p.persistExecutionMerge,
        showToast: p.showToast,
        openDecisionsModalWithBoot: p.openDecisionsModalWithBoot,
        setTimelineEvents: p.setTimelineEvents,
    });

    useOtherPartyActionLogOutcomeSync({
        executionData: p.executionData,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        decisionsReloadEpoch: p.decisionsReloadEpoch,
        persistExecutionMerge: p.persistExecutionMerge,
    });

    const dossierFollowupHandlers = useMemo(
        () => ({
            ...adminHandlers,
            ...controlsHandlers,
            ...otherPartyHandlers,
        }),
        [adminHandlers, controlsHandlers, otherPartyHandlers],
    );

    return useMemo(
        () => ({
            dossierFollowupHandlers,
            runSpecialFollowupSubmit: adminHandlers.runSpecialFollowupSubmit,
        }),
        [adminHandlers.runSpecialFollowupSubmit, dossierFollowupHandlers],
    );
}
