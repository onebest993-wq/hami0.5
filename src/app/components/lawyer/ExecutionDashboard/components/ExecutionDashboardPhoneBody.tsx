/** جسم واجهة ExecutionDashboard — chunk lazy منفصل */
import React, { useEffect } from 'react';
import { ExecutionDashboardPhoneBodyHeader } from './ExecutionDashboardPhoneBodyHeader';
import { ExecutionDashboardPhoneBodyDossierChrome } from './ExecutionDashboardPhoneBodyDossierChrome';
import { ExecutionDashboardPhoneBodyPrimarySections } from './ExecutionDashboardPhoneBodyPrimarySections';
import {
    phoneBodyPropsEqual,
    type ExecutionDashboardPhoneBodyProps,
} from './executionDashboardPhoneBodyScopeFallback';
import { ExecutionDashboardPhoneBodyDeferredStagePlaceholder } from './ExecutionDashboardPhoneBodyDeferredStagePlaceholder';
import { ExecutionDashboardPhoneBodySecondarySections } from './ExecutionDashboardPhoneBodySecondarySections';
import { ExecutionDashboardPhoneBodyQuaternaryPanels } from './ExecutionDashboardPhoneBodyQuaternaryPanels';
import { ExecutionDashboardPhoneBodyTertiaryPanels } from './ExecutionDashboardPhoneBodyTertiaryPanels';
import { buildPhoneBodySecondaryScope } from './buildPhoneBodySecondaryScope';
import { buildPhoneBodyDeferredScope } from './buildPhoneBodyDeferredScope';
import { useExecutionDashboardPhoneBodyScope } from '../hooks/useExecutionDashboardPhoneBodyScope';
import { useExecutionDashboardPhoneBodyNavigation } from '../hooks/useExecutionDashboardPhoneBodyNavigation';
import { useExecutionDashboardPhoneBodyCustodyLabels } from '../hooks/useExecutionDashboardPhoneBodyCustodyLabels';
import { ExecutionDashboardSparkNudgeBridge } from './ExecutionDashboardSparkNudgeBridge';
import {
    prefetchCustodyRemovalWardsModule,
    prefetchMaritalFurnitureModule,
    prefetchVisitationScheduleModule,
} from '../executionDashboardLazyRegistry';

export type { ExecutionDashboardPhoneBodyProps };

export const ExecutionDashboardPhoneBody = React.memo(function ExecutionDashboardPhoneBody({
    renderFingerprint,
}: {
    renderFingerprint?: string;
}) {
    const body = useExecutionDashboardPhoneBodyScope(renderFingerprint);

    const { handleDossierBack, handleDossierExit, dossierNestedNav } = useExecutionDashboardPhoneBodyNavigation({
        scopeRef: body.scopeRef,
        onClose: body.onClose,
        showExecutionTrashModal: body.showExecutionTrashModal,
        setShowExecutionTrashModal: body.setShowExecutionTrashModal,
        showVisitationCalendarModal: body.showVisitationCalendarModal,
        setShowVisitationCalendarModal: body.setShowVisitationCalendarModal,
        showUnifiedSeizureLogModal: body.showUnifiedSeizureLogModal,
        closeUnifiedSeizureLog: body.closeUnifiedSeizureLog,
        propertySeizureRequestModalOpen: body.propertySeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen: body.setPropertySeizureRequestModalOpen,
        movableSeizureRequestModalOpen: body.movableSeizureRequestModalOpen,
        setMovableSeizureRequestModalOpen: body.setMovableSeizureRequestModalOpen,
        showExecutionFinancialHub: body.showExecutionFinancialHub,
        setShowExecutionFinancialHub: body.setShowExecutionFinancialHub,
        dossierActionModalOpen: body.dossierActionModalOpen,
        setDossierActionModalOpen: body.setDossierActionModalOpen,
        dossierLifecyclePanelOpen: body.dossierLifecyclePanelOpen,
        setDossierLifecyclePanelOpen: body.setDossierLifecyclePanelOpen,
        hasChildDossiers: body.hasChildDossiers,
        isInabaActive: body.isInabaActive,
        activeTabId: body.activeTabId,
        currentFileId: body.currentFileId,
        setActiveTabId: body.setActiveTabId,
        activeSubFileId: body.activeSubFileId,
    });

    const { isCustodyRemovalClaimActive, custodyWardNamesResolved } =
        useExecutionDashboardPhoneBodyCustodyLabels(body.viewExecutionData, body.claimType);

    useEffect(() => {
        if (isCustodyRemovalClaimActive) {
            prefetchCustodyRemovalWardsModule();
        }
    }, [isCustodyRemovalClaimActive]);

    useEffect(() => {
        if (body.props.isVisitationClaim) {
            prefetchVisitationScheduleModule();
        }
    }, [body.props.isVisitationClaim]);

    useEffect(() => {
        if (body.props.isMaritalFurnitureClaim) {
            prefetchMaritalFurnitureModule();
        }
    }, [body.props.isMaritalFurnitureClaim]);

    const deferredScope = buildPhoneBodyDeferredScope(body.props);

    return (
        <div
            className="bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30"
            dir="rtl"
        >
            <ExecutionDashboardPhoneBodyHeader
                handleDossierBack={handleDossierBack}
                handleDossierExit={handleDossierExit}
                dossierNestedNav={dossierNestedNav}
                dossierLifecyclePopoverRef={body.dossierLifecyclePopoverRef}
                dossierLifecyclePanelPortalRef={body.dossierLifecyclePanelPortalRef}
                dossierLifecyclePanelOpen={body.dossierLifecyclePanelOpen}
                dossierLifecyclePopStyle={body.dossierLifecyclePopStyle}
                dossierLifecyclePanelPhase={body.dossierLifecyclePanelPhase}
                dossierStatusDraft={body.dossierStatusDraft}
                dossierPendingStatus={body.dossierPendingStatus}
                dossierReasonDraft={body.dossierReasonDraft}
                dossierDateDraft={body.dossierDateDraft}
                setDossierLifecyclePanelOpen={body.setDossierLifecyclePanelOpen}
                setDossierLifecyclePanelPhase={body.setDossierLifecyclePanelPhase}
                setDossierPendingStatus={body.setDossierPendingStatus}
                setDossierReasonDraft={body.setDossierReasonDraft}
                setDossierDateDraft={body.setDossierDateDraft}
                safeHandleDossierLifecyclePick={body.safeHandleDossierLifecyclePick}
                safeHandleDossierLifecycleConfirmDetails={body.safeHandleDossierLifecycleConfirmDetails}
                trashedTimelineEvents={body.safeTrashedTimelineEvents}
                trashedCaseNotes={body.safeTrashedCaseNotes}
                trashedCaseTasks={body.safeTrashedCaseTasks}
                setShowExecutionTrashModal={body.setShowExecutionTrashModal}
                sparkNudgeSlot={
                    <ExecutionDashboardSparkNudgeBridge
                        scope={body.props}
                        directOpenUnifiedSummonsHub={body.directOpenUnifiedSummonsHub}
                        setDossierLifecyclePanelOpen={body.setDossierLifecyclePanelOpen}
                    />
                }
            />

            <ExecutionDashboardPhoneBodyDossierChrome
                stayOfExecutionActive={body.stayOfExecutionActive}
                parentDossierId={body.parentDossierId}
                file={body.file}
                hasChildDossiers={body.hasChildDossiers}
                isInabaActive={body.isInabaActive}
                activeTabId={body.activeTabId}
                currentFileId={body.currentFileId}
                currentFile={body.currentFile}
                childDossiers={body.childDossiers}
                setActiveTabId={body.setActiveTabId}
                setExecutionStorageTick={body.setExecutionStorageTick}
                showToast={body.showToast}
            />

            <div
                className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent overscroll-contain"
                dir="rtl"
            >
                <ExecutionDashboardPhoneBodyPrimarySections
                    scope={body.props}
                    scopeRef={body.scopeRef}
                    debtorsSectionRef={body.debtorsSectionRef}
                    safeOpenEditDossierMeta={body.safeOpenEditDossierMeta}
                    safeOpenParentDossierMetaEdit={body.safeOpenParentDossierMetaEdit}
                    safeOpenEditParty={body.safeOpenEditParty}
                    isCustodyRemovalClaimActive={isCustodyRemovalClaimActive}
                    custodyWardNamesResolved={custodyWardNamesResolved}
                />

                <ExecutionDashboardPhoneBodyQuaternaryPanels
                    scope={deferredScope}
                    quaternaryStageReady={body.quaternaryStageReady}
                    safeActiveGraceTasks={body.safeActiveGraceTasks}
                    safeShouldShowGuarantorExternalHub={body.safeShouldShowGuarantorExternalHub}
                    visitationFileNumber={String(
                        body.executionData?.fileNumber ?? body.headerFields?.fileNumber ?? '',
                    )}
                    directOpenUnifiedSummonsHub={body.directOpenUnifiedSummonsHub}
                    removeJudicialCustodianEntry={body.removeJudicialCustodianEntry}
                    openGuarantorFollowupDetails={body.openGuarantorFollowupDetails}
                />

                {body.secondaryStageReady ? (
                    <ExecutionDashboardPhoneBodySecondarySections
                        scope={buildPhoneBodySecondaryScope(body.props)}
                        secondaryStageReady={body.secondaryStageReady}
                        includeCustodyRemoval={false}
                        followupSpec={body.followupSpec}
                        safeResolveCalendarUserId={body.safeResolveCalendarUserId}
                        safeSetTimelineAccordionExpanded={body.safeSetTimelineAccordionExpanded}
                        safeTimelineAccordionExpanded={body.safeTimelineAccordionExpanded}
                        safeSubFilesCount={body.subFiles.length}
                        safeOpenAppointmentModal={body.safeOpenAppointmentModal}
                        directOpenNotesModal={body.directOpenNotesModal}
                        directOpenDocumentsModal={body.directOpenDocumentsModal}
                        directOpenTimelineModal={body.directOpenTimelineModal}
                        directOpenFinancialCenter={body.directOpenFinancialCenter}
                        directHandleMemoFollowupClick={
                            body.directHandleMemoFollowupClick ?? body.handleMemoFollowupClick
                        }
                        directOpenDecisionsModalWithBoot={body.directOpenDecisionsModalWithBoot}
                    />
                ) : (
                    <ExecutionDashboardPhoneBodyDeferredStagePlaceholder />
                )}

                {body.tertiaryStageReady ? (
                    <ExecutionDashboardPhoneBodyTertiaryPanels
                        scope={deferredScope}
                        tertiaryStageReady={body.tertiaryStageReady}
                        propertyInlineSaveCtx={body.propertyInlineSaveCtx}
                        movableInlineSaveCtx={body.movableInlineSaveCtx}
                        saveSeizedMovableInitForDecision={body.saveSeizedMovableInitForDecision}
                        closeFinancialHubPortal={body.closeFinancialHubPortal}
                        toggleFinancialCenterExpanded={body.toggleFinancialCenterExpanded}
                        openGuarantorFollowupDetails={body.openGuarantorFollowupDetails}
                        directOpenPaymentCalculator={body.directOpenPaymentCalculator}
                        directOpenSettlementCalculator={body.directOpenSettlementCalculator}
                        directOpenLedgerModal={body.directOpenLedgerModal}
                        directOpenEvictionExpenseModal={body.directOpenEvictionExpenseModal}
                        expandDebtor={(debtorKey) =>
                            body.debtorsSectionRef.current?.expandDebtor(debtorKey)
                        }
                        primaryDebtorWorkspaceKey={body.primaryDebtorWorkspaceKey}
                        setShowUnifiedExecutionModal={body.setShowUnifiedExecutionModal}
                        setExecutionDebtorTabIndex={body.setExecutionDebtorTabIndex}
                    />
                ) : body.secondaryStageReady ? (
                    <ExecutionDashboardPhoneBodyDeferredStagePlaceholder className="mx-3 mt-2" />
                ) : null}

                <div className="h-6"></div>
            </div>
        </div>
    );
}, phoneBodyPropsEqual);
