import React, { Suspense, startTransition, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
    Activity,
    Book,
    Calendar,
    ChevronUp,
    ClipboardList,
    CreditCard,
    FileText,
    FolderOpen,
    History,
    Scale,
} from '@/app/components/ui/lucideIcons';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { VisitationScheduleBundle } from '@/app/types/visitationSchedule';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import type { ExecutionTimelineFilterLabel } from '@/app/utils/timelineCategoryFilter';
import {
    LazyActionGridSection,
    LazyCustodyRemovalWardsModule,
    LazyLawReferencePanel,
    LazyPremiumTimelineAuditLog,
    LazySmartTimelineRadar,
    LazyTimelineSection,
} from '../executionDashboardLazyRegistry';
import { EXEC_OVERLAY_LAZY_FALLBACK, EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';

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
    setShowVisitationCalendarModal: Dispatch<SetStateAction<boolean>>;
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
    if (!secondaryStageReady) {
        return null;
    }

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

    return (
        <>
            {includeCustodyRemoval &&
            isCustodyRemovalClaimActive &&
            typeof nextTimelineId === 'function' &&
            typeof setTimelineEvents === 'function' &&
            typeof persistExecutionMerge === 'function' ? (
                <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
                    <LazyCustodyRemovalWardsModule
                        executionId={executionId}
                        parentDossierId={parentDossierId}
                        activeSubFileId={activeSubFileId}
                        isInabaActive={isInabaActive}
                        executionData={viewExecutionData}
                        custodyWardNames={custodyWardNamesResolved}
                        timelineEvents={activeTimelineEvents}
                        todayYmd={todayYmd}
                        setTimelineEvents={setTimelineEvents}
                        persistExecutionMerge={persistExecutionMerge}
                        nextTimelineId={nextTimelineId}
                        showToast={showToast}
                    />
                </Suspense>
            ) : null}

            {/* حدود Suspense محلية — شبكة الإجراءات/السجل لا يعلّقان الجسم كله عند chunk بارد */}
            <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
            <LazyActionGridSection
                Book={Book}
                Calendar={Calendar}
                FileText={FileText}
                FolderOpen={FolderOpen}
                Scale={Scale}
                ClipboardList={ClipboardList}
                CreditCard={CreditCard}
                showEmployeeCompulsoryProceduresBanner={showEmployeeCompulsoryProceduresBanner}
                executionToolsTimelineLockedUi={executionToolsTimelineLockedUi}
                executionActionsGridLocked={executionActionsGridLocked}
                setEmployeeCompulsoryBannerDismissed={setEmployeeCompulsoryBannerDismissed}
                showToast={showToast}
                onOpenAppointmentModal={safeOpenAppointmentModal}
                onOpenNotesModal={directOpenNotesModal}
                onOpenDocumentsModal={directOpenDocumentsModal}
                onOpenDecisionsModal={
                    typeof directOpenDecisionsModalWithBoot === 'function'
                        ? () => directOpenDecisionsModalWithBoot({ tab: 'current' })
                        : undefined
                }
                onOpenFinancialCenter={directOpenFinancialCenter}
                onMemoFollowupClick={directHandleMemoFollowupClick}
                showSeizureLogButton={
                    hasUnifiedSeizureLogContent &&
                    !isRepresentingDebtor &&
                    !Boolean(followupSpec.hideDossierFinancialTools)
                }
                onOpenSeizureLog={() => openUnifiedSeizureLog()}
                pinnedNotes={dockPinnedNotes}
                pinnedTasks={dockPinnedTasks}
                onToggleNotePin={toggleCaseNotePin}
                onToggleTaskPin={toggleCaseTaskPin}
                onTrashPinnedNote={moveCaseNoteToTrash}
            />
            </Suspense>

            <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
            <LazyTimelineSection
                timelineAccordionExpanded={safeTimelineAccordionExpanded}
                setTimelineAccordionExpanded={safeSetTimelineAccordionExpanded}
                startTransition={startTransition}
                ChevronUp={ChevronUp}
                Activity={Activity}
                History={History}
                debtorBrowserTabsMode={debtorBrowserTabsMode}
                activeTimelineEventsDebtorScoped={mergedTimelineEventsDebtorScoped}
                activeTimelineEvents={mergedTimelineEvents}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                SmartTimelineRadar={LazySmartTimelineRadar}
                toggleTimelineEventPin={toggleTimelineEventPin}
                onOpenTimelineModal={directOpenTimelineModal}
                timelineRadarPreviewLimit={mergedTimelineRadarPreviewLimit}
                isHistoricalMode={isHistoricalMode}
                activeTimelineFilter={activeTimelineFilter}
                setActiveTimelineFilter={setActiveTimelineFilter}
                todayYmd={todayYmd}
                timelineFilterOptions={timelineFilterOptions}
                PremiumTimelineAuditLog={LazyPremiumTimelineAuditLog}
                moveTimelineEventToTrash={moveTimelineEventToTrash}
                onRequestEditTimelineEvent={requestEditTimelineEvent}
                showOnlyActiveFileTimeline={showOnlyActiveFileTimeline}
                setShowOnlyActiveFileTimeline={setShowOnlyActiveFileTimeline}
                subFilesCount={safeSubFilesCount}
                calendarUserId={safeResolveCalendarUserId(null)}
                executionEntityId={String(currentFileId || '')}
            />
            </Suspense>

            <Suspense fallback={null}>
                <LazyLawReferencePanel
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    viewExecutionData={viewExecutionData as unknown as Record<string, unknown>}
                />
            </Suspense>
        </>
    );
}
