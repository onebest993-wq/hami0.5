import React, { startTransition, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Activity } from '@/app/components/ui/icons/Activity';
import { Book } from '@/app/components/ui/icons/Book';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { ChevronUp } from '@/app/components/ui/icons/ChevronUp';
import { ClipboardList } from '@/app/components/ui/icons/ClipboardList';
import { CreditCard } from '@/app/components/ui/icons/CreditCard';
import { FileText } from '@/app/components/ui/icons/FileText';
import { FolderOpen } from '@/app/components/ui/icons/FolderOpen';
import { History } from '@/app/components/ui/icons/History';
import { Scale } from '@/app/components/ui/icons/Scale';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { VisitationScheduleBundle } from '@/app/types/visitationSchedule';
import type { ExecutionTimelineFilterLabel } from '@/app/utils/timelineCategoryFilter';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import {
    LazyActionGridSection,
    LazyCustodyRemovalWardsModule,
    LazyTimelineSection,
} from '../executionDashboardLazyRegistryShell';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK, EXEC_SECTION_LAZY_FALLBACK, EXEC_ACTION_GRID_LAZY_FALLBACK, EXEC_TIMELINE_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { ExecutionLawOverlayEntry } from './ExecutionLawOverlayEntry';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import {
    LazyPremiumTimelineAuditLog,
    LazySmartTimelineRadar,
} from '../executionTimelineSurfaceLazy';

type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
type CaseTaskRow = NonNullable<ExecutionFile['caseTasksPending']>[number];

type ExecutionDashboardShowToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    options?: unknown,
) => void;

type ExecutionPhoneBodyVisitationData = ExecutionFile & {
    visitationSchedule?: VisitationScheduleBundle | null;
    fileNumber?: string | number | null;
};

export type ExecutionDashboardPhoneBodySecondaryScope = {
    debtorBrowserTabsMode: boolean;
    dockPinnedNotes: CaseNoteLogRow[];
    dockPinnedTasks: CaseTaskRow[];
    executionActionsGridLocked: boolean;
    executionToolsTimelineLockedUi: boolean;
    hasUnifiedSeizureLogContent: boolean;
    isEvictionExecutionModule: boolean;
    isHistoricalMode: boolean;
    isRepresentingDebtor: boolean;
    isVisitationClaim: boolean;
    isMaritalFurnitureClaim: boolean;
    executionId?: string;
    parentDossierId?: string;
    activeSubFileId?: string | null;
    isInabaActive?: boolean;
    activeTimelineEvents: TimelineEvent[];
    mergedTimelineEvents: TimelineEvent[];
    mergedTimelineEventsDebtorScoped: TimelineEvent[];
    mergedTimelineRadarPreviewLimit: number;
    moveCaseNoteToTrash: (id: string) => void;
    moveTimelineEventToTrash: (event: TimelineEvent) => void;
    openUnifiedSeizureLog: () => void;
    requestEditTimelineEvent: (event: TimelineEvent) => void;
    setActiveTimelineFilter: Dispatch<SetStateAction<string>>;
    setEmployeeCompulsoryBannerDismissed: (dismissed: boolean) => void;
    setShowOnlyActiveFileTimeline: Dispatch<SetStateAction<boolean>>;
    showEmployeeCompulsoryProceduresBanner: boolean;
    showOnlyActiveFileTimeline: boolean;
    showToast: ExecutionDashboardShowToast;
    /** اختياري — SecondarySections يستورد المحرّك مباشرة */
    syncRollingCalendarSessions?: (
        config: VisitationScheduleBundle['config'],
        sessions: VisitationScheduleBundle['sessions'],
        todayYmd: string,
    ) => VisitationScheduleBundle['sessions'];
    timelineFilterOptions: readonly ExecutionTimelineFilterLabel[];
    toggleCaseNotePin: (id: string) => void;
    toggleCaseTaskPin: (id: string) => void;
    toggleTimelineEventPin: (event: TimelineEvent) => void;
    viewExecutionData: ExecutionPhoneBodyVisitationData | null | undefined;
    todayYmd: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    currentFileId: string | number | null | undefined;
    activeTimelineFilter: string;
    claimType?: string;
    nextTimelineId?: () => string;
    pushTimelineEvent?: (event: TimelineEvent) => void;
};

type ExecutionDashboardPhoneBodySecondarySectionsProps = {
    scope: ExecutionDashboardPhoneBodySecondaryScope;
    secondaryStageReady: boolean;
    /** PhoneBody يعرض CustodyRemoval أعلى — يُعطَّل هنا لتجنب التكرار */
    includeCustodyRemoval?: boolean;
    followupSpec: {
        hideDossierFinancialTools?: boolean;
    };
    safeResolveCalendarUserId: (value: unknown) => string | null;
    safeSetTimelineAccordionExpanded: Dispatch<SetStateAction<boolean>>;
    safeTimelineAccordionExpanded: boolean;
    safeSubFilesCount: number;
    safeOpenAppointmentModal: () => void;
    directOpenNotesModal: () => void;
    directOpenDocumentsModal: () => void;
    directOpenTimelineModal: () => void;
    directOpenFinancialCenter?: (() => void) | undefined;
    directHandleMemoFollowupClick?: (() => void) | undefined;
    directOpenDecisionsModalWithBoot?: ((input: { tab: string }) => void) | undefined;
};

export function ExecutionDashboardPhoneBodySecondarySections({
    scope,
    secondaryStageReady,
    includeCustodyRemoval = true,
    followupSpec,
    safeResolveCalendarUserId,
    safeSetTimelineAccordionExpanded,
    safeTimelineAccordionExpanded,
    safeSubFilesCount,
    safeOpenAppointmentModal,
    directOpenNotesModal,
    directOpenDocumentsModal,
    directOpenTimelineModal,
    directOpenFinancialCenter,
    directHandleMemoFollowupClick,
    directOpenDecisionsModalWithBoot,
}: ExecutionDashboardPhoneBodySecondarySectionsProps) {

    const {
        debtorBrowserTabsMode,
        dockPinnedNotes,
        dockPinnedTasks,
        executionActionsGridLocked,
        executionToolsTimelineLockedUi,
        hasUnifiedSeizureLogContent,
        isEvictionExecutionModule,
        isHistoricalMode,
        isRepresentingDebtor,
        mergedTimelineEvents,
        mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit,
        moveCaseNoteToTrash,
        moveTimelineEventToTrash,
        openUnifiedSeizureLog,
        requestEditTimelineEvent,
        setActiveTimelineFilter,
        setEmployeeCompulsoryBannerDismissed,
        setShowOnlyActiveFileTimeline,
        showEmployeeCompulsoryProceduresBanner,
        showOnlyActiveFileTimeline,
        showToast,
        timelineFilterOptions,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        toggleTimelineEventPin,
        viewExecutionData,
        todayYmd,
        persistExecutionMerge,
        setTimelineEvents,
        executionId,
        parentDossierId,
        activeSubFileId,
        isInabaActive,
        activeTimelineEvents,
        currentFileId,
        activeTimelineFilter,
        claimType,
        nextTimelineId,
        pushTimelineEvent,
    } = scope;

    const isCustodyRemovalClaimActive = useMemo(
        () =>
            isCustodyRemovalExecutionClaim(
                viewExecutionData as Record<string, unknown> | null | undefined,
                String(claimType || '').trim() || undefined,
            ),
        [viewExecutionData, claimType],
    );
    const custodyWardNamesResolved = useMemo(() => {
        const raw = (viewExecutionData as { custodyWardNames?: unknown } | null | undefined)
            ?.custodyWardNames;
        return Array.isArray(raw)
            ? raw.map((n) => String(n).trim()).filter(Boolean)
            : [];
    }, [viewExecutionData]);

    /* بعد الخطّافات لا قبلها: الإرجاع المبكّر كان يُغيّر عددها عند تبدّل الجاهزية */
    if (!secondaryStageReady) {
        return null;
    }

    return (
        <>
            {includeCustodyRemoval &&
            isCustodyRemovalClaimActive &&
            typeof nextTimelineId === 'function' &&
            typeof setTimelineEvents === 'function' &&
            typeof persistExecutionMerge === 'function' ? (
                <PreloadableOverlayGate
                    lazy={LazyCustodyRemovalWardsModule}
                    fallback={EXEC_SECTION_LAZY_FALLBACK}
                    lazyProps={{
                        executionId,
                        parentDossierId,
                        activeSubFileId,
                        isInabaActive,
                        executionData: viewExecutionData,
                        custodyWardNames: custodyWardNamesResolved,
                        timelineEvents: activeTimelineEvents,
                        todayYmd,
                        setTimelineEvents,
                        persistExecutionMerge,
                        nextTimelineId,
                        showToast,
                    }}
                />
            ) : null}

            {/* حدود الانتظار محلية — شبكة الإجراءات/السجل لا يعلّقان الجسم كله عند chunk بارد */}
            <PreloadableOverlayGate
                lazy={LazyActionGridSection}
                fallback={EXEC_ACTION_GRID_LAZY_FALLBACK}
                lazyProps={{
                    Book,
                    Calendar,
                    FileText,
                    FolderOpen,
                    Scale,
                    ClipboardList,
                    CreditCard,
                    showEmployeeCompulsoryProceduresBanner,
                    executionToolsTimelineLockedUi,
                    executionActionsGridLocked,
                    setEmployeeCompulsoryBannerDismissed,
                    showToast,
                    onOpenAppointmentModal: safeOpenAppointmentModal,
                    onOpenNotesModal: directOpenNotesModal,
                    onOpenDocumentsModal: directOpenDocumentsModal,
                    onOpenDecisionsModal:
                        typeof directOpenDecisionsModalWithBoot === 'function'
                            ? () => directOpenDecisionsModalWithBoot({ tab: 'current' })
                            : undefined,
                    onOpenFinancialCenter: directOpenFinancialCenter,
                    onMemoFollowupClick: directHandleMemoFollowupClick,
                    showSeizureLogButton:
                        hasUnifiedSeizureLogContent &&
                        !isRepresentingDebtor &&
                        !Boolean(followupSpec.hideDossierFinancialTools),
                    onOpenSeizureLog: () => openUnifiedSeizureLog(),
                    pinnedNotes: dockPinnedNotes,
                    pinnedTasks: dockPinnedTasks,
                    onToggleNotePin: toggleCaseNotePin,
                    onToggleTaskPin: toggleCaseTaskPin,
                    onTrashPinnedNote: moveCaseNoteToTrash,
                }}
            />

            <PreloadableOverlayGate
                lazy={LazyTimelineSection}
                fallback={EXEC_TIMELINE_LAZY_FALLBACK}
                lazyProps={{
                    timelineAccordionExpanded: safeTimelineAccordionExpanded,
                    setTimelineAccordionExpanded: safeSetTimelineAccordionExpanded,
                    startTransition,
                    ChevronUp,
                    Activity,
                    History,
                    debtorBrowserTabsMode,
                    activeTimelineEventsDebtorScoped: mergedTimelineEventsDebtorScoped,
                    activeTimelineEvents: mergedTimelineEvents,
                    EXEC_OVERLAY_LAZY_FALLBACK: EXEC_OVERLAY_INNER_SILENT_FALLBACK,
                    SmartTimelineRadar: LazySmartTimelineRadar,
                    toggleTimelineEventPin,
                    onOpenTimelineModal: directOpenTimelineModal,
                    timelineRadarPreviewLimit: mergedTimelineRadarPreviewLimit,
                    isHistoricalMode,
                    activeTimelineFilter,
                    setActiveTimelineFilter,
                    todayYmd,
                    timelineFilterOptions,
                    PremiumTimelineAuditLog: LazyPremiumTimelineAuditLog,
                    moveTimelineEventToTrash,
                    onRequestEditTimelineEvent: requestEditTimelineEvent,
                    showOnlyActiveFileTimeline,
                    setShowOnlyActiveFileTimeline,
                    subFilesCount: safeSubFilesCount,
                    calendarUserId: safeResolveCalendarUserId(null),
                    executionEntityId: String(currentFileId || ''),
                }}
            />

            <ExecutionLawOverlayEntry
                isEvictionExecutionModule={isEvictionExecutionModule}
                viewExecutionData={viewExecutionData as unknown as Record<string, unknown>}
            />
        </>
    );
}
