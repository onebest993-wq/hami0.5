import type { ExecutionDashboardPhoneBodySecondaryScope } from './ExecutionDashboardPhoneBodySecondarySections';

const SECONDARY_SCOPE_KEYS = [
    'debtorBrowserTabsMode',
    'dockPinnedNotes',
    'dockPinnedTasks',
    'executionActionsGridLocked',
    'executionToolsTimelineLockedUi',
    'hasUnifiedSeizureLogContent',
    'isEvictionExecutionModule',
    'isHistoricalMode',
    'isRepresentingDebtor',
    'isVisitationClaim',
    'isMaritalFurnitureClaim',
    'executionId',
    'parentDossierId',
    'activeSubFileId',
    'isInabaActive',
    'activeTimelineEvents',
    'mergedTimelineEvents',
    'mergedTimelineEventsDebtorScoped',
    'mergedTimelineRadarPreviewLimit',
    'moveCaseNoteToTrash',
    'moveTimelineEventToTrash',
    'openUnifiedSeizureLog',
    'requestEditTimelineEvent',
    'setActiveTimelineFilter',
    'setEmployeeCompulsoryBannerDismissed',
    'setShowOnlyActiveFileTimeline',
    'setShowVisitationCalendarModal',
    'showEmployeeCompulsoryProceduresBanner',
    'showOnlyActiveFileTimeline',
    'showToast',
    'syncRollingCalendarSessions',
    'timelineFilterOptions',
    'toggleCaseNotePin',
    'toggleCaseTaskPin',
    'toggleTimelineEventPin',
    'viewExecutionData',
    'todayYmd',
    'persistExecutionMerge',
    'setTimelineEvents',
    'currentFileId',
    'activeTimelineFilter',
    'claimType',
    'nextTimelineId',
    'pushTimelineEvent',
] as const satisfies readonly (keyof ExecutionDashboardPhoneBodySecondaryScope)[];

export function buildPhoneBodySecondaryScope(
    source: Record<string, unknown>,
): ExecutionDashboardPhoneBodySecondaryScope {
    const out = {} as ExecutionDashboardPhoneBodySecondaryScope;
    for (const key of SECONDARY_SCOPE_KEYS) {
        (out as Record<string, unknown>)[key] = source[key];
    }
    return out;
}
