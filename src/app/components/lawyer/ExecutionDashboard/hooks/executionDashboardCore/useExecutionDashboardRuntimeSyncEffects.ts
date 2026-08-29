/** موجة 14 — effects صغيرة للمزامنة/UX (من core) */
import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, StandaloneExecutionMark } from '@/app/types/execution';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import type { Debtor } from '@/app/types/execution';
import { PerformanceMonitor } from '@/app/utils/performanceMonitor';
import { areDebtorSummonsMarkersEqual } from '@/app/utils/noticeDebtorScope';
import { normalizeExecutionTimelineFilter } from '@/app/utils/timelineCategoryFilter';
import SecureStoreService from '@/app/services/SecureStoreService';
import { useExecutionResidentialGraceClearedListener } from '../useExecutionDashboardWindowBridge';
import {
    defaultEvictionEarnerFeeCollectionSM,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';
import {
    buildDebtorLiabilityGroups,
    isPerDebtorSolidarySplitMode,
} from '@/app/utils/debtorLiabilityGroups';

export function useExecutionDashboardDebtorTabResetOnFileChange(
    executionDataId: string | undefined,
    setExecutionDebtorTabIndex: (v: number | ((i: number) => number)) => void,
) {
    useEffect(() => {
        setExecutionDebtorTabIndex(0);
    }, [executionDataId, setExecutionDebtorTabIndex]);
}

export function useExecutionDashboardExecutionPausedSync(
    executionData: ExecutionFile | null | undefined,
    setExecutionPaused: (v: boolean) => void,
) {
    useEffect(() => {
        setExecutionPaused(Boolean(executionData?.executionPaused || false));
    }, [executionData?.id, executionData?.executionPaused, setExecutionPaused]);
}

export function useExecutionDashboardSummonsPopoverEscapeClose(
    summonsMarkerPopoverOpen: boolean,
    executionMemoBadgePopoverOpen: boolean,
    setSummonsMarkerPopoverOpen: (v: boolean) => void,
    setExecutionMemoBadgePopoverOpen: (v: boolean) => void,
) {
    useEffect(() => {
        if (!summonsMarkerPopoverOpen && !executionMemoBadgePopoverOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSummonsMarkerPopoverOpen(false);
                setExecutionMemoBadgePopoverOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [
        summonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen,
        setSummonsMarkerPopoverOpen,
        setExecutionMemoBadgePopoverOpen,
    ]);
}

export function useExecutionDashboardDebtorNotificationSync({
    executionData,
    setDebtorNotificationDate,
    setManualGraceCalendarExtra,
}: {
    executionData: ExecutionFile | null | undefined;
    setDebtorNotificationDate: (v: string | null) => void;
    setManualGraceCalendarExtra: (v: boolean) => void;
}) {
    useEffect(() => {
        if (!executionData?.id) return;
        const fromFile =
            executionData.debtorNotificationDate ??
            (executionData.debtors?.[0] as Debtor | undefined)?.notificationDate ??
            null;
        setDebtorNotificationDate(fromFile ?? null);
        setManualGraceCalendarExtra(!!executionData.isHolidayExtension);
    }, [
        executionData?.id,
        executionData?.debtorNotificationDate,
        executionData?.isHolidayExtension,
        (executionData?.debtors?.[0] as Debtor | undefined)?.notificationDate,
        setDebtorNotificationDate,
        setManualGraceCalendarExtra,
    ]);
}

export function useExecutionDashboardLegacyNoticeStateBackfill({
    executionData,
    setActiveNoticeState,
}: {
    executionData: ExecutionFile | null | undefined;
    setActiveNoticeState: Dispatch<SetStateAction<string | null>>;
}) {
    useEffect(() => {
        if (!executionData?.id) return;
        const hasNotif = !!(
            executionData.debtorNotificationDate ||
            (executionData.debtors?.[0] as Debtor | undefined)?.notificationDate
        );
        if (!hasNotif) return;
        if (executionData.debtorAttendedVoluntarily || executionData.debtorForcedToAttend) return;
        if (executionData.activeNoticeState) return;
        setActiveNoticeState('initial_notice');
    }, [executionData?.id, executionData, setActiveNoticeState]);
}

export function useExecutionDashboardEarnerFeeSmSync(
    executionData: ExecutionFile | null | undefined,
    setEarnerFeeCollectionSm: (v: EvictionEarnerFeeCollectionSM) => void,
) {
    useEffect(() => {
        setEarnerFeeCollectionSm(
            executionData?.eviction_earner_fee_collection_sm ?? defaultEvictionEarnerFeeCollectionSM(),
        );
    }, [executionData?.id, executionData?.eviction_earner_fee_collection_sm, setEarnerFeeCollectionSm]);
}

export function useExecutionDashboardDebtorTabIndexClamp({
    allDebtorsUnified,
    executionDataId,
    debtorWorkspaceEntries,
    partyMultiplicityAdditionalDebtors,
    setExecutionDebtorTabIndex,
}: {
    allDebtorsUnified: unknown[];
    executionDataId: string | undefined;
    debtorWorkspaceEntries: unknown[];
    partyMultiplicityAdditionalDebtors: unknown;
    setExecutionDebtorTabIndex: Dispatch<SetStateAction<number>>;
}) {
    useEffect(() => {
        setExecutionDebtorTabIndex((i) => {
            if (allDebtorsUnified.length === 0) return 0;
            const perSplit = isPerDebtorSolidarySplitMode(
                allDebtorsUnified as Parameters<typeof isPerDebtorSolidarySplitMode>[0],
                partyMultiplicityAdditionalDebtors as Parameters<typeof isPerDebtorSolidarySplitMode>[1],
            );
            if (perSplit) {
                const groups = buildDebtorLiabilityGroups(
                    debtorWorkspaceEntries as Parameters<typeof buildDebtorLiabilityGroups>[0],
                );
                if (groups.length > 0) {
                    return Math.min(Math.max(0, i), groups.length - 1);
                }
            }
            return Math.min(Math.max(0, i), allDebtorsUnified.length - 1);
        });
    }, [
        allDebtorsUnified.length,
        executionDataId,
        debtorWorkspaceEntries,
        partyMultiplicityAdditionalDebtors,
        setExecutionDebtorTabIndex,
    ]);
}

export function useExecutionDashboardDecisionsHeirsModalExclusivity(
    showDecisionsModal: boolean,
    showHeirsNotificationModal: boolean,
    setShowHeirsNotificationModal: (v: boolean) => void,
) {
    useEffect(() => {
        if (!showDecisionsModal) return;
        if (showHeirsNotificationModal) setShowHeirsNotificationModal(false);
    }, [showDecisionsModal, showHeirsNotificationModal, setShowHeirsNotificationModal]);
}

export function useExecutionDashboardPerformanceMonitor() {
    useEffect(() => {
        PerformanceMonitor.start('ExecutionDashboard');
        return () => {
            PerformanceMonitor.end('ExecutionDashboard');
        };
    }, []);
}

export function useExecutionDashboardPaidClientFeesSync(
    executionData: ExecutionFile | null | undefined,
    setPaidClientFees: (v: number) => void,
) {
    useEffect(() => {
        const p = executionData?.paidClientFees;
        setPaidClientFees(typeof p === 'number' && p >= 0 ? p : 0);
    }, [executionData?.id, executionData?.paidClientFees, setPaidClientFees]);
}

export function useExecutionDashboardSpecialRequestTemplateMenuDismiss(
    specialRequestTemplateMenuOpen: boolean,
    specialRequestTemplateMenuRef: React.RefObject<HTMLElement | null>,
    setSpecialRequestTemplateMenuOpen: (v: boolean) => void,
) {
    useEffect(() => {
        if (!specialRequestTemplateMenuOpen) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            const menu = specialRequestTemplateMenuRef.current;
            const input = document.getElementById('hami-smart-request-template');
            if (menu?.contains(t)) return;
            if (input && input.contains(t)) return;
            setSpecialRequestTemplateMenuOpen(false);
        };
        document.addEventListener('mousedown', onDoc, true);
        return () => document.removeEventListener('mousedown', onDoc, true);
    }, [specialRequestTemplateMenuOpen, specialRequestTemplateMenuRef, setSpecialRequestTemplateMenuOpen]);
}

export function useExecutionDashboardDossierLifecycleDraftSync({
    executionData,
    setDossierStatusDraft,
    setDossierReasonDraft,
    setDossierDateDraft,
}: {
    executionData: ExecutionFile | null | undefined;
    setDossierStatusDraft: (v: ReturnType<typeof normalizeDossierLifecycleStatus>) => void;
    setDossierReasonDraft: (v: string) => void;
    setDossierDateDraft: (v: string) => void;
}) {
    useEffect(() => {
        const s = normalizeDossierLifecycleStatus(executionData?.dossier_lifecycle_status);
        setDossierStatusDraft(s);
        setDossierReasonDraft(String(executionData?.dossier_status_reason ?? '').trim());
        setDossierDateDraft(String(executionData?.dossier_status_date ?? '').slice(0, 10));
    }, [
        executionData?.id,
        executionData?.dossier_lifecycle_status,
        executionData?.dossier_status_reason,
        executionData?.dossier_status_date,
        setDossierStatusDraft,
        setDossierReasonDraft,
        setDossierDateDraft,
    ]);
}

export function useExecutionDashboardStandaloneMarksSync(
    executionData: ExecutionFile | null | undefined,
    executionStorageTick: number,
    setStandaloneExecutionMarks: React.Dispatch<React.SetStateAction<StandaloneExecutionMark[]>>,
) {
    useEffect(() => {
        const marks = executionData?.standaloneExecutionMarks;
        if (!Array.isArray(marks)) return;
        setStandaloneExecutionMarks(marks);
    }, [executionData?.standaloneExecutionMarks, executionStorageTick, setStandaloneExecutionMarks]);
}

export function useExecutionDashboardFollowupSolidaryIndexReset(
    executionDebtorTabIndex: number,
    activeLiabilityGroupId: string | undefined,
    setFollowupSolidaryDebtorIndex: (v: number) => void,
) {
    useEffect(() => {
        setFollowupSolidaryDebtorIndex(0);
    }, [executionDebtorTabIndex, activeLiabilityGroupId, setFollowupSolidaryDebtorIndex]);
}

export function useExecutionDashboardScopedDebtorNoticeSync({
    scopedNotificationCount,
    unifiedSummonsTargetDebtorKey,
    scopedSummonsMarker,
    setNotificationCount,
    setDebtorSummonsMarkerLocal,
}: {
    scopedNotificationCount: number;
    unifiedSummonsTargetDebtorKey: string;
    scopedSummonsMarker: ExecutionFile['debtor_summons_marker'] | null;
    setNotificationCount: React.Dispatch<React.SetStateAction<number>>;
    setDebtorSummonsMarkerLocal: React.Dispatch<
        React.SetStateAction<ExecutionFile['debtor_summons_marker'] | null>
    >;
}) {
    useEffect(() => {
        setNotificationCount((prev) =>
            prev === scopedNotificationCount ? prev : scopedNotificationCount,
        );
    }, [scopedNotificationCount, unifiedSummonsTargetDebtorKey, setNotificationCount]);

    useEffect(() => {
        setDebtorSummonsMarkerLocal((prev) =>
            areDebtorSummonsMarkersEqual(prev, scopedSummonsMarker) ? prev : scopedSummonsMarker,
        );
    }, [scopedSummonsMarker, unifiedSummonsTargetDebtorKey, setDebtorSummonsMarkerLocal]);
}

export function useExecutionDashboardActiveTimelineFilterNormalize(
    timelineFilterOptions: ReturnType<typeof normalizeExecutionTimelineFilter> extends never
        ? unknown
        : Parameters<typeof normalizeExecutionTimelineFilter>[1],
    setActiveTimelineFilter: Dispatch<SetStateAction<string>>,
) {
    useEffect(() => {
        setActiveTimelineFilter((prev) =>
            normalizeExecutionTimelineFilter(prev, timelineFilterOptions as never),
        );
    }, [timelineFilterOptions, setActiveTimelineFilter]);
}

export function useExecutionDashboardEmployeeCompulsoryBannerReset(
    employeeAssignmentPhaseForCoercive: import('./executionDashboardEmployeeAssignmentSync').EmployeeAssignmentCoercivePhase,
    setEmployeeCompulsoryBannerDismissed: (v: boolean) => void,
) {
    useEffect(() => {
        const ph = employeeAssignmentPhaseForCoercive;
        if (ph !== 'absent_declared' && ph !== 'investigation_pending' && ph !== 'warrant_ui') {
            setEmployeeCompulsoryBannerDismissed(false);
        }
    }, [employeeAssignmentPhaseForCoercive, setEmployeeCompulsoryBannerDismissed]);
}

export function useExecutionDashboardEmployeePersonalTabUnlockHydrate(
    employeePersonalTabUnlockStorageKey: string,
    setPersonalTabUnlockByDebtor: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
) {
    useEffect(() => {
        if (!employeePersonalTabUnlockStorageKey) return;
        try {
            const raw = SecureStoreService.getItemSync(employeePersonalTabUnlockStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Record<string, boolean>;
            if (!parsed || typeof parsed !== 'object') return;
            setPersonalTabUnlockByDebtor((prev) => ({ ...parsed, ...prev }));
        } catch {
            /* ignore */
        }
    }, [employeePersonalTabUnlockStorageKey, setPersonalTabUnlockByDebtor]);
}

export function useExecutionDashboardPartiesExtraPanelsReset(
    executionFileKey: string,
    setShowExtraCreditors: (v: boolean) => void,
    setShowExtraDebtors: (v: boolean) => void,
) {
    useEffect(() => {
        setShowExtraCreditors(false);
        setShowExtraDebtors(false);
    }, [executionFileKey, setShowExtraCreditors, setShowExtraDebtors]);
}

export { useExecutionResidentialGraceClearedListener };

export {
    useExecutionDashboardDebtorBrowserTabsClamp,
    useExecutionDashboardExecutionFeeExemptionToast,
    useExecutionDashboardFieldVisitScheduledListener,
    useExecutionDashboardMaritalFurnitureFinancialSync,
    useExecutionDashboardSaveOnUnmount,
    useExecutionDashboardSupabaseTimelineHydrate,
    useExecutionDashboardUnifiedModalPersonalTabRedirect,
} from './useExecutionDashboardRuntimeSyncEffectsPersist';
