import type { ExecutionDashboardPhoneBodyProps } from '../components/ExecutionDashboardPhoneBody';

export type ExecutionPhoneBodySources = ExecutionDashboardPhoneBodyProps & {
    renderFingerprint?: string;
};

/** بصمة خفيفة لتقليل re-renders — تُحدَّث عند تغيّر الحالة المرئية */
export function computeExecutionPhoneBodyFingerprint(input: {
    executionId?: string | number | null;
    activeTabId?: string;
    activeFinancialTab?: string;
    activeTimelineFilter?: string;
    executionPaused?: boolean;
    dossierLifecyclePanelOpen?: boolean;
    dossierLifecyclePanelPhase?: string;
    dossierLifecyclePopStyle?: { top: number; left: number; width: number } | null;
    toastEpoch?: number;
    dataRevision?: string | number;
    executionDebtorTabIndex?: number;
    showUnifiedSeizureLogModal?: boolean;
    timelineAccordionExpanded?: boolean;
    isFinancialCenterExpanded?: boolean;
    isHeaderExpanded?: boolean;
    debtorAttendedVoluntarily?: boolean;
    voluntaryAttendanceCount?: number;
    noticeVoluntaryPeriodEndOptimistic?: boolean;
    voluntaryEndOptimistic?: boolean;
    notificationCount?: number;
    showExecutionFinancialHub?: boolean;
}): string {
    return [
        input.executionId ?? '',
        input.activeTabId ?? '',
        input.activeFinancialTab ?? '',
        input.activeTimelineFilter ?? '',
        input.executionPaused ? 1 : 0,
        input.dossierLifecyclePanelOpen ? 1 : 0,
        input.dossierLifecyclePanelPhase ?? '',
        input.dossierLifecyclePopStyle
            ? `${input.dossierLifecyclePopStyle.top}|${input.dossierLifecyclePopStyle.left}|${input.dossierLifecyclePopStyle.width}`
            : '',
        input.toastEpoch ?? 0,
        input.dataRevision ?? '',
        input.executionDebtorTabIndex ?? 0,
        input.showUnifiedSeizureLogModal ? 1 : 0,
        input.timelineAccordionExpanded ? 1 : 0,
        input.isFinancialCenterExpanded ? 1 : 0,
        input.isHeaderExpanded ? 1 : 0,
        input.debtorAttendedVoluntarily ? 1 : 0,
        input.voluntaryAttendanceCount ?? 0,
        input.noticeVoluntaryPeriodEndOptimistic ? 1 : 0,
        input.voluntaryEndOptimistic ? 1 : 0,
        input.notificationCount ?? 0,
        input.showExecutionFinancialHub ? 1 : 0,
    ].join('|');
}

export function buildExecutionPhoneBodyProps(
    sources: ExecutionPhoneBodySources,
): ExecutionDashboardPhoneBodyProps {
    return sources;
}
