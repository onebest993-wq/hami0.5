// @ts-nocheck
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    startTransition,
    memo,
} from 'react';
import type { Dispatch, ElementType, RefObject, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { useDebtorTags } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorTags';
import { ExecutionPartySpecialActionsMenu } from '@/app/components/lawyer/execution/ExecutionPartySpecialActionsMenu';
import type {
    Debtor,
    ExecutionFile,
    Party,
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type {
    PublicationNoticeBadgeInfo,
    TaklifAssignmentBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import type { ExecutionPartyDisplayNameResult } from '@/app/utils/partyDisplayName';
import { isPartyHeirsEditOnlyMode } from '@/app/utils/partyDisplayName';
import { ExecutionPartyCardFrame } from './ExecutionPartyCardFrame';
import { HeirsQuickViewTrigger } from './HeirsQuickViewTrigger';
import { resolveDebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import {
    dispatchDecisionsReload,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { DebtorSummonsProfile } from '@/app/utils/debtorSummonsProfile';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import type { DebtorLiabilityGroup } from '@/app/utils/debtorLiabilityGroups';
import { debtorShowsUnservedMemoBadge } from '@/app/utils/noticeDebtorScope';
import type { DebtorWorkspaceEntry } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';

type ExpandControlRegistrar = (debtorKey: string, expand: () => void) => () => void;

const DebtorPartyCard = memo(function DebtorPartyCard({
    registerExpandControl,
    debtorKey,
    badgeExtra,
    collapsed,
    expanded,
}: {
    registerExpandControl: ExpandControlRegistrar;
    debtorKey: string;
    badgeExtra: React.ReactNode;
    collapsed: React.ReactNode;
    expanded: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    const toggle = useCallback(() => {
        startTransition(() => setOpen((v) => !v));
    }, []);

    useEffect(() => {
        return registerExpandControl(debtorKey, () => {
            startTransition(() => setOpen(true));
        });
    }, [debtorKey, registerExpandControl]);

    return (
        <ExecutionPartyCardFrame
            variant="debtor"
            roleLabel="المدين"
            badgeExtra={badgeExtra}
            isOpen={open}
            onToggle={toggle}
            expandAriaLabel={open ? 'طي بيانات المدين' : 'توسيع بيانات المدين'}
            expandedPanel={open ? expanded : undefined}
        >
            {collapsed}
        </ExecutionPartyCardFrame>
    );
});

type DebtorWorkspaceEntry = {
    key: string;
    d: Debtor;
    isPrimary: boolean;
    fileDebtorIndex: number | null;
    unified: { name: string };
};

type SummonsMarker = {
    id: string;
    date: string;
    purpose: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
    recordedAt?: string;
};

type PublicationNoticeState = {
    publicationDateYmd: string;
    newspaper1: string;
    newspaper2: string;
    recordedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
};

type EmployeeAssignmentState = {
    phase: TaklifAssignmentBadgeInfo['phase'] | 'none';
    purpose?: string;
    notifyDate?: string;
    deadlineDate?: string;
    durationDays?: number;
    taklifCycleGeneration?: number;
    confirmedAt?: string;
    badgeHiddenAt?: string;
    periodEndedAt?: string;
    arrestOrderRecorded?: boolean;
};

type MemoNoticeBadge = {
    anchor: string;
    remaining: number;
    graceExpired: boolean;
};

type DebtorsSectionProps = {
    Bell: ElementType;
    Calendar: ElementType;
    DebtorSeizureCategoryBadges: ElementType;
    ExecutionPartyInteractiveBadges: ElementType;
    MapPin: ElementType;
    PartyOverflowToggle: ElementType;
    Phone: ElementType;
    X: ElementType;
    activeCoerciveActions: unknown[];
    activeDebtorHeirsForNotification: unknown[];
    activeDebtorIsDeceased: boolean;
    activeNoticeState: string;
    activeTimelineEvents: TimelineEvent[];
    activeTimelineEventsDebtorScoped: TimelineEvent[];
    buildDebtorSummonsMarkerPatchForKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        primaryDebtorKeyResolved: string,
        next: SummonsMarker
    ) => Record<string, unknown>;
    buildEmployeeAssignmentPatchForDebtorKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        assignment: EmployeeAssignmentState,
        primaryDebtorKeyResolved: string
    ) => Record<string, unknown>;
    buildPartyHeirsRows: (party: Party, kind: 'debtor' | 'creditor') => unknown[];
    buildPublicationNoticePatchForDebtorKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        next: PublicationNoticeState
    ) => Record<string, unknown>;
    claimType: string;
    clearDebtorSummonsMarker: () => void;
    completeEvictionResidentialGrace: () => void;
    completePoliceAssistance: () => void;
    computeTaklifDeadlineYmd: (notifyDateYmd: string, durationDays: number) => string;
    daysRemainingUntilDeadline: (deadlineYmd: string) => number;
    debtorArrested: boolean;
    debtorAttendedVoluntarily: boolean;
    debtorBrowserTabsMode: boolean;
    liabilityGroupTabsMode?: boolean;
    debtorLiabilityGroups?: DebtorLiabilityGroup[];
    debtorDeathMenuLabel: string;
    debtorEmploymentToggleMenuLabel: (isEmployee: boolean, initial?: boolean) => string;
    debtorForcedToAttend: boolean;
    debtorSummonsMarkerLocal: SummonsMarker | null;
    debtorSummonsProfile: DebtorSummonsProfile;
    debtorWorkspaceChipStripRef: RefObject<HTMLDivElement | null>;
    debtorWorkspaceEntries: DebtorWorkspaceEntry[];
    decisionsReloadEpoch: number;
    decisionsStorageExecutionId: string;
    dismissDebtorAbsenceBadge: () => void;
    effectiveDebtors: Debtor[];
    evictionGraceBadgeInfo: unknown;
    evictionGracePinned: boolean;
    executionAppealBanner: { show: boolean; label: string };
    executionData: ExecutionFile | null;
    executionDebtorTabIndex: number;
    executionId: string;
    executionMemoBadgePopoverOpen: boolean;
    executionToolsTimelineLockedUi: boolean;
    forcedAttendanceIssued: boolean;
    forcedPathAttendanceSecured: boolean;
    getDebtorSummonsMarkerForKey: (
        executionData: ExecutionFile | null,
        debtorKey: string,
        primaryDebtorKeyResolved: string
    ) => SummonsMarker | null;
    getDebtorSummonsProfile: (params: {
        isGovernmentEmployee: boolean;
        parsedDebtAmount: number;
        parsedLawyerFees: number;
        claimType: string;
        isNonFinancialClaim: boolean;
    }) => DebtorSummonsProfile;
    getEmployeeAssignmentForDebtorKey: (
        executionData: ExecutionFile | null,
        debtorKey: string,
        primaryDebtorKeyResolved: string
    ) => EmployeeAssignmentState | null;
    getExecutionPartyDisplayName: (
        party: Party | undefined,
        role: 'creditor' | 'debtor',
        index: number,
        file: ExecutionFile | null | undefined
    ) => ExecutionPartyDisplayNameResult;
    getPersonalCoerciveSubtypeOutcome: (
        executionId: string,
        subtype: PersonalCoerciveSubtype,
        options?: { debtorKey?: string; primaryDebtorKey?: string }
    ) => { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean };
    getPublicationNoticeForDebtorKey: (
        executionData: ExecutionFile | null,
        debtorKey: string
    ) => PublicationNoticeState | null;
    handleDebtorDeathMenuAction: () => void;
    handleDebtorEmploymentToggle: (payload: { debtorKey: string; isPrimary: boolean }) => void;
    heirsDetailsIncludeClient: (heirsDetails: Party['heirs_details']) => boolean;
    isAssignmentDeadlinePassed: (deadlineYmd: string) => boolean;
    isDebtorGovernmentEmployee: boolean;
    isDebtorRowEmployee: (debtor: Debtor | undefined) => boolean;
    isEvictionExecutionModule: boolean;
    isHistoricalMode: boolean;
    isNonFinancialClaim: boolean;
    /** وكيل المدين — إخفاء التبليغ وصفة طبيعي/معنوي */
    isRepresentingDebtor?: boolean;
    multiDebtorMode: boolean;
    nextTimelineId: () => string;
    openEditParty: (
        kind: 'debtor' | 'creditor',
        index: number,
        opts?: { forceHeirs?: boolean; party?: Party },
    ) => void;
    openEvictionResidentialGraceModal: () => void;
    openHeirsNotificationCenter: () => void;
    openHeirsQuickView: (party: Party, kind: 'debtor' | 'creditor', title: string) => void;
    openPoliceAssistanceFromBadge: () => void;
    parsedLawyerFees: number;
    partyBadgesExecutionId: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => void;
    policeAssistanceBadgeInfo: unknown;
    primaryDebtorAbsenceBadge: unknown;
    primaryDebtorKeyResolved: string;
    primaryMemoNoticeBadge: MemoNoticeBadge | null;
    principalDebtAmount: number;
    publicationNoticeDeadlineYmd: (publicationDateYmd: string) => string;
    pushTimelineEvent: (event: TimelineEvent) => void;
    realEstateSeizureAssets: RealEstateSeizureAsset[];
    saveSummonsMarkerPurposeEdit: () => void;
    seizedAssets: SeizedAsset[];
    setDebtorSummonsMarkerLocal: Dispatch<SetStateAction<SummonsMarker | null>>;
    onOpenDecisionsAppealsTab: () => void;
    setEvictionGraceDecisionId: Dispatch<SetStateAction<string | null>>;
    setExecutionDebtorTabIndex: Dispatch<SetStateAction<number>>;
    setExecutionMemoBadgePopoverOpen: Dispatch<SetStateAction<boolean>>;
    setShowExtraDebtors: Dispatch<SetStateAction<boolean>>;
    setShowUnifiedSummonsModal: (show: boolean) => void;
    setSummonsContextDebtorKey: (debtorKey: string | null) => void;
    setSummonsHubInitialMainTab: Dispatch<
        SetStateAction<'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null>
    >;
    setSummonsMarkerPopoverOpen: Dispatch<SetStateAction<boolean>>;
    setSummonsPurposeDraft: Dispatch<SetStateAction<string>>;
    showDebtorSummonsAttendanceBadge: boolean;
    showDebtorUnservedMemoBadge: boolean;
    showExtraDebtors: boolean;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    smExecutionTarget: string | null;
    smHasGuarantorFile: boolean;
    hideAllGuarantorPresence?: boolean;
    standaloneExecutionMarks: StandaloneExecutionMark[];
    summonsMarkerPopoverOpen: boolean;
    summonsPurposeDraft: string;
    thirdPartySeizureAssets: ThirdPartySeizureAsset[];
    thirdPartySeizures?: ThirdPartySeizure[];
    timelineDebtorMetadata: (debtorKey: string) => Record<string, unknown>;
    toggleEvictionGracePinned: () => void;
    viewExecutionData: ExecutionFile | null;
    voluntaryAttendanceCount: number;
    noticeVoluntaryPeriodEndOptimistic?: boolean;
    voluntaryEndOptimistic?: boolean;
};

export type DebtorsSectionHandle = {
    expandDebtor: (debtorKey: string) => void;
};

export const DebtorsSection = forwardRef<DebtorsSectionHandle, DebtorsSectionProps>(function DebtorsSection(
    props,
    ref
) {
    const expandControlsRef = useRef(new Map<string, () => void>());

    const registerExpandControl = useCallback<ExpandControlRegistrar>((debtorKey, expand) => {
        expandControlsRef.current.set(debtorKey, expand);
        return () => {
            expandControlsRef.current.delete(debtorKey);
        };
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            expandDebtor: (debtorKey: string) => {
                expandControlsRef.current.get(debtorKey)?.();
            },
        }),
        []
    );

    const {
        Bell,
        Calendar,
        DebtorSeizureCategoryBadges,
        ExecutionPartyInteractiveBadges,
        MapPin,
        PartyOverflowToggle,
        Phone,
        X,
        activeCoerciveActions,
        activeDebtorHeirsForNotification,
        activeDebtorIsDeceased,
        activeNoticeState,
        activeTimelineEvents,
        activeTimelineEventsDebtorScoped,
        buildDebtorSummonsMarkerPatchForKey,
        buildEmployeeAssignmentPatchForDebtorKey,
        buildPartyHeirsRows,
        buildPublicationNoticePatchForDebtorKey,
        claimType,
        clearDebtorSummonsMarker,
        completeEvictionResidentialGrace,
        completePoliceAssistance,
        computeTaklifDeadlineYmd,
        daysRemainingUntilDeadline,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorBrowserTabsMode,
        liabilityGroupTabsMode = false,
        debtorLiabilityGroups = [],
        debtorDeathMenuLabel,
        debtorEmploymentToggleMenuLabel,
        debtorForcedToAttend,
        debtorSummonsMarkerLocal,
        debtorSummonsProfile,
        debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        dismissDebtorAbsenceBadge,
        effectiveDebtors,
        evictionGraceBadgeInfo,
        evictionGracePinned,
        executionAppealBanner,
        executionData,
        executionDebtorTabIndex,
        executionId,
        executionMemoBadgePopoverOpen,
        executionToolsTimelineLockedUi,
        forcedAttendanceIssued,
        forcedPathAttendanceSecured,
        getDebtorSummonsMarkerForKey,
        getDebtorSummonsProfile,
        getEmployeeAssignmentForDebtorKey,
        getExecutionPartyDisplayName,
        getPersonalCoerciveSubtypeOutcome,
        getPublicationNoticeForDebtorKey,
        handleDebtorDeathMenuAction,
        handleDebtorEmploymentToggle,
        heirsDetailsIncludeClient,
        isAssignmentDeadlinePassed,
        isDebtorGovernmentEmployee,
        isDebtorRowEmployee,
        isEvictionExecutionModule,
        isHistoricalMode,
        isNonFinancialClaim,
        isRepresentingDebtor = false,
        multiDebtorMode,
        nextTimelineId,
        openEditParty,
        openEvictionResidentialGraceModal,
        openHeirsNotificationCenter,
        openHeirsQuickView,
        openPoliceAssistanceFromBadge,
        parsedLawyerFees,
        partyBadgesExecutionId,
        persistExecutionMerge,
        persistGuarantorFollowupDetails,
        policeAssistanceBadgeInfo,
        primaryDebtorAbsenceBadge,
        primaryDebtorKeyResolved,
        primaryMemoNoticeBadge,
        principalDebtAmount,
        publicationNoticeDeadlineYmd,
        pushTimelineEvent,
        realEstateSeizureAssets,
        saveSummonsMarkerPurposeEdit,
        seizedAssets,
        setDebtorSummonsMarkerLocal,
        onOpenDecisionsAppealsTab,
        setEvictionGraceDecisionId,
        setExecutionDebtorTabIndex,
        setExecutionMemoBadgePopoverOpen,
        setShowExtraDebtors,
        setShowUnifiedSummonsModal,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setSummonsMarkerPopoverOpen,
        setSummonsPurposeDraft,
        showDebtorSummonsAttendanceBadge,
        showDebtorUnservedMemoBadge,
        showExtraDebtors,
        showToast,
        smExecutionTarget,
        smHasGuarantorFile,
        hideAllGuarantorPresence = false,
        standaloneExecutionMarks,
        summonsMarkerPopoverOpen,
        summonsPurposeDraft,
        thirdPartySeizureAssets,
        thirdPartySeizures,
        timelineDebtorMetadata,
        toggleEvictionGracePinned,
        viewExecutionData,
        voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic = false,
        voluntaryEndOptimistic = false,
    } = props;

    const {
        customTags,
        setCustomTags,
        tagInputOpen,
        setTagInputOpen,
        tagDrafts,
        setTagDrafts,
        debtorTags,
        handleAddTag,
        handleRemoveTag,
    } = useDebtorTags();

    const custodyRemovalClaimActive = useMemo(
        () => isCustodyRemovalExecutionClaim(executionData, claimType),
        [executionData, claimType]
    );

    const activeLiabilityGroupEntries = useMemo((): DebtorWorkspaceEntry[] => {
        if (!liabilityGroupTabsMode || debtorLiabilityGroups.length === 0) return [];
        return (
            debtorLiabilityGroups[executionDebtorTabIndex]?.entries ??
            debtorLiabilityGroups[0]?.entries ??
            []
        );
    }, [liabilityGroupTabsMode, debtorLiabilityGroups, executionDebtorTabIndex]);

    const debtorRowsToRender = useMemo((): Array<DebtorWorkspaceEntry | Debtor> => {
        if (liabilityGroupTabsMode) {
            return activeLiabilityGroupEntries;
        }
        if (debtorBrowserTabsMode) {
            return debtorWorkspaceEntries.slice(
                executionDebtorTabIndex,
                executionDebtorTabIndex + 1,
            );
        }
        if (multiDebtorMode) {
            return debtorWorkspaceEntries;
        }
        return effectiveDebtors;
    }, [
        liabilityGroupTabsMode,
        activeLiabilityGroupEntries,
        debtorBrowserTabsMode,
        debtorWorkspaceEntries,
        executionDebtorTabIndex,
        multiDebtorMode,
        effectiveDebtors,
    ]);

    return (
        <>
{/* DEBTOR CARD — PRIMARY DEBTOR: renders the main debtor card (most important card). Note: uses its own div.. */}
                    <div className="mx-3 mt-3.5 space-y-1.5">
                            <div className="space-y-1.5">
                                {debtorBrowserTabsMode &&
                                (liabilityGroupTabsMode
                                    ? debtorLiabilityGroups.length > 0
                                    : debtorWorkspaceEntries.length > 0) ? (
                                    <div
                                        ref={debtorWorkspaceChipStripRef}
                                        className="scrollbar-hide flex gap-1 overflow-x-auto rounded-xl border border-rose-500/25 bg-slate-950/40 p-1.5"
                                        dir="rtl"
                                    >
                                        {(liabilityGroupTabsMode
                                            ? debtorLiabilityGroups
                                            : debtorWorkspaceEntries
                                        ).map((item, ti) => (
                                            <button
                                                key={
                                                    liabilityGroupTabsMode
                                                        ? (item as DebtorLiabilityGroup).tabKey
                                                        : (item as DebtorWorkspaceEntry).key
                                                }
                                                type="button"
                                                onClick={() => setExecutionDebtorTabIndex(ti)}
                                                className={`shrink-0 rounded-lg border px-3 py-2 text-[10px] font-bold transition-all ${
                                                    executionDebtorTabIndex === ti
                                                        ? 'border-rose-500/50 bg-rose-950/45 text-rose-50'
                                                        : 'border-transparent bg-slate-800/60 text-slate-400 hover:border-rose-500/25'
                                                }`}
                                            >
                                                {liabilityGroupTabsMode
                                                    ? (item as DebtorLiabilityGroup).label
                                                    : (item as DebtorWorkspaceEntry).unified.name}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {debtorRowsToRender.map((raw: DebtorWorkspaceEntry | Debtor, loopIdx: number) => {
                                            if (
                                                !multiDebtorMode &&
                                                effectiveDebtors.length > 2 &&
                                                !showExtraDebtors &&
                                                loopIdx >= 2
                                            ) {
                                                return null;
                                            }
                                            const wsDebt = multiDebtorMode;
                                            const wsRow = raw as DebtorWorkspaceEntry;
                                            const d: Debtor = wsDebt ? wsRow.d : (raw as Debtor);
                                            const fileDebtorOrdinal = wsDebt
                                                ? Math.max(
                                                      0,
                                                      debtorWorkspaceEntries.findIndex(
                                                          (e) => e.key === wsRow.key,
                                                      ),
                                                  )
                                                : loopIdx;
                                            const idx = wsDebt ? fileDebtorOrdinal : loopIdx;
                                            const isPrimary = wsDebt ? wsRow.isPrimary : loopIdx === 0;
                                            /** ثابت لجميع الدورات: نمرر primaryDebtorStableKey كبديل لـ debtorWorkspaceEntries[0].key */
                                            const primaryDebtorStableKey = (() => {
                                                const primaryId = (
                                                    effectiveDebtors[0] as Debtor | undefined
                                                )?.id;
                                                return primaryId != null &&
                                                    String(primaryId).trim() !== ''
                                                    ? String(primaryId)
                                                    : 'primary_debtor';
                                            })();
                                            const debtorKey = wsDebt
                                                ? wsRow.key
                                                : isPrimary
                                                  ? primaryDebtorStableKey
                                                  : d.id != null && String(d.id) !== ''
                                                    ? String(d.id)
                                                    : `d-${idx}`;
                                            const debtorDisp = getExecutionPartyDisplayName(
                                                d as Party,
                                                'debtor',
                                                fileDebtorOrdinal,
                                                executionData
                                            );
                                            const debtorHeirsRows = buildPartyHeirsRows(d as Party, 'debtor');
                                            const debtorHasHeirs = debtorHeirsRows.length > 0;
                                            const debtorHeirsWord =
                                                debtorHasHeirs
                                                    ? debtorHeirsRows.length > 1
                                                        ? 'ورثة'
                                                        : 'وريث'
                                                    : null;
                                            const debtorHeirsEditOnly = isPartyHeirsEditOnlyMode(
                                                executionData,
                                                'debtor',
                                                d as Party,
                                                idx,
                                                decisionsStorageExecutionId
                                            );
                                            const debtorPartyPreserveAppealInline =
                                                debtorHasHeirs || debtorDisp.showDeceasedGlyph;
                                            /** منطق الموظف: يحقق إذا كان المدين موظف حكومي (لحجز الراتب) */
                                            const useRowScopedExecProfile =
                                                debtorBrowserTabsMode || (!isPrimary && wsDebt);
                                            const rowOccLower = String(
                                                (d as { occupation?: string }).occupation || ''
                                            ).toLowerCase();
                                            const rowIsGovEmp =
                                                rowOccLower.includes('موظف') ||
                                                rowOccLower.includes('موظفة') ||
                                                rowOccLower === 'موظف';
                                            const rowIsRetired =
                                                rowOccLower.includes('متقاعد') ||
                                                rowOccLower.includes('تقاعد');
                                            const rowIsEmployee = (() => {
                                                if (!executionData) {
                                                    return isDebtorRowEmployee(
                                                        effectiveDebtors[0] as Debtor | undefined
                                                    );
                                                }
                                                if (isPrimary) {
                                                    return isDebtorRowEmployee(
                                                        (executionData.debtors?.[0] as Debtor | undefined) ??
                                                            d
                                                    );
                                                }
                                                const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                                                    (a) => String(a.id) === debtorKey
                                                );
                                                if (ad) return isDebtorRowEmployee(ad);
                                                return isDebtorRowEmployee(d);
                                            })();
                                            const rowInitialWasEmployee = (() => {
                                                if (!executionData) return undefined;
                                                if (isPrimary) {
                                                    const p = executionData.debtors?.[0] as Debtor | undefined;
                                                    return typeof p?.employmentInitialWasEmployee === 'boolean'
                                                        ? p.employmentInitialWasEmployee
                                                        : undefined;
                                                }
                                                const adInit =
                                                    executionData.party_multiplicity?.additionalDebtors?.find(
                                                        (a) => String(a.id) === debtorKey
                                                    );
                                                return adInit &&
                                                    typeof adInit.employmentInitialWasEmployee === 'boolean'
                                                    ? adInit.employmentInitialWasEmployee
                                                    : undefined;
                                            })();
                                            const rowEmploymentToggleLabel = debtorEmploymentToggleMenuLabel(
                                                rowIsEmployee,
                                                rowInitialWasEmployee
                                            );
                                            const rowEntityKind = resolveDebtorEntityKind({
                                                executionData,
                                                debtor: d,
                                                debtorKey,
                                            });
                                            const rowIsLegalEntity = rowEntityKind === 'legal_entity';
                                            const rowDebtorSummonsProfile = useRowScopedExecProfile
                                                ? getDebtorSummonsProfile({
                                                      isGovernmentEmployee: rowIsGovEmp || rowIsRetired,
                                                      parsedDebtAmount: principalDebtAmount,
                                                      parsedLawyerFees,
                                                      claimType: claimType || '',
                                                      isNonFinancialClaim,
                                                  })
                                                : debtorSummonsProfile;
                                            const rowIsDeceased = Boolean(
                                                (d as { isDeceased?: boolean })?.isDeceased ||
                                                    (isPrimary && executionData?.is_debtor_deceased)
                                            );
                                            const showDebtorNotificationPanel =
                                                (isPrimary || debtorBrowserTabsMode) &&
                                                !rowIsDeceased &&
                                                !isRepresentingDebtor;
                                            const rowShowUnservedMemoBadge = showDebtorNotificationPanel
                                                ? debtorShowsUnservedMemoBadge(
                                                      viewExecutionData ?? executionData,
                                                      debtorKey,
                                                      primaryDebtorKeyResolved,
                                                      {
                                                          isEviction: isEvictionExecutionModule,
                                                          debtorAttendedVoluntarily,
                                                          voluntaryAttendanceCount,
                                                          noticeVoluntaryPeriodEndOptimistic,
                                                          evictionVoluntaryEndOptimistic: voluntaryEndOptimistic,
                                                      },
                                                  )
                                                : false;
                                            const rowPublicationNoticeBadge: PublicationNoticeBadgeInfo | null =
                                                (() => {
                                                    if (rowIsDeceased) return null;
                                                    const st = getPublicationNoticeForDebtorKey(
                                                        executionData,
                                                        debtorKey
                                                    );
                                                    if (!st?.publicationDateYmd) return null;
                                                    const deadlineYmd = publicationNoticeDeadlineYmd(
                                                        st.publicationDateYmd
                                                    );
                                                    const graceExpired = isAssignmentDeadlinePassed(deadlineYmd);
                                                    const remaining = daysRemainingUntilDeadline(deadlineYmd);
                                                    return {
                                                        publicationDateYmd: st.publicationDateYmd,
                                                        deadlineYmd,
                                                        remaining,
                                                        graceExpired,
                                                        newspaper1: st.newspaper1,
                                                        newspaper2: st.newspaper2,
                                                        recordedAt: st.recordedAt,
                                                        badgeHiddenAt: st.badgeHiddenAt,
                                                        periodEndedAt: st.periodEndedAt,
                                                    };
                                                })();
                                            const rowTaklifAssignmentBadge: TaklifAssignmentBadgeInfo | null =
                                                (() => {
                                                    if (rowIsDeceased || !executionData) return null;
                                                    const ta = getEmployeeAssignmentForDebtorKey(
                                                        executionData,
                                                        debtorKey,
                                                        primaryDebtorKeyResolved
                                                    );
                                                    if (!ta || ta.phase === 'none') return null;
                                                    const dlYmd =
                                                        ta.notifyDate != null && ta.notifyDate !== ''
                                                            ? computeTaklifDeadlineYmd(
                                                                  ta.notifyDate,
                                                                  ta.durationDays ?? 1
                                                              )
                                                            : ta.deadlineDate || '';
                                                    let remainingDays: number | null = null;
                                                    if (ta.phase === 'active' && dlYmd) {
                                                        remainingDays = isAssignmentDeadlinePassed(dlYmd)
                                                            ? 0
                                                            : daysRemainingUntilDeadline(dlYmd);
                                                    }
                                                    return {
                                                        purpose: ta.purpose ?? '',
                                                        notifyDateYmd: ta.notifyDate ?? '',
                                                        deadlineYmd: dlYmd,
                                                        phase: ta.phase,
                                                        remainingDays,
                                                        cycleGeneration: ta.taklifCycleGeneration,
                                                        confirmedAt: ta.confirmedAt,
                                                        badgeHiddenAt: ta.badgeHiddenAt,
                                                        periodEndedAt: ta.periodEndedAt,
                                                        durationDays: ta.durationDays ?? 1,
                                                    };
                                                })();
                                            const rowForcedBringDecisionState =
                                                getPersonalCoerciveSubtypeOutcome(
                                                    executionData?.id ?? executionId,
                                                    'forced_bring_in',
                                                    {
                                                        debtorKey: String(debtorKey),
                                                        primaryDebtorKey: primaryDebtorKeyResolved,
                                                    }
                                                );
                                            let rowMemoNoticeBadge =
                                                isPrimary && !rowIsDeceased
                                                    ? primaryMemoNoticeBadge
                                                    : null;
                                            const rowAbsenceNoticeBadge =
                                                isPrimary && !rowIsDeceased
                                                    ? primaryDebtorAbsenceBadge
                                                    : null;
                                            let rowShowSummonsBadge =
                                                !rowIsDeceased &&
                                                Boolean(
                                                    getDebtorSummonsMarkerForKey(
                                                        executionData,
                                                        debtorKey,
                                                        primaryDebtorKeyResolved
                                                    )
                                                );
                                            let rowRegularTablighBadge =
                                                !rowIsDeceased && executionData
                                                    ? (() => {
                                                          const m = getDebtorSummonsMarkerForKey(
                                                              executionData,
                                                              debtorKey,
                                                              primaryDebtorKeyResolved
                                                          );
                                                          if (!m?.date) return null;
                                                          return {
                                                              noticeDateYmd: String(m.date),
                                                              purpose: String(m.purpose || 'تبليغ'),
                                                              recordedAt: (m as { recordedAt?: string })
                                                                  .recordedAt,
                                                              badgeHiddenAt: (m as { badgeHiddenAt?: string })
                                                                  .badgeHiddenAt,
                                                              periodEndedAt: (m as { periodEndedAt?: string })
                                                                  .periodEndedAt,
                                                          };
                                                      })()
                                                    : null;
                                            let rowPublicationNoticeBadgeResolved =
                                                rowIsDeceased ? null : rowPublicationNoticeBadge;
                                            if (rowTaklifAssignmentBadge) {
                                                rowMemoNoticeBadge = null;
                                                rowPublicationNoticeBadgeResolved = null;
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowPublicationNoticeBadgeResolved) {
                                                rowMemoNoticeBadge = null;
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowMemoNoticeBadge) {
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                            } else if (rowRegularTablighBadge) {
                                                rowShowSummonsBadge = true;
                                            }
                                            if (isRepresentingDebtor) {
                                                rowShowSummonsBadge = false;
                                                rowRegularTablighBadge = null;
                                                rowMemoNoticeBadge = null;
                                                rowPublicationNoticeBadgeResolved = null;
                                            }
                                            const rowForcedAttendancePending = rowIsEmployee
                                                ? (() => {
                                                      const ra = executionData
                                                          ? getEmployeeAssignmentForDebtorKey(
                                                                executionData,
                                                                debtorKey,
                                                                primaryDebtorKeyResolved
                                                            )
                                                          : null;
                                                      const warrantOk =
                                                          ra?.phase === 'warrant_ui' &&
                                                          ra?.arrestOrderRecorded;
                                                      if (!warrantOk) return false;
                                                      if (rowForcedBringDecisionState.pending) return true;
                                                      if (!isPrimary) return false;
                                                      return (
                                                          rowForcedBringDecisionState.approved &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'brought' &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'absconded'
                                                      );
                                                  })()
                                                : (() => {
                                                      const attendanceResolved = isPrimary
                                                          ? debtorAttendedVoluntarily ||
                                                            forcedPathAttendanceSecured ||
                                                            debtorForcedToAttend ||
                                                            voluntaryAttendanceCount > 0
                                                          : false;
                                                      if (attendanceResolved) return false;
                                                      const forcedIndicator = isPrimary
                                                          ? forcedAttendanceIssued ||
                                                            activeNoticeState === 'forced_attendance' ||
                                                            Boolean(executionData?.forcedAttendanceIssued)
                                                          : false;
                                                      if (forcedIndicator) return true;
                                                      if (rowForcedBringDecisionState.pending) return true;
                                                      if (!isPrimary) return false;
                                                      return (
                                                          rowForcedBringDecisionState.approved &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'brought' &&
                                                          executionData?.forced_bring_in_personal_outcome !==
                                                              'absconded'
                                                      );
                                                  })();
                                            const debtorBadgeExtra =
                                                debtorWorkspaceEntries.length > 1 ? (
                                                    <span className="tabular-nums text-[10px] font-bold opacity-90">
                                                        {fileDebtorOrdinal + 1}
                                                    </span>
                                                ) : null;
                                            return (
                                            <div key={debtorKey} className="mt-2 w-full" dir="rtl">
                                            <DebtorPartyCard
                                                debtorKey={debtorKey}
                                                registerExpandControl={registerExpandControl}
                                                badgeExtra={debtorBadgeExtra}
                                                collapsed={
                                                    <div
                                                        className="flex w-full items-center justify-between gap-2"
                                                        dir="rtl"
                                                    >
                                                        {isPrimary && (
                                                            <div
                                                                className="flex min-w-0 flex-1 flex-col items-stretch gap-0 text-right"
                                                            >
                                                                <div
                                                                    className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        {debtorHeirsWord ? (
                                                                            <HeirsQuickViewTrigger
                                                                                label={debtorHeirsWord}
                                                                                onOpen={() =>
                                                                                    openHeirsQuickView(
                                                                                        d as Party,
                                                                                        'debtor',
                                                                                        'ورثة المدين'
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : null}
                                                                        <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white block">
                                                                            {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                            {(debtorHasHeirs
                                                                                ? heirsDetailsIncludeClient(
                                                                                      d.heirs_details
                                                                                  )
                                                                                : d.isClient) &&
                                                                            !rowIsLegalEntity &&
                                                                            !debtorDisp.showDeceasedGlyph ? (
                                                                                <span
                                                                                    className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                                                    title="موكلي"
                                                                                    aria-label="موكلي"
                                                                                >
                                                                                    ★
                                                                                </span>
                                                                            ) : null}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className="flex flex-wrap justify-center items-center gap-1.5 mt-1"
                                                                    onClick={e => e.stopPropagation()}
                                                                    onKeyDown={e => e.stopPropagation()}
                                                                    role="presentation"
                                                                    dir="rtl"
                                                                >
                                                                    {!isRepresentingDebtor ? (
                                                                        <>
                                                                            {debtorTags(debtorKey).map(tag => (
                                                                                <span key={tag} className="inline-flex items-center gap-1 border border-dashed border-gray-500/50 text-gray-400 bg-transparent px-2 py-0.5 rounded text-[10px] leading-tight select-none">
                                                                                    {tag}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRemoveTag(debtorKey, tag)}
                                                                                        className="text-gray-500 hover:text-rose-300 transition-colors leading-none"
                                                                                    >
                                                                                        ✕
                                                                                    </button>
                                                                                </span>
                                                                            ))}
                                                                            {tagInputOpen[debtorKey] ? (
                                                                                <span className="inline-flex items-center gap-1">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={tagDrafts[debtorKey] ?? ''}
                                                                                        onChange={e => setTagDrafts(prev => ({ ...prev, [debtorKey]: e.target.value }))}
                                                                                        onKeyDown={e => {
                                                                                            if (e.key === 'Enter') { e.preventDefault(); handleAddTag(debtorKey); }
                                                                                            if (e.key === 'Escape') { setTagInputOpen(prev => ({ ...prev, [debtorKey]: false })); setTagDrafts(prev => ({ ...prev, [debtorKey]: '' })); }
                                                                                        }}
                                                                                        placeholder="وسم..."
                                                                                        className="w-20 rounded border border-dashed border-gray-500/40 bg-transparent px-1.5 py-0.5 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-amber-400/40 focus:outline-none"
                                                                                        autoFocus
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleAddTag(debtorKey)}
                                                                                        className="text-[10px] text-gray-500 hover:text-emerald-300 transition-colors"
                                                                                    >
                                                                                        حفظ
                                                                                    </button>
                                                                                </span>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => { setTagDrafts(prev => ({ ...prev, [debtorKey]: '' })); setTagInputOpen(prev => ({ ...prev, [debtorKey]: true })); }}
                                                                                    className="inline-flex items-center gap-0.5 border border-dashed border-gray-500/30 text-gray-500 bg-transparent px-1.5 py-0.5 rounded text-[10px] leading-tight hover:border-gray-400/50 hover:text-gray-300 transition-colors"
                                                                                >
                                                                                    + إضافة وسم
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    ) : null}
                                                                    {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                        <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                            متوفى
                                                                        </span>
                                                                    ) : null}
                                                                    {debtorPartyPreserveAppealInline &&
                                                                    executionAppealBanner.show ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onOpenDecisionsAppealsTab();
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                                                                            title={`طعن ساري: ${executionAppealBanner.label} — افتح مركز الطعون`}
                                                                        >
                                                                            {executionAppealBanner.label}
                                                                        </button>
                                                                    ) : null}
                                                                    {showDebtorNotificationPanel &&
                                                                    rowShowUnservedMemoBadge ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (isPrimary) {
                                                                                    setSummonsMarkerPopoverOpen(false);
                                                                                    setExecutionMemoBadgePopoverOpen(true);
                                                                                } else {
                                                                                    setSummonsContextDebtorKey(String(debtorKey));
                                                                                    setSummonsHubInitialMainTab('tabligh');
                                                                                    setShowUnifiedSummonsModal(true);
                                                                                }
                                                                            }}
                                                                            className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                            title="لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ"
                                                                        >
                                                                            غير مبلّغ
                                                                        </button>
                                                                    ) : null}
                                                                    {null}
                                                                </div>
                                                                {(() => {
                                                                    if (isRepresentingDebtor) return null;
                                                                    const hasSeizureBadges =
                                                                        (seizedAssets?.length || 0) > 0 ||
                                                                        (realEstateSeizureAssets?.length || 0) > 0 ||
                                                                        (thirdPartySeizureAssets?.length || 0) > 0 ||
                                                                        (thirdPartySeizures?.length || 0) > 0 ||
                                                                        (standaloneExecutionMarks?.length || 0) > 0;
                                                                    const showInteractive = Boolean(isPrimary || debtorBrowserTabsMode);
                                                                    if (!hasSeizureBadges && !showInteractive) return null;
                                                                    return (
                                                                        <div
                                                                            className="mt-2 flex flex-row-reverse flex-wrap items-center justify-start gap-2"
                                                                            dir="rtl"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            onKeyDown={(e) => e.stopPropagation()}
                                                                            role="presentation"
                                                                        >
                                                                            {showInteractive ? (
                                                                                <ExecutionPartyInteractiveBadges
                                                                                    embeddedInRow
                                                                                    executionId={partyBadgesExecutionId}
                                                                                    party="debtor"
                                                                                    isPrimaryDebtor={isPrimary}
                                                                                    executionData={viewExecutionData}
                                                                                    activeCoerciveActions={activeCoerciveActions}
                                                                                    seizedAssets={seizedAssets}
                                                                                    realEstateSeizureAssets={realEstateSeizureAssets}
                                                                                    thirdPartySeizureAssets={thirdPartySeizureAssets}
                                                                                    standaloneExecutionMarks={standaloneExecutionMarks}
                                                                                    timelineEvents={
                                                                                        debtorBrowserTabsMode
                                                                                            ? activeTimelineEventsDebtorScoped
                                                                                            : activeTimelineEvents
                                                                                    }
                                                                                    hasGuarantor={
                                                                                        hideAllGuarantorPresence
                                                                                            ? false
                                                                                            : Boolean(
                                                                                                  smHasGuarantorFile ||
                                                                                                      (
                                                                                                          effectiveDebtors[0] as
                                                                                                              | Debtor
                                                                                                              | undefined
                                                                                                      )?.hasGuarantor ||
                                                                                                      (typeof smExecutionTarget ===
                                                                                                          'string' &&
                                                                                                          smExecutionTarget.includes(
                                                                                                              'حضور'
                                                                                                          )) ||
                                                                                                      executionData
                                                                                                          ?.guarantor_followup
                                                                                                          ?.executor_approved
                                                                                              )
                                                                                    }
                                                                                    memoBadge={rowMemoNoticeBadge}
                                                                                    onMemoActivate={() => {
                                                                                        setSummonsMarkerPopoverOpen(false);
                                                                                        setExecutionMemoBadgePopoverOpen(true);
                                                                                    }}
                                                                                    evictionGraceBadge={
                                                                                        isPrimary
                                                                                            ? evictionGraceBadgeInfo
                                                                                            : null
                                                                                    }
                                                                                    evictionGracePinned={evictionGracePinned}
                                                                                    onToggleEvictionGracePinned={toggleEvictionGracePinned}
                                                                                    onEvictionGraceActivate={
                                                                                        isPrimary && evictionGraceBadgeInfo
                                                                                            ? () => {
                                                                                                  setEvictionGraceDecisionId(null);
                                                                                                  openEvictionResidentialGraceModal();
                                                                                              }
                                                                                            : undefined
                                                                                    }
                                                                                    onCompleteEvictionGrace={
                                                                                        isPrimary && evictionGraceBadgeInfo
                                                                                            ? completeEvictionResidentialGrace
                                                                                            : undefined
                                                                                    }
                                                                                    policeAssistanceBadge={
                                                                                        isPrimary
                                                                                            ? policeAssistanceBadgeInfo
                                                                                            : null
                                                                                    }
                                                                                    onPoliceAssistanceActivate={
                                                                                                    isPrimary && policeAssistanceBadgeInfo
                                                                                                        ? openPoliceAssistanceFromBadge
                                                                                                        : undefined
                                                                                                }
                                                                                                onCompletePoliceAssistance={
                                                                                                    isPrimary && policeAssistanceBadgeInfo
                                                                                                        ? completePoliceAssistance
                                                                                                        : undefined
                                                                                                }
                                                                                                publicationNoticeBadge={rowPublicationNoticeBadgeResolved}
                                                                                                onDismissPublicationNoticeBadge={
                                                                                                    rowPublicationNoticeBadgeResolved &&
                                                                                                    executionData?.id
                                                                                                        ? () => {
                                                                                                              const st = getPublicationNoticeForDebtorKey(
                                                                                                                  executionData,
                                                                                                                  debtorKey
                                                                                                              );
                                                                                                              if (!st) return;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              persistExecutionMerge({
                                                                                                                  ...buildPublicationNoticePatchForDebtorKey(
                                                                                                                      executionData,
                                                                                                                      debtorKey,
                                                                                                                      {
                                                                                                                          ...st,
                                                                                                                          badgeHiddenAt: ts,
                                                                                                                      }
                                                                                                                  ),
                                                                                                              });
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                onPublicationNoticeActivate={() => {
                                                                                                    setSummonsContextDebtorKey(String(debtorKey));
                                                                                                    setSummonsHubInitialMainTab('nashr');
                                                                                                    setShowUnifiedSummonsModal(true);
                                                                                                }}
                                                                                                absenceBadge={rowAbsenceNoticeBadge}
                                                                                                onDismissAbsence={
                                                                                                    rowAbsenceNoticeBadge
                                                                                                        ? dismissDebtorAbsenceBadge
                                                                                                        : undefined
                                                                                                }
                                                                                                showSummonsBadge={rowShowSummonsBadge}
                                                                                                onSummonsActivate={() => {
                                                                                                    setSummonsContextDebtorKey(String(debtorKey));
                                                                                                    setSummonsHubInitialMainTab('tabligh');
                                                                                                    setShowUnifiedSummonsModal(true);
                                                                                                }}
                                                                                                regularTablighBadge={rowRegularTablighBadge}
                                                                                                onDismissRegularTablighBadge={
                                                                                                    rowRegularTablighBadge && executionData?.id
                                                                                                        ? () => {
                                                                                                              const m = getDebtorSummonsMarkerForKey(
                                                                                                                  executionData,
                                                                                                                  debtorKey,
                                                                                                                  primaryDebtorKeyResolved
                                                                                                              );
                                                                                                              if (!m?.id) return;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              const next = {
                                                                                                                  ...m,
                                                                                                                  badgeHiddenAt: ts,
                                                                                                              };
                                                                                                              persistExecutionMerge({
                                                                                                                  ...buildDebtorSummonsMarkerPatchForKey(
                                                                                                                      executionData,
                                                                                                                      debtorKey,
                                                                                                                      primaryDebtorKeyResolved,
                                                                                                                      next
                                                                                                                  ),
                                                                                                              });
                                                                                                              if (debtorSummonsMarkerLocal?.id === m.id) {
                                                                                                                  setDebtorSummonsMarkerLocal(next);
                                                                                                              }
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                debtorArrested={Boolean(
                                                                                                    debtorArrested || executionData?.debtorArrested
                                                                                                )}
                                                                                                onPersistGuarantorFollowup={
                                                                                                    hideAllGuarantorPresence
                                                                                                        ? undefined
                                                                                                        : persistGuarantorFollowupDetails
                                                                                                }
                                                                                                personalCoerciveDecisionBadges={!rowIsEmployee}
                                                                                                debtorIsEmployee={rowIsEmployee}
                                                                                                activeDebtorKey={String(debtorKey)}
                                                                                                primaryDebtorKey={primaryDebtorKeyResolved}
                                                                                                forcedAttendancePending={rowForcedAttendancePending}
                                                                                                onWithdrawTravelBan={
                                                                                                    isPrimary &&
                                                                                                    !rowIsEmployee &&
                                                                                                    executionData?.id
                                                                                                        ? () => {
                                                                                                              if (
                                                                                                                  !window.confirm(
                                                                                                                      'سيتم سحب طلب منع السفر وإخفاء الشارة. هل تريد المتابعة؟'
                                                                                                                  )
                                                                                                              ) {
                                                                                                                  return;
                                                                                                              }
                                                                                                              const now =
                                                                                                                  new Date().toISOString();
                                                                                                              const exId = String(
                                                                                                                  decisionsStorageExecutionId ||
                                                                                                                      executionData.id ||
                                                                                                                      ''
                                                                                                              ).trim();
                                                                                                              const rows =
                                                                                                                  readExecutorDecisionsArray(
                                                                                                                      exId
                                                                                                                  );
                                                                                                              const last = rows.find(
                                                                                                                  (r) =>
                                                                                                                      String(
                                                                                                                          (r as { requestKind?: string })
                                                                                                                              .requestKind || ''
                                                                                                                      ) === 'personal_coercive' &&
                                                                                                                      String(
                                                                                                                          (r as { personalCoerciveSubtype?: string })
                                                                                                                              .personalCoerciveSubtype || ''
                                                                                                                      ) === 'travel_ban'
                                                                                                              );
                                                                                                              const did = String(
                                                                                                                  (last as { id?: string })?.id || ''
                                                                                                              ).trim();
                                                                                                              if (did) {
                                                                                                                  patchExecutorDecisionRow(exId, did, {
                                                                                                                      lawyerWithdrawn: true,
                                                                                                                      executorOutcome: 'withdrawn',
                                                                                                                      personalCoerciveWithdrawnAt: now,
                                                                                                                  });
                                                                                                              }
                                                                                                              dispatchDecisionsReload();
                                                                                                              persistExecutionMerge({
                                                                                                                  debtor_travel_ban_active: false,
                                                                                                                  travel_ban_withdrawn_at: now,
                                                                                                              });
                                                                                                              pushTimelineEvent({
                                                                                                                  id: nextTimelineId(),
                                                                                                                  date: now.slice(0, 10),
                                                                                                                  timestamp: now,
                                                                                                                  title: '↩️ التراجع عن طلب منع السفر',
                                                                                                                  description:
                                                                                                                      'إعادة دورة طلب منع السفر.',
                                                                                                                  type: 'coercive',
                                                                                                                  source: 'بطاقة المدين',
                                                                                                                  metadata:
                                                                                                                      timelineDebtorMetadata(
                                                                                                                          debtorKey
                                                                                                                      ),
                                                                                                              });
                                                                                                              showToast(
                                                                                                                  'تم التراجع عن منع السفر.',
                                                                                                                  'success'
                                                                                                              );
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                taklifAssignmentBadge={rowTaklifAssignmentBadge}
                                                                                                onTaklifAssignmentActivate={
                                                                                                    rowTaklifAssignmentBadge
                                                                                                        ? () => {
                                                                                                              const tb = rowTaklifAssignmentBadge;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              const remLine =
                                                                                                                  tb.remainingDays === null
                                                                                                                      ? '?'
                                                                                                                      : tb.remainingDays === 0
                                                                                                                        ? 'انتهت المهلة'
                                                                                                                        : `${tb.remainingDays} أيام`;
                                                                                                              pushTimelineEvent({
                                                                                                                  id: nextTimelineId(),
                                                                                                                  date: ts.slice(0, 10),
                                                                                                                  timestamp: ts,
                                                                                                                  title: 'مذكرة تبليغ تكليف موظف (من دورة سابقة)',
                                                                                                                  description: `الغرض: ${tb.purpose}\nتاريخ التبليغ: ${tb.notifyDateYmd}\nتاريخ التسليم: ${tb.deadlineYmd || '?'}\nالمتبقي: ${remLine}`,
                                                                                                                  type: 'summons',
                                                                                                                  source: 'taklif_badge',
                                                                                                                  metadata: {
                                                                                                                      ...timelineDebtorMetadata(debtorKey),
                                                                                                                      timelineThreadKey: `taklif_badge_snapshot:${debtorKey}`,
                                                                                                                  },
                                                                                                              });
                                                                                                              setSummonsContextDebtorKey(String(debtorKey));
                                                                                                              setSummonsHubInitialMainTab('taklif');
                                                                                                              setShowUnifiedSummonsModal(true);
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                onDismissTaklifAssignmentBadge={
                                                                                                    rowTaklifAssignmentBadge && executionData?.id
                                                                                                        ? () => {
                                                                                                              const ta = getEmployeeAssignmentForDebtorKey(
                                                                                                                  executionData,
                                                                                                                  debtorKey,
                                                                                                                  primaryDebtorKeyResolved
                                                                                                              );
                                                                                                              if (!ta || ta.phase === 'none') return;
                                                                                                              const ts = new Date().toISOString();
                                                                                                              persistExecutionMerge({
                                                                                                                  ...buildEmployeeAssignmentPatchForDebtorKey(
                                                                                                                      executionData,
                                                                                                                      debtorKey,
                                                                                                                      {
                                                                                                                          ...ta,
                                                                                                                          badgeHiddenAt: ts,
                                                                                                                      },
                                                                                                                      primaryDebtorKeyResolved
                                                                                                                  ),
                                                                                                              });
                                                                                                          }
                                                                                                        : undefined
                                                                                                }
                                                                                                decisionsReloadEpoch={decisionsReloadEpoch}
                                                                                                isHistoricalMode={isHistoricalMode}
                                                                                            />
                                                                            ) : null}
                                                                            {hasSeizureBadges ? (
                                                                                <DebtorSeizureCategoryBadges
                                                                                    embeddedInRow
                                                                                    executionId={partyBadgesExecutionId}
                                                                                    decisionsExecutionId={partyBadgesExecutionId}
                                                                                    seizedAssets={seizedAssets}
                                                                                    realEstateSeizureAssets={realEstateSeizureAssets}
                                                                                    thirdPartySeizureAssets={thirdPartySeizureAssets}
                                                                                    thirdPartySeizures={thirdPartySeizures}
                                                                                    standaloneExecutionMarks={standaloneExecutionMarks}
                                                                                />
                                                                            ) : null}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                        {!isPrimary && (
                                                            <div className="min-w-0 flex-1 text-right">
                                                                <div
                                                                    className="flex w-full min-w-0 flex-col items-stretch gap-1"
                                                                    dir="rtl"
                                                                >
                                                                    <div
                                                                        className="flex w-full min-w-0 flex-row flex-nowrap items-center justify-center gap-2 overflow-hidden"
                                                                        dir="rtl"
                                                                    >
                                                                        <div
                                                                            className="flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-center gap-1 overflow-hidden"
                                                                            dir="rtl"
                                                                        >
                                                                            {debtorHeirsWord ? (
                                                                                <HeirsQuickViewTrigger
                                                                                    label={debtorHeirsWord}
                                                                                    onOpen={() =>
                                                                                        openHeirsQuickView(
                                                                                            d as Party,
                                                                                            'debtor',
                                                                                            'ورثة المدين'
                                                                                        )
                                                                                    }
                                                                                />
                                                                            ) : null}
                                                                            <span className="min-w-0 max-w-full truncate text-center text-xl font-bold leading-tight text-white">
                                                                                {debtorHeirsWord ? debtorDisp.baseName : debtorDisp.text}
                                                                                {(debtorHasHeirs
                                                                                    ? heirsDetailsIncludeClient(
                                                                                          d.heirs_details
                                                                                      )
                                                                                    : d.isClient) &&
                                                                                !rowIsLegalEntity &&
                                                                                !debtorDisp.showDeceasedGlyph ? (
                                                                                    <span
                                                                                        className="ms-1 inline-block text-[#E6C673] text-[14px] leading-none select-none"
                                                                                        title="موكلي"
                                                                                        aria-label="موكلي"
                                                                                    >
                                                                                        ★
                                                                                    </span>
                                                                                ) : null}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        className="flex flex-wrap justify-center items-center gap-1.5 mt-1"
                                                                        onClick={e => e.stopPropagation()}
                                                                        onKeyDown={e => e.stopPropagation()}
                                                                        role="presentation"
                                                                        dir="rtl"
                                                                    >
                                                                        {!isRepresentingDebtor ? (
                                                                            <>
                                                                                {debtorTags(debtorKey).map(tag => (
                                                                                    <span key={tag} className="inline-flex items-center gap-1 border border-dashed border-gray-500/50 text-gray-400 bg-transparent px-2 py-0.5 rounded text-[10px] leading-tight select-none">
                                                                                        {tag}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleRemoveTag(debtorKey, tag)}
                                                                                            className="text-gray-500 hover:text-rose-300 transition-colors leading-none"
                                                                                        >
                                                                                            ✕
                                                                                        </button>
                                                                                    </span>
                                                                                ))}
                                                                                {tagInputOpen[debtorKey] ? (
                                                                                    <span className="inline-flex items-center gap-1">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={tagDrafts[debtorKey] ?? ''}
                                                                                            onChange={e => setTagDrafts(prev => ({ ...prev, [debtorKey]: e.target.value }))}
                                                                                            onKeyDown={e => {
                                                                                                if (e.key === 'Enter') { e.preventDefault(); handleAddTag(debtorKey); }
                                                                                                if (e.key === 'Escape') { setTagInputOpen(prev => ({ ...prev, [debtorKey]: false })); setTagDrafts(prev => ({ ...prev, [debtorKey]: '' })); }
                                                                                            }}
                                                                                            placeholder="وسم..."
                                                                                            className="w-20 rounded border border-dashed border-gray-500/40 bg-transparent px-1.5 py-0.5 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-amber-400/40 focus:outline-none"
                                                                                            autoFocus
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleAddTag(debtorKey)}
                                                                                            className="text-[10px] text-gray-500 hover:text-emerald-300 transition-colors"
                                                                                        >
                                                                                            حفظ
                                                                                        </button>
                                                                                    </span>
                                                                                ) : (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => { setTagDrafts(prev => ({ ...prev, [debtorKey]: '' })); setTagInputOpen(prev => ({ ...prev, [debtorKey]: true })); }}
                                                                                        className="inline-flex items-center gap-0.5 border border-dashed border-gray-500/30 text-gray-500 bg-transparent px-1.5 py-0.5 rounded text-[10px] leading-tight hover:border-gray-400/50 hover:text-gray-300 transition-colors"
                                                                                    >
                                                                                        + إضافة وسم
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        ) : null}
                                                                        {debtorDisp.showDeceasedGlyph && !debtorHeirsWord ? (
                                                                            <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                                                                                متوفى
                                                                            </span>
                                                                        ) : null}
                                                                        {rowShowUnservedMemoBadge ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSummonsContextDebtorKey(String(debtorKey));
                                                                                    setSummonsHubInitialMainTab('tabligh');
                                                                                    setShowUnifiedSummonsModal(true);
                                                                                }}
                                                                                className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                                                                                title="لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ"
                                                                            >
                                                                                غير مبلّغ
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>
                                                }
                                                expanded={
                                                    <div className="space-y-1.5 text-right" dir="rtl">
                                                        <div className="relative z-20 mb-2 flex items-center justify-end pointer-events-auto">
                                                            <ExecutionPartySpecialActionsMenu
                                                                variant="debtor"
                                                                debtorDeathEntryLabel={debtorDeathMenuLabel}
                                                                onReportDebtorDeath={handleDebtorDeathMenuAction}
                                                                debtorIsEmployee={rowIsEmployee}
                                                                debtorEmploymentToggleLabel={rowEmploymentToggleLabel}
                                                                onToggleDebtorEmployment={() =>
                                                                    handleDebtorEmploymentToggle({
                                                                        debtorKey,
                                                                        isPrimary,
                                                                    })
                                                                }
                                                                debtorEmploymentToggleToKasabDisabled={false}
                                                                hideDebtorEmploymentToggle={Boolean(
                                                                    (d as Debtor)?.isDeceased ||
                                                                        (isPrimary &&
                                                                            executionData?.is_debtor_deceased) ||
                                                                        rowIsLegalEntity ||
                                                                        custodyRemovalClaimActive
                                                                )}
                                                                isHistoricalMode={isHistoricalMode}
                                                                editPartyLabel={
                                                                    debtorHeirsEditOnly
                                                                        ? 'تعديل بيانات الورثة'
                                                                        : 'تعديل بيانات المدين'
                                                                }
                                                                onEditParty={() => {
                                                                    if (
                                                                        multiDebtorMode &&
                                                                        wsDebt &&
                                                                        wsRow.fileDebtorIndex === null
                                                                    ) {
                                                                        showToast(
                                                                            'لا يمكن تعديل هذا المدين من هنا بعد تسجيل الإضبارة.',
                                                                            'info'
                                                                        );
                                                                        return;
                                                                    }
                                                                    openEditParty('debtor', idx, {
                                                                        party: d as Party,
                                                                        forceHeirs: debtorHeirsEditOnly,
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                        {debtorDisp.heirSubstituteLines &&
                                                        debtorDisp.heirSubstituteLines.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openHeirsNotificationCenter()}
                                                            className="mb-2 w-full rounded-xl border border-cyan-400/45 bg-gradient-to-r from-cyan-900/35 to-blue-900/35 px-3 py-2 text-[10px] font-black text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:from-cyan-800/40 hover:to-blue-800/40"
                                                        >
                                                            إخطار الورثة
                                                        </button>
                                                    ) : null}
                                                    {showDebtorNotificationPanel && (
                                                        <div className="mb-1 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-cyan-950/25 p-2.5 shadow-inner shadow-black/20">
                                                            <div className="mb-1.5 flex flex-row-reverse flex-wrap items-center justify-between gap-2">
                                                                <span className="text-[11px] font-bold text-cyan-100/95">
                                                                    الإخطار والتبليغ
                                                                </span>
                                                            </div>
                                                            {null}
                                                            <button
                                                                type="button"
                                                                disabled={executionToolsTimelineLockedUi}
                                                                onClick={() => {
                                                                    if (
                                                                        activeDebtorIsDeceased &&
                                                                        activeDebtorHeirsForNotification.length > 0
                                                                    ) {
                                                                        openHeirsNotificationCenter();
                                                                        return;
                                                                    }
                                                                    setSummonsContextDebtorKey(null);
                                                                    setSummonsHubInitialMainTab(null);
                                                                    setShowUnifiedSummonsModal(true);
                                                                }}
                                                                className={`w-full flex flex-row-reverse items-center justify-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 transition-all ${
                                                                    executionToolsTimelineLockedUi
                                                                        ? 'opacity-40 cursor-not-allowed'
                                                                        : 'hover:bg-cyan-900/50 hover:border-cyan-400/45'
                                                                }`}
                                                            >
                                                                <Bell size={16} className="text-cyan-300 shrink-0" />
                                                                {activeDebtorIsDeceased &&
                                                                activeDebtorHeirsForNotification.length > 0
                                                                    ? 'إخطار الورثة'
                                                                    : 'تسجيل التبليغ'}
															</button>
													</div>
											)}
                                                    <div className="flex flex-col gap-2">
                                                        {rowIsLegalEntity ? (
                                                            <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                <p className="mb-0.5 text-[10px] text-gray-400">
                                                                    الصفة القانونية
                                                                </p>
                                                                <p className="text-xs font-medium text-slate-200 break-words">
                                                                    معنوي
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                        {!rowIsLegalEntity &&
                                                        (isPrimary || d.occupation || multiDebtorMode) ? (
                                                            <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                <p className="mb-0.5 text-[10px] text-gray-400">
                                                                    الحالة الوظيفية
                                                                </p>
                                                                <p className="text-xs font-medium text-slate-200 break-words">
                                                                    {rowIsEmployee ? 'موظف' : 'كاسب'}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                        {d.phone || d.address ? (
                                                            <div
                                                                className={`grid gap-2 ${
                                                                    d.phone && d.address ? 'grid-cols-2' : 'grid-cols-1'
                                                                }`}
                                                            >
                                                                {d.phone ? (
                                                                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                            <span>الهاتف</span>
                                                                            <Phone
                                                                                size={12}
                                                                                className="shrink-0 text-rose-400"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs font-medium text-white [unicode-bidi:plaintext] break-all">
                                                                            {d.phone}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                                {d.address ? (
                                                                    <div className="min-w-0 rounded-lg border border-rose-500/15 bg-slate-900/35 px-2.5 py-1.5">
                                                                        <div className="mb-0.5 flex flex-row-reverse items-center justify-end gap-1 text-[10px] text-gray-400">
                                                                            <span>العنوان (السكن)</span>
                                                                            <MapPin
                                                                                size={12}
                                                                                className="shrink-0 text-rose-400"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs leading-snug text-white break-words [unicode-bidi:plaintext]">
                                                                            {d.address}
                                                                        </p>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    {!d.phone && !d.address && (
                                                        <p className="text-gray-500 text-xs text-center py-2">لا توجد بيانات اتصال</p>
                                                    )}

                                                    {typeof document !== 'undefined' &&
                                                        isPrimary &&
                                                        executionMemoBadgePopoverOpen &&
                                                        (primaryMemoNoticeBadge || showDebtorUnservedMemoBadge) &&
                                                        createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setExecutionMemoBadgePopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="execution-memo-badge-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[min(85vh,22rem)] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="تسجيل راتب"
                                                                            onClick={() =>
                                                                                setExecutionMemoBadgePopoverOpen(
                                                                                    false
                                                                                )
                                                                            }
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="execution-memo-badge-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Calendar
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            {primaryMemoNoticeBadge
                                                                                ? 'مهلة التبليغ'
                                                                                : 'تسجيل الراتب الشهري'}
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-2 overflow-y-auto px-3 py-3 text-right flex-1 min-h-0">
                                                                        {primaryMemoNoticeBadge ? (
                                                                            <>
                                                                                <div>
                                                                                    <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                        تاريخ التبليغ
                                                                                    </p>
                                                                                    <p className="text-xs text-white font-mono tabular-nums">
                                                                                        {primaryMemoNoticeBadge.anchor}
                                                                                    </p>
                                                                                </div>
                                                                                <p
                                                                                    className={`text-[10px] font-semibold tabular-nums leading-relaxed ${
                                                                                        primaryMemoNoticeBadge.graceExpired
                                                                                            ? 'text-amber-200/95'
                                                                                            : 'text-emerald-300/95'
                                                                                    }`}
                                                                                >
                                                                                    {primaryMemoNoticeBadge.graceExpired ? 'انتهت المهلة قبل' : `المتبقي ${primaryMemoNoticeBadge.remaining}`}{' '}
                                                                                    للتذكير: مهلة التبليغ لم تنتهِ بعد.
                                                                                    {primaryMemoNoticeBadge.graceExpired && (
                                                                                        <span className="block mt-1.5 text-amber-200/85 text-[9px]">
                                                                                            لم يسجل تبليغ بعد. انقر على
                                                                                            "تسجيل التبليغ" لإضافة تاريخ التبليغ.
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <p className="text-[11px] font-bold text-amber-100">
                                                                    لم يسجل تبليغ بعد
                                                                </p>
                                                                                <p className="text-[10px] leading-relaxed text-slate-300">
                                                                                    مهلة التبليغ
                                                                                    {primaryMemoNoticeBadge.graceExpired
                                                                                        ? 'انتهت المهلة قبل'
                                                                                        : `المتبقي ${primaryMemoNoticeBadge.remaining}`}{' '}
                                                                                    للتذكير: مهلة التبليغ لم تنتهِ بعد.
                                                                                </p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setExecutionMemoBadgePopoverOpen(false);
                                                                                        setSummonsContextDebtorKey(null);
                                                                                        setSummonsHubInitialMainTab('tabligh');
                                                                                        setShowUnifiedSummonsModal(true);
                                                                                    }}
                                                                                    className="w-full rounded-xl border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-900/50 hover:border-cyan-400/45"
                                                                                >
                                                                                    تسجيل التبليغ
                                                                                </button>
                                                                            </>
                                                                        )}
												</div>
										</div>
									</div>,
								document.body
							)}

                                                    {typeof document !== 'undefined' &&
                                                        isPrimary &&
                                                        showDebtorSummonsAttendanceBadge &&
                                                        summonsMarkerPopoverOpen &&
                                                        debtorSummonsMarkerLocal?.id &&
                                                        createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setSummonsMarkerPopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="summons-marker-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[85vh] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="تسجيل راتب"
                                                                            onClick={() =>
                                                                                setSummonsMarkerPopoverOpen(false)
                                                                            }
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="summons-marker-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Bell
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            حجز راتب
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-3 overflow-y-auto px-3 py-3 flex-1 min-h-0">
                                                                        <div>
                                                                            <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                حجز الراتب
                                                                            </p>
                                                                            <p className="text-xs text-white font-mono tabular-nums">
                                                                                {debtorSummonsMarkerLocal?.date ||
                                                                                    '?'}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <label
                                                                                htmlFor="summons-purpose-floating"
                                                                                className="block text-[9px] text-slate-500 mb-1"
                                                                            >
                                                                                الغرض من مذكرة الاستحضار
                                                                            </label>
                                                                            <textarea
                                                                                id="summons-purpose-floating"
                                                                                value={summonsPurposeDraft}
                                                                                onChange={(e) =>
                                                                                    setSummonsPurposeDraft(
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                rows={3}
                                                                                className="w-full rounded-lg bg-white/[0.06] border border-[#E6C673]/20 px-2.5 py-2 text-white text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-[#E6C673]/40 min-h-[4.5rem]"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-2 shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={
                                                                                    saveSummonsMarkerPurposeEdit
                                                                                }
                                                                                className="rounded-lg bg-emerald-600/85 py-2 text-[11px] font-bold text-white shadow-md shadow-emerald-950/20"
                                                                            >
                                                                                حفظ
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSummonsMarkerPopoverOpen(
                                                                                        false
                                                                                    );
                                                                                    clearDebtorSummonsMarker();
                                                                                }}
                                                                                className="rounded-lg border border-rose-500/45 bg-rose-950/45 py-2 text-[11px] font-bold text-rose-200"
                                                                            >
                                                                                الرصيد المتبقي
																		</button>
																		</div>
																	</div>
																</div>
														</div>,
														document.body
												)}
                                                    </div>
                                                }
                                            />
                                            </div>
										);
                                        })}
                                        {!multiDebtorMode && effectiveDebtors.length > 2 && (
                                            <PartyOverflowToggle
                                                hiddenCount={effectiveDebtors.length - 2}
                                                expanded={showExtraDebtors}
                                                onToggle={() => setShowExtraDebtors(v => !v)}
                                                variant="debtor"
                                            />
                                        )}
                            </div>
                    </div>
        </>
    );
});
