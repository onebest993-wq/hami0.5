import React from 'react';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { Home } from '@/app/components/ui/icons/Home';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { FollowupProcedureCard } from '../FollowupProcedureCard';
import { SpecificDeliveryMovableValuationExpertCard } from '../SpecificDeliveryMovableValuationExpertCard';
import { SpecificDeliveryConversionRequestCard } from '../SpecificDeliveryConversionRequestCard';
import { evictionProcedureIcon } from './evictionProceduresUiHelpers';
import type { EvictionProceduresSectionState } from './useEvictionProceduresSectionState';

export function EvictionProceduresSectionBodyLateCards(state: EvictionProceduresSectionState) {
    const {
        executionCoerciveButtonDisabled,
        inlineActionGateKey,
        setInlineActionGateKey,
        appendEvictionExecutorRequest,
        decisionsStorageExecutionId,
        showToast,
        EVICTION_TIMELINE_ACTION_IDS,
        hideEncroachmentEvictionProcedureItems = false,
        showCustodianProcedure = false,
        specificDeliveryItemName = '',
        specificDeliveryItems = null,
        specificDeliveryFinancialized = false,
        onSpecificDeliveryFinancialized,
        onSpecificDeliveryItemDeclaredDestroyed,
        onSpecificDeliveryExpenseRecorded,
        expandedByKey,
        toggleExpanded,
        showMovableValuationExpertCard,
        showSpecificDeliveryConversionCard,
        hasPendingDeliveryItems,
        appendEvictionProcedureSafe,
        custodianRow,
        forcedEvictionRow,
        renderProcedurePanel,
        isRowWorkflowComplete,
        procedureCardInProgress,
        lifecycleForBranch,
        resubmitWarning,
    } = state;

    return (
        <>
            {showCustodianProcedure ? (
                <FollowupProcedureCard
                    label="تنصيب حارس قضائي"
                    subtitle="بعد طلب الكسر والجرد — يمكن إضافة أكثر من حارس بعد التعيين"
                    icon={evictionProcedureIcon(<UserCheck className="w-6 h-6 text-white/70" />)}
                    gateKey="eviction_custodian"
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    hasActiveRequest={procedureCardInProgress(custodianRow)}
                    expanded={Boolean(expandedByKey.custodian)}
                    onToggleExpanded={() => toggleExpanded('custodian')}
                    workflowComplete={isRowWorkflowComplete(custodianRow)}
                    lifecycleSummary={lifecycleForBranch('Judicial Custodian')}
                    disabled={executionCoerciveButtonDisabled}
                    resubmitWarningMessage={resubmitWarning}
                    onConfirmSend={({ resubmit } = {}) => {
                        appendEvictionProcedureSafe({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN as EvictionTimelineActionId,
                            title: '👤 طلب تنصيب حارس قضائي',
                            description: 'طلب عرض على منفذ العدل لتنصيب حارس قضائي على العين.',
                            supersedeCompletedHub: resubmit,
                        });
                    }}
                    panelBody={renderProcedurePanel('تنصيب حارس قضائي', custodianRow, 'Judicial Custodian')}
                />
            ) : null}

            {!hideEncroachmentEvictionProcedureItems ? (
                <FollowupProcedureCard
                    label="طلب الإخلاء الجبري"
                    icon={evictionProcedureIcon(<Home className="w-6 h-6 text-white/70" />)}
                    gateKey="eviction_forced_eviction"
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    hasActiveRequest={procedureCardInProgress(forcedEvictionRow)}
                    expanded={Boolean(expandedByKey.forced_eviction)}
                    onToggleExpanded={() => toggleExpanded('forced_eviction')}
                    workflowComplete={isRowWorkflowComplete(forcedEvictionRow)}
                    lifecycleSummary={lifecycleForBranch('Eviction')}
                    disabled={executionCoerciveButtonDisabled}
                    resubmitWarningMessage={resubmitWarning}
                    onConfirmSend={({ resubmit } = {}) => {
                        const ok = appendEvictionExecutorRequest({
                            executionId: decisionsStorageExecutionId,
                            title: 'طلب الإخلاء الجبري',
                            body: 'طلب إخلاء العقار موضوع الإضبارة جبرياً وتسليمه للدائن خاوياً من الشواغل.',
                            requestKind: 'eviction_procedure',
                            evictionWorkflowKey: 'inventory_or_eviction',
                            supersedeCompletedHub: resubmit,
                        });
                        if (!ok) {
                            showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                            return;
                        }
                        showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا.', 'success');
                    }}
                    panelBody={renderProcedurePanel(
                        'طلب الإخلاء الجبري',
                        forcedEvictionRow,
                        'Eviction',
                    )}
                />
            ) : null}

            {showSpecificDeliveryConversionCard && decisionsStorageExecutionId ? (
                <SpecificDeliveryConversionRequestCard
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    specificDeliveryItemName={specificDeliveryItemName}
                    specificDeliveryItems={specificDeliveryItems}
                    specificDeliveryFinancialized={specificDeliveryFinancialized}
                    onConversionItemDeclared={onSpecificDeliveryItemDeclaredDestroyed}
                />
            ) : null}

            {showMovableValuationExpertCard && decisionsStorageExecutionId ? (
                <SpecificDeliveryMovableValuationExpertCard
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    specificDeliveryItemName={specificDeliveryItemName}
                    specificDeliveryItems={specificDeliveryItems}
                    hasPendingDeliveryItems={hasPendingDeliveryItems}
                    onExpenseRecorded={onSpecificDeliveryExpenseRecorded}
                    onValuationFinancialized={onSpecificDeliveryFinancialized}
                />
            ) : null}
        </>
    );
}
