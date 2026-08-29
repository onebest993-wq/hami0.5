import React from 'react';
import { CoerciveSeizureToolsSection } from './CoerciveSeizureToolsSection';
import type { CoerciveSeizureToolsSectionProps } from './CoerciveSeizureToolsSection';
import { CoerciveTabLeadBanners } from './CoerciveTabLeadBanners';
import { CoerciveTabNonEvictionBody } from './CoerciveTabNonEvictionBody';
import { CoerciveTabEvictionPanel } from './CoerciveTabEvictionPanel';
import { EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import type { ExecutionFile } from '@/app/types/execution';
import type { EvictionFieldProceduresPanelProps } from '@/app/components/lawyer/execution/evictionField';
import { useCoerciveTabReadyDerived } from './useCoerciveTabReadyDerived';

export type { CoerciveTabProps } from './CoerciveTab.types';
import type { CoerciveTabProps } from './CoerciveTab.types';

export const CoerciveTabReady: React.FC<CoerciveTabProps> = ({
    coerciveUiLocked,
    isEvictionExecutionModule,
    executionData,
    gracePeriodEnded,
    daysRemainingInGracePeriod,
    executionStatus,
    debtorAttendedVoluntarily,
    lawyerStartedPostNoticeExecution,
    registerDebtorVoluntaryAttendance,
    openExecutionSeizuresTab,
    EXEC_OVERLAY_LAZY_FALLBACK: _EXEC_OVERLAY_LAZY_FALLBACK,
    LazyEvictionFieldProceduresPanel,
    evictionProcedureLocked,
    evictionProcedureLockHint,
    activeTimelineEvents,
    evictionPremisesUseResolved,
    showResidentialEvictionGraceControl,
    residentialGracePeriodSaved = false,
    openEvictionResidentialGraceModal,
    showResidentialGraceEarlyEndRequest,
    showBreakInventoryRequest = true,
    showEvictionFieldworkRequests = true,
    evictionHeirsNotificationDateYmd,
    handleEvictionHeirsNotificationDateChange,
    handleIssueHeirsExecutionNoticeMemo,
    appendEvictionProcedure,
    tryOpenPendingBreakInventoryLedger,
    tryOpenPendingCustodianDetails,
    saveJudicialCustodianDetails,
    openPoliceAssistanceDetails,
    savePoliceAssistance,
    saveBreakInventoryLedger,
    finalizeBreakInventoryRequest,
    isMaritalFurnitureClaim = false,
    maritalFurnitureItems = [],
    saveMaritalFurnitureDeliveryInventory,
    onOpenDecisionsModal,
    expandProcedureKey,
    onExpandProcedureConsumed,
    followupEmployeeFinancialSalaryOnlyCoercive,
    followupMonetaryCoerciveLimitedOnly,
    hideCoerciveGraceNoticeBanner = false,
    hideCoerciveFinancialBanners = false,
    hideCoerciveSeizureSalaryAndProperty = false,
    hideEncroachmentEvictionProcedureItems = false,
    showEncroachmentRemovalRequestCards = false,
    showSpecificDeliverySurveyorCard = false,
    showSpecificDeliveryConversionCard = false,
    showSpecificDeliveryBreakInventoryCard = false,
    showSpecificDeliveryFieldProcedures = false,
    showGenericFieldProcedureCards = false,
    isSpecificDeliveryModule = false,
    hideEvictionCustodianProcedure = false,
    specificDeliveryFinancialized = false,
    specificDeliveryItemName = '',
    specificDeliveryItemNature = null,
    specificDeliveryItems = null,
    debtAmount = 0,
    totalAmount = 0,
    specificDeliveryConvertedAmount = 0,
    onSpecificDeliveryFinancialized,
    onSpecificDeliveryItemDeclaredDestroyed,
    onEncroachmentExpenseRecorded,
    onSpecificDeliveryExpenseRecorded,
    executionCoerciveButtonDisabled,
    inlineActionGateKey,
    setInlineActionGateKey,
    handleCoerciveAction,
    handleEndGracePeriod,
    appendEvictionExecutorRequest,
    decisionsStorageExecutionId,
    showToast,
    EVICTION_TIMELINE_ACTION_IDS,
    activeDebtorIsEmployee,
    activeDebtorIsDeceased = false,
    activeCoerciveActions,
    followupSalarySeizureLabel,
    followupGarnishmentAmountPreview,
    hideFollowupCoerciveTab = false,
    isHistoricalMode = false,
    claimType = null,
    saveCoerciveAction,
    pushTimelineEvent,
    nextTimelineId,
    persistExecutionMerge,
}) => {
    const {
        effectiveEvictionModule,
        seizureToolsReady,
        recordEvictionTimelineAction,
        showEncroachmentCards,
        encroachmentExecutionId,
        needsSpecificDeliveryNatureSetup,
        showSpecificDeliveryProceduresBlock,
        showEmptyCoerciveHint,
    } = useCoerciveTabReadyDerived({
        claimType,
        isEvictionExecutionModule,
        saveCoerciveAction,
        pushTimelineEvent,
        nextTimelineId,
        showEncroachmentRemovalRequestCards,
        decisionsStorageExecutionId,
        executionData,
        isSpecificDeliveryModule,
        showSpecificDeliveryFieldProcedures,
        specificDeliveryFinancialized,
        isMaritalFurnitureClaim,
        hideCoerciveSeizureSalaryAndProperty,
        hideFollowupCoerciveTab,
        gracePeriodEnded,
        coerciveUiLocked,
        hideCoerciveGraceNoticeBanner,
        executionStatus,
        debtorAttendedVoluntarily,
        lawyerStartedPostNoticeExecution,
        followupEmployeeFinancialSalaryOnlyCoercive,
        hideCoerciveFinancialBanners,
    });

    const EvictionFieldPanel: React.ComponentType<EvictionFieldProceduresPanelProps> & {
        isPreloaded?: () => boolean;
    } = LazyEvictionFieldProceduresPanel;

    return (
    <>
        <CoerciveTabLeadBanners
            coerciveUiLocked={coerciveUiLocked}
            effectiveEvictionModule={effectiveEvictionModule}
            gracePeriodEnded={gracePeriodEnded}
            hideCoerciveGraceNoticeBanner={hideCoerciveGraceNoticeBanner}
            daysRemainingInGracePeriod={daysRemainingInGracePeriod}
            executionStatus={executionStatus}
            debtorAttendedVoluntarily={debtorAttendedVoluntarily}
            lawyerStartedPostNoticeExecution={lawyerStartedPostNoticeExecution}
            registerDebtorVoluntaryAttendance={registerDebtorVoluntaryAttendance}
            openExecutionSeizuresTab={openExecutionSeizuresTab}
        />

        {effectiveEvictionModule ? (
            <CoerciveTabEvictionPanel
                    EvictionFieldPanel={EvictionFieldPanel}
                    recordEvictionTimelineAction={recordEvictionTimelineAction}
                    evictionProcedureLocked={evictionProcedureLocked}
                    evictionProcedureLockHint={evictionProcedureLockHint}
                    activeTimelineEvents={activeTimelineEvents}
                    evictionPremisesUseResolved={evictionPremisesUseResolved}
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    executionData={executionData}
                    showResidentialEvictionGraceControl={showResidentialEvictionGraceControl}
                    residentialGracePeriodSaved={residentialGracePeriodSaved}
                    openEvictionResidentialGraceModal={openEvictionResidentialGraceModal}
                    showResidentialGraceEarlyEndRequest={showResidentialGraceEarlyEndRequest}
                    showBreakInventoryRequest={showBreakInventoryRequest}
                    showEvictionFieldworkRequests={showEvictionFieldworkRequests}
                    evictionHeirsNotificationDateYmd={evictionHeirsNotificationDateYmd}
                    handleEvictionHeirsNotificationDateChange={handleEvictionHeirsNotificationDateChange}
                    handleIssueHeirsExecutionNoticeMemo={handleIssueHeirsExecutionNoticeMemo}
                    tryOpenPendingBreakInventoryLedger={tryOpenPendingBreakInventoryLedger}
                    tryOpenPendingCustodianDetails={tryOpenPendingCustodianDetails}
                    saveJudicialCustodianDetails={saveJudicialCustodianDetails}
                    openPoliceAssistanceDetails={openPoliceAssistanceDetails}
                    savePoliceAssistance={savePoliceAssistance}
                    saveBreakInventoryLedger={saveBreakInventoryLedger}
                    finalizeBreakInventoryRequest={finalizeBreakInventoryRequest}
                    isMaritalFurnitureClaim={isMaritalFurnitureClaim}
                    maritalFurnitureItems={maritalFurnitureItems}
                    saveMaritalFurnitureDeliveryInventory={saveMaritalFurnitureDeliveryInventory}
                />
        ) : null}

        {!effectiveEvictionModule ? (
            <CoerciveTabNonEvictionBody
                needsSpecificDeliveryNatureSetup={needsSpecificDeliveryNatureSetup}
                showEncroachmentCards={showEncroachmentCards}
                encroachmentExecutionId={encroachmentExecutionId}
                showSpecificDeliveryProceduresBlock={showSpecificDeliveryProceduresBlock}
                showSpecificDeliveryFieldProcedures={showSpecificDeliveryFieldProcedures}
                followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
                hideCoerciveFinancialBanners={hideCoerciveFinancialBanners}
                executionData={executionData}
                persistExecutionMerge={persistExecutionMerge}
                showToast={showToast}
                inlineActionGateKey={inlineActionGateKey}
                setInlineActionGateKey={setInlineActionGateKey}
                onEncroachmentExpenseRecorded={onEncroachmentExpenseRecorded}
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                gracePeriodEnded={gracePeriodEnded}
                handleEndGracePeriod={handleEndGracePeriod}
                appendEvictionProcedure={appendEvictionProcedure}
                appendEvictionExecutorRequest={appendEvictionExecutorRequest}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                EVICTION_TIMELINE_ACTION_IDS={EVICTION_TIMELINE_ACTION_IDS}
                hideEncroachmentEvictionProcedureItems={hideEncroachmentEvictionProcedureItems}
                hideEvictionCustodianProcedure={hideEvictionCustodianProcedure}
                showGenericFieldProcedureCards={showGenericFieldProcedureCards}
                showSpecificDeliveryBreakInventoryCard={showSpecificDeliveryBreakInventoryCard}
                showSpecificDeliverySurveyorCard={showSpecificDeliverySurveyorCard}
                showSpecificDeliveryConversionCard={showSpecificDeliveryConversionCard}
                specificDeliveryItemName={specificDeliveryItemName}
                specificDeliveryItemNature={specificDeliveryItemNature}
                specificDeliveryItems={specificDeliveryItems}
                debtAmount={debtAmount}
                totalAmount={totalAmount}
                specificDeliveryConvertedAmount={specificDeliveryConvertedAmount}
                specificDeliveryFinancialized={specificDeliveryFinancialized}
                onSpecificDeliveryFinancialized={onSpecificDeliveryFinancialized}
                onSpecificDeliveryItemDeclaredDestroyed={onSpecificDeliveryItemDeclaredDestroyed}
                onSpecificDeliveryExpenseRecorded={onSpecificDeliveryExpenseRecorded}
                openPoliceAssistanceDetails={openPoliceAssistanceDetails}
                savePoliceAssistance={savePoliceAssistance}
                saveBreakInventoryLedger={saveBreakInventoryLedger}
                finalizeBreakInventoryRequest={finalizeBreakInventoryRequest}
                isMaritalFurnitureClaim={isMaritalFurnitureClaim}
                maritalFurnitureItems={maritalFurnitureItems}
                saveMaritalFurnitureDeliveryInventory={saveMaritalFurnitureDeliveryInventory}
                saveJudicialCustodianDetails={saveJudicialCustodianDetails}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                onOpenDecisionsModal={onOpenDecisionsModal}
                expandProcedureKey={expandProcedureKey}
                onExpandProcedureConsumed={onExpandProcedureConsumed}
            />
        ) : null}

        {seizureToolsReady ? (
            <CoerciveSeizureToolsSection
                isEvictionExecutionModule={effectiveEvictionModule}
                activeDebtorIsEmployee={activeDebtorIsEmployee}
                activeDebtorIsDeceased={activeDebtorIsDeceased}
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                coerciveUiLocked={coerciveUiLocked}
                isHistoricalMode={isHistoricalMode}
                executionId={decisionsStorageExecutionId}
                executionData={(executionData as ExecutionFile | null | undefined) ?? null}
                followupSalarySeizureLabel={followupSalarySeizureLabel}
                followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
                followupMonetaryCoerciveLimitedOnly={followupMonetaryCoerciveLimitedOnly}
                hideCoerciveSeizureSalaryAndProperty={
                    hideCoerciveSeizureSalaryAndProperty || hideFollowupCoerciveTab
                }
                inlineActionGateKey={inlineActionGateKey}
                setInlineActionGateKey={setInlineActionGateKey}
                saveCoerciveAction={saveCoerciveAction}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                showToast={showToast as CoerciveSeizureToolsSectionProps['showToast']}
                persistExecutionMerge={persistExecutionMerge}
            />
        ) : null}

        {showEmptyCoerciveHint ? (
            seizureToolsReady ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-[11px] leading-relaxed text-white/55">
                    لا تتوفر عناصر إجرائية في هذا التبويب لهذه الإضبارة.
                </p>
            ) : (
                EXEC_SECTION_LAZY_FALLBACK
            )
        ) : null}
    </>
    );
};
