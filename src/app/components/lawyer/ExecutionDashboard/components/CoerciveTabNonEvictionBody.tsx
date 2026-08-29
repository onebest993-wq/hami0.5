import React from 'react';
import { EncroachmentRemovalRequestCards } from './EncroachmentRemovalRequestCards';
import { EvictionProceduresSection } from './EvictionProceduresSection';
import { SpecificDeliveryNatureSetupCard } from './SpecificDeliveryNatureSetupCard';
import type { CoerciveTabProps } from './CoerciveTab.types';

type CoerciveTabNonEvictionProps = Pick<
    CoerciveTabProps,
    | 'executionData'
    | 'persistExecutionMerge'
    | 'showToast'
    | 'inlineActionGateKey'
    | 'setInlineActionGateKey'
    | 'onEncroachmentExpenseRecorded'
    | 'executionCoerciveButtonDisabled'
    | 'gracePeriodEnded'
    | 'handleEndGracePeriod'
    | 'appendEvictionProcedure'
    | 'appendEvictionExecutorRequest'
    | 'decisionsStorageExecutionId'
    | 'EVICTION_TIMELINE_ACTION_IDS'
    | 'hideEncroachmentEvictionProcedureItems'
    | 'hideEvictionCustodianProcedure'
    | 'showGenericFieldProcedureCards'
    | 'showSpecificDeliveryBreakInventoryCard'
    | 'showSpecificDeliverySurveyorCard'
    | 'showSpecificDeliveryConversionCard'
    | 'specificDeliveryItemName'
    | 'specificDeliveryItemNature'
    | 'specificDeliveryItems'
    | 'debtAmount'
    | 'totalAmount'
    | 'specificDeliveryConvertedAmount'
    | 'specificDeliveryFinancialized'
    | 'onSpecificDeliveryFinancialized'
    | 'onSpecificDeliveryItemDeclaredDestroyed'
    | 'onSpecificDeliveryExpenseRecorded'
    | 'openPoliceAssistanceDetails'
    | 'savePoliceAssistance'
    | 'saveBreakInventoryLedger'
    | 'finalizeBreakInventoryRequest'
    | 'isMaritalFurnitureClaim'
    | 'maritalFurnitureItems'
    | 'saveMaritalFurnitureDeliveryInventory'
    | 'saveJudicialCustodianDetails'
    | 'pushTimelineEvent'
    | 'nextTimelineId'
    | 'onOpenDecisionsModal'
    | 'expandProcedureKey'
    | 'onExpandProcedureConsumed'
    | 'followupEmployeeFinancialSalaryOnlyCoercive'
    | 'hideCoerciveFinancialBanners'
>;

export function CoerciveTabNonEvictionBody({
    needsSpecificDeliveryNatureSetup,
    showEncroachmentCards,
    encroachmentExecutionId,
    showSpecificDeliveryProceduresBlock,
    showSpecificDeliveryFieldProcedures,
    followupEmployeeFinancialSalaryOnlyCoercive,
    hideCoerciveFinancialBanners,
    ...rest
}: CoerciveTabNonEvictionProps & {
    needsSpecificDeliveryNatureSetup: boolean;
    showEncroachmentCards: boolean;
    encroachmentExecutionId: string;
    showSpecificDeliveryProceduresBlock: boolean;
    showSpecificDeliveryFieldProcedures: boolean;
}) {
    return (
        <>
            {followupEmployeeFinancialSalaryOnlyCoercive && !hideCoerciveFinancialBanners && (
                <div className="bg-emerald-950/30 border border-emerald-500/35 rounded-2xl p-3 text-right">
                    <p className="text-emerald-200/95 text-[11px] leading-relaxed">
                        تنفيذ مالي ومدين موظف: طلب حجز راتب (١/٥) أو عقار أو مال منقول يُعرَض على منفذ العدل. مسار الحجز المالي هنا؛ الإجراءات الشخصية وطلب الكفيل و«تحركات الطرف الآخر» من محضر المتابعة عند الحاجة.
                    </p>
                </div>
            )}

            {needsSpecificDeliveryNatureSetup ? (
                <SpecificDeliveryNatureSetupCard
                    executionData={rest.executionData}
                    persistExecutionMerge={rest.persistExecutionMerge}
                    showToast={rest.showToast}
                />
            ) : null}

            <div className="space-y-2.5">
                {showEncroachmentCards && encroachmentExecutionId ? (
                    <EncroachmentRemovalRequestCards
                        decisionsStorageExecutionId={encroachmentExecutionId}
                        inlineActionGateKey={rest.inlineActionGateKey}
                        setInlineActionGateKey={rest.setInlineActionGateKey}
                        showToast={rest.showToast}
                        onExpenseRecorded={rest.onEncroachmentExpenseRecorded}
                    />
                ) : null}
                {(showSpecificDeliveryProceduresBlock && showSpecificDeliveryFieldProcedures) ||
                rest.isMaritalFurnitureClaim ? (
                    <EvictionProceduresSection
                        executionCoerciveButtonDisabled={rest.executionCoerciveButtonDisabled}
                        inlineActionGateKey={rest.inlineActionGateKey}
                        gracePeriodEnded={rest.gracePeriodEnded}
                        setInlineActionGateKey={rest.setInlineActionGateKey}
                        handleEndGracePeriod={rest.handleEndGracePeriod}
                        appendEvictionProcedure={rest.appendEvictionProcedure}
                        appendEvictionExecutorRequest={rest.appendEvictionExecutorRequest}
                        decisionsStorageExecutionId={rest.decisionsStorageExecutionId}
                        executionData={rest.executionData}
                        showToast={rest.showToast}
                        EVICTION_TIMELINE_ACTION_IDS={rest.EVICTION_TIMELINE_ACTION_IDS}
                        hideEncroachmentEvictionProcedureItems={rest.hideEncroachmentEvictionProcedureItems}
                        hideEvictionCustodianProcedure={rest.hideEvictionCustodianProcedure}
                        showGenericFieldProcedureCards={rest.showGenericFieldProcedureCards}
                        showSpecificDeliveryBreakInventoryCard={rest.showSpecificDeliveryBreakInventoryCard}
                        showSpecificDeliverySurveyorCard={rest.showSpecificDeliverySurveyorCard}
                        showSpecificDeliveryConversionCard={rest.showSpecificDeliveryConversionCard}
                        specificDeliveryItemName={rest.specificDeliveryItemName}
                        specificDeliveryItemNature={rest.specificDeliveryItemNature}
                        specificDeliveryItems={rest.specificDeliveryItems}
                        debtAmount={rest.debtAmount}
                        totalAmount={rest.totalAmount}
                        specificDeliveryConvertedAmount={rest.specificDeliveryConvertedAmount}
                        specificDeliveryFinancialized={rest.specificDeliveryFinancialized}
                        onSpecificDeliveryFinancialized={rest.onSpecificDeliveryFinancialized}
                        onSpecificDeliveryItemDeclaredDestroyed={rest.onSpecificDeliveryItemDeclaredDestroyed}
                        onSpecificDeliveryExpenseRecorded={rest.onSpecificDeliveryExpenseRecorded}
                        openPoliceAssistanceDetails={rest.openPoliceAssistanceDetails}
                        savePoliceAssistance={rest.savePoliceAssistance}
                        saveBreakInventoryLedger={rest.saveBreakInventoryLedger}
                        finalizeBreakInventoryRequest={rest.finalizeBreakInventoryRequest}
                        isMaritalFurnitureClaim={rest.isMaritalFurnitureClaim}
                        maritalFurnitureItems={rest.maritalFurnitureItems}
                        saveMaritalFurnitureDeliveryInventory={rest.saveMaritalFurnitureDeliveryInventory}
                        saveJudicialCustodianDetails={rest.saveJudicialCustodianDetails}
                        persistExecutionMerge={rest.persistExecutionMerge}
                        pushTimelineEvent={rest.pushTimelineEvent}
                        nextTimelineId={rest.nextTimelineId}
                        onOpenDecisionsModal={rest.onOpenDecisionsModal}
                        expandProcedureKey={rest.expandProcedureKey}
                        onExpandProcedureConsumed={rest.onExpandProcedureConsumed}
                    />
                ) : null}
            </div>
        </>
    );
}
