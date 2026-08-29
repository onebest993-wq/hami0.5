import React from 'react';
import { LazyEvictionFieldProceduresPanel } from '../executionDashboardLazyRegistryOverlays';
import { EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { EVICTION_TIMELINE_ACTION_IDS, isSpecificDeliveryClaim } from '@/app/utils/executionModuleStrategies';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import { requireDecisionsStorageExecutionId } from '../utils/requireDecisionsStorageExecutionId';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';

export function ExecutionFollowupModalCoerciveTabPanel({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    const {
        TabCoercive,
        activeCoerciveActions,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeFollowupDebtorKey,
        activePanelKey,
        activeTimelineEvents,
        appendEvictionExecutorRequest,
        appendEvictionProcedure,
        claimType,
        claimTypeForExecutionModule,
        coerciveUiLocked,
        consumeFollowupExpandProcedure,
        daysRemainingInGracePeriod,
        debtorAttendedVoluntarily,
        decisionsStorageExecutionId,
        evictionHeirsNotificationDateYmd,
        evictionPremisesUseResolved,
        evictionProcedureLockHint,
        evictionProcedureLocked,
        executionCoerciveButtonDisabled,
        executionData,
        executionId,
        executionStatus,
        finalizeBreakInventoryEntry,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupExpandProcedureKey,
        followupGarnishmentAmountPreview,
        followupMonetaryCoerciveLimitedOnly,
        followupSalarySeizureLabel,
        gracePeriodEnded,
        handleCoerciveAction,
        handleEncroachmentExpenseRecorded,
        handleEndGracePeriod,
        handleEvictionHeirsNotificationDateChange,
        handleIssueHeirsExecutionNoticeMemo,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
        headerFields,
        inlineActionGateKey,
        isEvictionExecutionModule,
        isHistoricalMode,
        isMaritalFurnitureClaim,
        lawyerStartedPostNoticeExecution,
        maritalFurnitureItemsForFollowup,
        nextTimelineId,
        openDecisionsModalWithBoot,
        openEvictionResidentialGraceModal,
        openExecutionSeizuresTab,
        openPoliceAssistanceDetailsForDecision,
        panelsToRender,
        persistExecutionMerge,
        pushTimelineEvent,
        registerDebtorVoluntaryAttendance,
        remaining,
        residentialGraceAllowsFieldwork,
        residentialGracePeriodSaved,
        saveBreakInventoryLedgerEntry,
        saveCoerciveAction,
        saveMaritalFurnitureDeliveryInventoryEntry,
        savePoliceAssistanceEntry,
        saveJudicialCustodianEntry,
        setInlineActionGateKey,
        showBreakInventoryRequest,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        showToast,
        spec,
        specificDeliveryConvertedAmount,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        viewExecutionData,
    } = c;

    if (!panelsToRender.has('coercive') || spec.hideFollowupCoerciveTab) return null;

    return (
        <FollowupTabKeepAlivePanel
            key={`coercive:${String(activeFollowupDebtorKey ?? '')}`}
            panelId="coercive"
            active={activePanelKey === 'coercive'}
            className="space-y-4 rounded-2xl border border-white/10 bg-[#0B1120]/72 p-4 sm:p-5"
        >
            <TabCoercive
                coerciveUiLocked={coerciveUiLocked}
                isEvictionExecutionModule={isEvictionExecutionModule}
                executionData={viewExecutionData}
                gracePeriodEnded={gracePeriodEnded}
                daysRemainingInGracePeriod={daysRemainingInGracePeriod}
                executionStatus={executionStatus}
                debtorAttendedVoluntarily={debtorAttendedVoluntarily}
                lawyerStartedPostNoticeExecution={lawyerStartedPostNoticeExecution}
                registerDebtorVoluntaryAttendance={registerDebtorVoluntaryAttendance}
                openExecutionSeizuresTab={openExecutionSeizuresTab}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_SECTION_LAZY_FALLBACK}
                LazyEvictionFieldProceduresPanel={LazyEvictionFieldProceduresPanel}
                evictionProcedureLocked={evictionProcedureLocked}
                evictionProcedureLockHint={evictionProcedureLockHint}
                activeTimelineEvents={activeTimelineEvents}
                evictionPremisesUseResolved={evictionPremisesUseResolved}
                showResidentialEvictionGraceControl={showResidentialEvictionGraceControl}
                residentialGracePeriodSaved={residentialGracePeriodSaved}
                openEvictionResidentialGraceModal={openEvictionResidentialGraceModal}
                showResidentialGraceEarlyEndRequest={showResidentialGraceEarlyEndRequest}
                showBreakInventoryRequest={showBreakInventoryRequest}
                showEvictionFieldworkRequests={residentialGraceAllowsFieldwork}
                evictionHeirsNotificationDateYmd={evictionHeirsNotificationDateYmd}
                handleEvictionHeirsNotificationDateChange={handleEvictionHeirsNotificationDateChange}
                handleIssueHeirsExecutionNoticeMemo={handleIssueHeirsExecutionNoticeMemo}
                appendEvictionProcedure={appendEvictionProcedure}
                tryOpenPendingBreakInventoryLedger={tryOpenPendingBreakInventoryLedger}
                tryOpenPendingCustodianDetails={tryOpenPendingCustodianDetails}
                openPoliceAssistanceDetails={openPoliceAssistanceDetailsForDecision}
                savePoliceAssistance={savePoliceAssistanceEntry}
                saveJudicialCustodianDetails={saveJudicialCustodianEntry}
                saveBreakInventoryLedger={saveBreakInventoryLedgerEntry}
                finalizeBreakInventoryRequest={finalizeBreakInventoryEntry}
                isMaritalFurnitureClaim={isMaritalFurnitureClaim}
                maritalFurnitureItems={maritalFurnitureItemsForFollowup}
                saveMaritalFurnitureDeliveryInventory={saveMaritalFurnitureDeliveryInventoryEntry}
                onOpenDecisionsModal={openDecisionsModalWithBoot}
                expandProcedureKey={followupExpandProcedureKey}
                onExpandProcedureConsumed={consumeFollowupExpandProcedure}
                followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
                followupMonetaryCoerciveLimitedOnly={followupMonetaryCoerciveLimitedOnly}
                hideCoerciveGraceNoticeBanner={spec.hideCoerciveGraceNoticeBanner}
                hideCoerciveFinancialBanners={spec.hideCoerciveFinancialBanners}
                hideCoerciveSeizureSalaryAndProperty={spec.hideCoerciveSeizureSalaryAndProperty}
                hideEncroachmentEvictionProcedureItems={spec.hideEncroachmentEvictionProcedureItems}
                showEncroachmentRemovalRequestCards={spec.showEncroachmentRemovalRequestCards}
                claimType={claimTypeForExecutionModule || claimType}
                showSpecificDeliverySurveyorCard={spec.showSpecificDeliverySurveyorCard}
                showSpecificDeliveryConversionCard={spec.showSpecificDeliveryConversionCard}
                hideEvictionCustodianProcedure={spec.hideEvictionCustodianProcedure}
                showSpecificDeliveryBreakInventoryCard={spec.showSpecificDeliveryBreakInventoryCard}
                showSpecificDeliveryFieldProcedures={spec.showSpecificDeliveryFieldProcedures}
                showGenericFieldProcedureCards={
                    spec.showSpecificDeliveryFieldProcedures && !isMaritalFurnitureClaim
                }
                hideFollowupCoerciveTab={spec.hideFollowupCoerciveTab}
                isSpecificDeliveryModule={isSpecificDeliveryClaim(claimTypeForExecutionModule)}
                specificDeliveryFinancialized={Boolean(
                    (executionData as { specificDeliveryFinancialized?: boolean })
                        ?.specificDeliveryFinancialized,
                )}
                specificDeliveryItemName={headerFields.specificDeliveryItemName}
                specificDeliveryItemNature={headerFields.specificDeliveryItemNature}
                specificDeliveryItems={
                    (executionData as { specificDeliveryItems?: unknown })?.specificDeliveryItems as
                        | import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[]
                        | undefined
                }
                debtAmount={executionData?.debtAmount}
                totalAmount={executionData?.totalAmount}
                specificDeliveryConvertedAmount={specificDeliveryConvertedAmount ?? 0}
                onSpecificDeliveryFinancialized={handleSpecificDeliveryFinancialized}
                onSpecificDeliveryItemDeclaredDestroyed={handleSpecificDeliveryItemDeclaredDestroyed}
                onEncroachmentExpenseRecorded={handleEncroachmentExpenseRecorded}
                onSpecificDeliveryExpenseRecorded={handleSpecificDeliveryExpenseRecorded}
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                inlineActionGateKey={inlineActionGateKey}
                setInlineActionGateKey={setInlineActionGateKey}
                handleCoerciveAction={handleCoerciveAction}
                activeCoerciveActions={activeCoerciveActions}
                followupGarnishmentAmountPreview={followupGarnishmentAmountPreview}
                handleEndGracePeriod={handleEndGracePeriod}
                appendEvictionExecutorRequest={appendEvictionExecutorRequest}
                decisionsStorageExecutionId={requireDecisionsStorageExecutionId({
                    decisionsStorageExecutionId,
                    executionId,
                    executionData: viewExecutionData as Record<string, unknown> | null,
                })}
                showToast={showToast}
                EVICTION_TIMELINE_ACTION_IDS={EVICTION_TIMELINE_ACTION_IDS}
                activeDebtorIsEmployee={activeDebtorIsEmployee}
                activeDebtorIsDeceased={activeDebtorIsDeceased}
                isHistoricalMode={isHistoricalMode}
                saveCoerciveAction={saveCoerciveAction}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                persistExecutionMerge={persistExecutionMerge}
                followupSalarySeizureLabel={followupSalarySeizureLabel}
            />
        </FollowupTabKeepAlivePanel>
    );
}
