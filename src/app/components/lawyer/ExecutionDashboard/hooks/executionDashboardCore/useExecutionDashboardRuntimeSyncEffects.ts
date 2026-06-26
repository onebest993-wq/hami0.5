// @ts-nocheck
/** موجة 14 — effects صغيرة للمزامنة/UX (من core) */
import { useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { Debtor } from '@/app/types/execution';
import { PerformanceMonitor } from '@/app/utils/performanceMonitor';
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
    setActiveNoticeState: (v: ExecutionFile['activeNoticeState']) => void;
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
    setExecutionDebtorTabIndex: (fn: (i: number) => number) => void;
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
