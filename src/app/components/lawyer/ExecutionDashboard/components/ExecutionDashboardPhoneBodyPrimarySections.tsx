import React, { Suspense } from 'react';
import {
    Bell,
    Calendar,
    MapPin,
    Pencil,
    Phone,
    X,
    XCircle,
} from '@/app/components/ui/lucideIcons';
import type { ExecutionFile, Party } from '@/app/types/execution';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { heirsDetailsIncludeClient } from '../helpers';
import {
    LazyCustodyRemovalWardsModule,
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDossierActionsModal,
    LazyMaritalFurnitureModule,
    LazyPartiesSection,
} from '../executionDashboardLazyRegistry';
import {
    EXEC_OVERLAY_LAZY_FALLBACK,
    EXEC_SECTION_LAZY_FALLBACK,
    PartyOverflowToggle,
} from '../executionDashboardLazyShellUi';
import { buildPhoneBodyDebtorsSectionProps } from './buildPhoneBodyDebtorsSectionProps';
import { buildPhoneBodyPartyDeathMenuHandler } from './buildPhoneBodyPartyDeathMenuHandler';
import type { DebtorsSectionHandle } from './DebtorsSection';
import { SparkVaultDocOpenBridge } from '@/app/spark/ui/SparkVaultDocOpenBridge';

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

export function ExecutionDashboardPhoneBodyPrimarySections({
    scope,
    scopeRef,
    debtorsSectionRef,
    safeOpenEditDossierMeta,
    safeOpenParentDossierMetaEdit,
    safeOpenEditParty,
    isCustodyRemovalClaimActive,
    custodyWardNamesResolved,
}: ExecutionDashboardPhoneBodyPrimarySectionsProps) {
    const s = scope as Record<string, any>;
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
            <LazyDashboardHeaderSection
                statuteStatus={statuteStatus}
                isAlimonyClaim={isAlimonyClaim}
                executionPaused={executionPaused}
                handleResumeExecution={handleResumeExecution}
                stayOfExecutionActive={stayOfExecutionActive}
                executionData={executionData as ExecutionFile}
                handleLiftStayOfExecution={handleLiftStayOfExecution}
                XCircle={XCircle}
                isHeaderExpanded={isHeaderExpanded}
                toggleHeaderExpanded={toggleHeaderExpanded}
                headerFields={headerFields}
                openEditDossierMeta={safeOpenEditDossierMeta}
                Pencil={Pencil}
                isEvictionExecutionModule={isEvictionExecutionModule}
                classificationDisplay={classificationDisplay}
                showJudgmentMeta={showJudgmentMeta}
                docNumber={docNumber}
                judgmentDateDisplay={judgmentDateDisplay}
                claimTypeArabicDisplay={claimTypeArabicDisplay}
                evictionPropertyNumber={evictionPropertyNumber}
                evictionPropertyDistrict={evictionPropertyDistrict}
                evictionPropertyTypeField={evictionPropertyTypeField}
                evictionFullAddressField={evictionFullAddressField}
                isSubFile={isInabaActive}
                hasActiveInaba={!isInabaActive && inabaTargets.length > 0}
                delegationPurpose={(executionData as { delegationPurpose?: string })?.delegationPurpose}
                linkToken={isInabaActive ? undefined : (executionData as { linkToken?: string })?.linkToken}
                onCopyLinkToken={() => {
                    const token = (executionData as { linkToken?: string })?.linkToken;
                    if (token) {
                        navigator.clipboard.writeText(token).catch(() => {});
                        showToast('تم نسخ رمز المشاركة', 'success');
                    }
                }}
                linkedDossiers={
                    isInabaActive
                        ? undefined
                        : (executionData as ExecutionFile | null | undefined)?.linkedDossiers
                }
                onRemoveLinkedDossier={(linkedId: string) => {
                    const store = useExecutionDashboardStore.getState();
                    const current = executionData as {
                        id?: string;
                        linkedDossiers?: Array<{ linkedId?: string }>;
                    };
                    const existing = Array.isArray(current?.linkedDossiers) ? current.linkedDossiers : [];
                    const next = existing.filter((d) => String(d?.linkedId || '') !== String(linkedId));
                    const curId = String(current?.id || '').trim();
                    const hasChildren = curId ? store.getChildDossiers(curId).length > 0 : false;
                    const patch: Record<string, unknown> = { linkedDossiers: next };
                    if (next.length === 0 && !hasChildren) {
                        patch.linkToken = undefined;
                    }
                    if (isUnifiedTabActive) {
                        persistExecutionMerge(patch);
                    } else {
                        store.updateCurrentFile(patch);
                    }
                    showToast('تم إلغاء الربط بنجاح', 'success');
                }}
                onOpenLinkedDossier={(dossier: { type?: string }) => {
                    if (dossier.type === 'colleague') {
                        setLinkedDossierToView(dossier);
                        setShowLinkedDossierTimeline(true);
                    }
                }}
                onRequestTransferFileNumberChange={() => {
                    setShowTransferFileNumberChangeModal(true);
                }}
                onSaveSubFileNumber={(fileNumber: string, fileYear: string) => {
                    if (!isInabaActive || !activeSubFileId) return;
                    const num = String(fileNumber || '').trim();
                    const year = String(fileYear || '').trim();
                    const st = useExecutionDashboardStore.getState();
                    const cur = st.currentFile
                        ? ({ ...st.currentFile, fileNumber: num, fileYear: year } as ExecutionFile)
                        : null;
                    useExecutionDashboardStore.setState({
                        currentFile: cur,
                        subFiles: st.subFiles.map((f) =>
                            f.id === activeSubFileId ? { ...f, fileNumber: num, fileYear: year } : f,
                        ),
                    });
                    persistExecutionMerge({ fileNumber: num, fileYear: year });
                    setExecutionStorageTick((t: number) => t + 1);
                    showToast('تم حفظ رقم الإضبارة الفرعية', 'success');
                }}
                expandedDossierFromParent={
                    isInabaActive && parentExecutionFile
                        ? {
                              headerFields: parentHeaderFields,
                              classificationDisplay: parentClassificationDisplay,
                              claimTypeArabicDisplay: parentClaimTypeArabicDisplay,
                              showJudgmentMeta: parentShowJudgmentMeta,
                              judgmentDateDisplay: parentJudgmentDateDisplay,
                              docNumber: parentHeaderFields.docNumber,
                              evictionPropertyNumber: String(
                                  (parentExecutionFile as { property_number?: string }).property_number ?? '',
                              ),
                              evictionPropertyDistrict: String(
                                  (parentExecutionFile as { district?: string }).district ?? '',
                              ),
                              evictionPropertyTypeField: String(
                                  (parentExecutionFile as { property_type?: string }).property_type ?? '',
                              ),
                              evictionFullAddressField: String(
                                  (parentExecutionFile as { full_address?: string }).full_address ?? '',
                              ),
                              isEvictionExecutionModule: parentIsEvictionForExpandedHeader,
                              openEditDossierMeta: safeOpenParentDossierMetaEdit,
                          }
                        : undefined
                }
            />

            {executionData ? <SparkVaultDocOpenBridge enabled={!isHistoricalMode} /> : null}

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyDossierActionsModal
                    open={dossierActionModalOpen}
                    actionType={dossierActionModalType}
                    onClose={() => {
                        setDossierActionModalOpen(false);
                        setDossierActionModalType(null);
                    }}
                    onConfirm={(payload: unknown) => {
                        setDossierActionModalSaving(true);
                        void handleDossierAction(payload);
                    }}
                    saving={dossierActionModalSaving}
                    currentFileId={currentFileId}
                    inabaTargets={inabaTargets}
                />
            </Suspense>

            <LazyPartiesSection
                creditorWorkspaceEntries={creditorWorkspaceEntries}
                showExtraCreditors={showExtraCreditors}
                setShowExtraCreditors={setShowExtraCreditors}
                getExecutionPartyDisplayName={getExecutionPartyDisplayName}
                executionData={executionData}
                viewExecutionData={viewExecutionData}
                buildPartyHeirsRows={buildPartyHeirsRows}
                openHeirsQuickView={openHeirsQuickView}
                effectiveCreditors={effectiveCreditors}
                heirsDetailsIncludeClient={heirsDetailsIncludeClient}
                executionAppealBanner={executionAppealBanner}
                onOpenDecisionsAppealsTab={() => openDecisionsModalWithBoot({ tab: 'appeals' })}
                partyBadgesExecutionId={partyBadgesExecutionId}
                activeCoerciveActions={activeCoerciveActions}
                seizedAssets={seizedAssets}
                activeTimelineEvents={activeTimelineEvents}
                decisionsReloadEpoch={decisionsReloadEpoch}
                isHistoricalMode={isHistoricalMode}
                creditorDeathMenuLabel={creditorDeathMenuLabel}
                handleCreditorDeathMenuAction={handleCreditorDeathMenuAction}
                creditorExtraMinorNames={creditorExtraMinorNames}
                creditorExtraMinorLabel={creditorExtraMinorLabel}
                showToast={showToast}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                openEditParty={safeOpenEditParty}
            />

            <LazyDebtorsSection
                ref={debtorsSectionRef as React.Ref<DebtorsSectionHandle>}
                {...{
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

            {isMaritalFurnitureClaim ? (
                <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
                    <LazyMaritalFurnitureModule
                        executionData={viewExecutionData}
                        persistExecutionMerge={persistExecutionMerge}
                        pushTimelineEvent={pushTimelineEvent}
                        setTimelineEvents={setTimelineEvents}
                        timelineEvents={activeTimelineEvents}
                        nextTimelineId={nextTimelineId}
                        todayYmd={todayYmd}
                        showToast={showToast}
                        locked={executionToolsTimelineLockedUi || isRepresentingDebtor}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
