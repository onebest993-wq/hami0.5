import React from 'react';
import { Bell } from '@/app/components/ui/icons/Bell';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Phone } from '@/app/components/ui/icons/Phone';
import { X } from '@/app/components/ui/icons/X';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import type { ExecutionFile, Party } from '@/app/types/execution';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { heirsDetailsIncludeClient } from '../helpers';
import {
    LazyCustodyRemovalWardsModule,
    LazyDebtorsSection,
    LazyMaritalFurnitureModule,
    LazyPartiesSection,
} from '../executionDashboardLazyRegistryShell';
import {
    EXEC_SECTION_LAZY_FALLBACK,
    EXEC_CREDITORS_LAZY_FALLBACK,
    EXEC_DEBTORS_LAZY_FALLBACK,
    PartyOverflowToggle,
} from '../executionDashboardLazyShellUi';
import { buildPhoneBodyDebtorsSectionProps } from './buildPhoneBodyDebtorsSectionProps';
import { buildPhoneBodyPartyDeathMenuHandler } from './buildPhoneBodyPartyDeathMenuHandler';
import { PhoneBodyPrimaryHeaderSection } from './PhoneBodyPrimaryHeaderSection';
import type { DebtorsSectionHandle } from './DebtorsSection';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import { PreloadableOverlayGate } from '@/app/components/lawyer/ExecutionDashboard/preloadableOverlayGate';
import { LazyDossierActionsModal } from '../executionDashboardDossierActionsModalLazy';
import type { DossierActionsModalProps } from './DossierActionsModal';
import type { DossierActionPayload, DossierActionType } from './DossierActionTypes';

export type ExecutionDashboardPhoneBodyPrimarySectionsProps = {
    scope: Record<string, unknown>;
    scopeRef?: React.RefObject<Record<string, unknown>>;
    debtorsSectionRef: React.RefObject<DebtorsSectionHandle | null>;
    safeOpenEditDossierMeta: () => void;
    safeOpenParentDossierMetaEdit: () => void;
    safeOpenEditParty: (
        kind: 'creditor' | 'debtor',
        index: number,
        opts?: { forceHeirs?: boolean; party?: Party },
    ) => void;
    isCustodyRemovalClaimActive: boolean;
    custodyWardNamesResolved: string[];
};

export function ExecutionDashboardPhoneBodyPrimarySectionsReady({
    scope,
    scopeRef,
    debtorsSectionRef,
    safeOpenEditDossierMeta,
    safeOpenParentDossierMetaEdit,
    safeOpenEditParty,
    isCustodyRemovalClaimActive,
    custodyWardNamesResolved,
}: ExecutionDashboardPhoneBodyPrimarySectionsProps) {
    const s = scope as Record<string, unknown>;
    const {
        statuteStatus,
        isAlimonyClaim,
        executionPaused,
        handleResumeExecution,
        stayOfExecutionActive,
        viewExecutionData,
        handleLiftStayOfExecution,
        isHeaderExpanded,
        toggleHeaderExpanded,
        headerFields,
        isEvictionExecutionModule,
        classificationDisplay,
        showJudgmentMeta,
        docNumber,
        judgmentDateDisplay,
        claimTypeArabicDisplay,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        isInabaActive,
        inabaTargets = [],
        executionData,
        isUnifiedTabActive,
        persistExecutionMerge,
        showToast,
        setLinkedDossierToView,
        setShowLinkedDossierTimeline,
        setShowTransferFileNumberChangeModal,
        activeSubFileId,
        setExecutionStorageTick,
        parentExecutionFile,
        parentHeaderFields,
        parentClassificationDisplay,
        parentClaimTypeArabicDisplay,
        parentShowJudgmentMeta,
        parentJudgmentDateDisplay,
        parentIsEvictionForExpandedHeader,
        dossierActionModalOpen,
        dossierActionModalType,
        setDossierActionModalOpen,
        setDossierActionModalType,
        setDossierActionModalSaving,
        handleDossierAction,
        dossierActionModalSaving,
        currentFileId,
        creditorWorkspaceEntries,
        showExtraCreditors,
        setShowExtraCreditors,
        getExecutionPartyDisplayName,
        buildPartyHeirsRows,
        openHeirsQuickView,
        effectiveCreditors,
        executionAppealBanner,
        openDecisionsModalWithBoot,
        partyBadgesExecutionId,
        activeCoerciveActions,
        seizedAssets,
        activeTimelineEvents,
        decisionsReloadEpoch,
        isHistoricalMode,
        creditorDeathMenuLabel,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        decisionsStorageExecutionId,
        isMaritalFurnitureClaim,
        executionId,
        parentDossierId,
        setTimelineEvents,
        nextTimelineId,
        todayYmd,
        pushTimelineEvent,
        executionToolsTimelineLockedUi,
        isRepresentingDebtor,
    } = s;

    const handleCreditorDeathMenuAction = buildPhoneBodyPartyDeathMenuHandler(
        scopeRef,
        s,
        'handleCreditorDeathMenuAction',
    );

    const debtorsProps = buildPhoneBodyDebtorsSectionProps(
        s,
        safeOpenEditParty,
        openDecisionsModalWithBoot,
        scopeRef,
    );

    return (
        <>
            <PhoneBodyPrimaryHeaderSection
                s={s}
                safeOpenEditDossierMeta={safeOpenEditDossierMeta}
                safeOpenParentDossierMetaEdit={safeOpenParentDossierMetaEdit}
            />

            {dossierActionModalOpen ? (
            <PreloadableOverlayGate
                lazy={LazyDossierActionsModal}
                lazyProps={
                    {
                        open: Boolean(dossierActionModalOpen),
                        actionType: (dossierActionModalType ?? null) as DossierActionType | null,
                        onClose: () => {
                            (setDossierActionModalOpen as (open: boolean) => void)(false);
                            (setDossierActionModalType as (type: null) => void)(null);
                        },
                        onConfirm: (payload: DossierActionPayload) => {
                            (setDossierActionModalSaving as (saving: boolean) => void)(true);
                            void (handleDossierAction as (next: DossierActionPayload) => void)(
                                payload,
                            );
                        },
                        saving: Boolean(dossierActionModalSaving),
                        currentFileId: currentFileId as string | undefined,
                        inabaTargets: inabaTargets as
                            | { id: string; directorate: string }[]
                            | undefined,
                    } satisfies DossierActionsModalProps
                }
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title={
                            dossierActionModalType === 'delegation'
                                ? 'طلب الإنابة التنفيذية'
                                : dossierActionModalType === 'unify'
                                  ? 'طلب توحيد الأضابير'
                                  : dossierActionModalType === 'transfer'
                                    ? 'طلب نقل الإضبارة'
                                    : dossierActionModalType === 'renew'
                                      ? 'طلب تجديد الإضبارة'
                                      : dossierActionModalType === 'inaba_correspondence'
                                        ? 'طلب مخاطبة الإنابة'
                                        : 'إجراء الإضبارة'
                        }
                        onClose={() => {
                            (setDossierActionModalOpen as (open: boolean) => void)(false);
                            (setDossierActionModalType as (type: null) => void)(null);
                        }}
                    />
                }
            />
            ) : null}

            <PreloadableOverlayGate
                lazy={LazyPartiesSection}
                fallback={EXEC_CREDITORS_LAZY_FALLBACK}
                lazyProps={{
                    creditorWorkspaceEntries,
                    showExtraCreditors,
                    setShowExtraCreditors,
                    getExecutionPartyDisplayName,
                    executionData,
                    viewExecutionData,
                    buildPartyHeirsRows,
                    openHeirsQuickView,
                    effectiveCreditors,
                    heirsDetailsIncludeClient,
                    executionAppealBanner,
                    onOpenDecisionsAppealsTab: () => openDecisionsModalWithBoot({ tab: 'appeals' }),
                    partyBadgesExecutionId,
                    activeCoerciveActions,
                    seizedAssets,
                    activeTimelineEvents,
                    decisionsReloadEpoch,
                    isHistoricalMode,
                    creditorDeathMenuLabel,
                    handleCreditorDeathMenuAction,
                    creditorExtraMinorNames,
                    creditorExtraMinorLabel,
                    showToast,
                    decisionsStorageExecutionId,
                    openEditParty: safeOpenEditParty,
                }}
            />

            <PreloadableOverlayGate
                lazy={LazyDebtorsSection}
                fallback={EXEC_DEBTORS_LAZY_FALLBACK}
                lazyProps={{
                    ref: debtorsSectionRef as React.Ref<DebtorsSectionHandle>,
                    Bell,
                    Calendar,
                    DebtorSeizureCategoryBadges,
                    ExecutionPartyInteractiveBadges,
                    MapPin,
                    PartyOverflowToggle,
                    Phone,
                    X,
                    ...debtorsProps,
                }}
            />

            {isCustodyRemovalClaimActive ? (
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

            {isMaritalFurnitureClaim ? (
                <PreloadableOverlayGate
                    lazy={LazyMaritalFurnitureModule}
                    fallback={EXEC_SECTION_LAZY_FALLBACK}
                    lazyProps={{
                        executionData: viewExecutionData,
                        persistExecutionMerge,
                        pushTimelineEvent,
                        setTimelineEvents,
                        timelineEvents: activeTimelineEvents,
                        nextTimelineId,
                        todayYmd,
                        showToast,
                        locked: executionToolsTimelineLockedUi || isRepresentingDebtor,
                    }}
                />
            ) : null}
        </>
    );
}
