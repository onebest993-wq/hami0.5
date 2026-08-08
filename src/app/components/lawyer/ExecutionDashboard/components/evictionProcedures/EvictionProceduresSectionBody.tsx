import React from 'react';
import { Calendar, Shield, Gavel, UserCheck, Home } from '@/app/components/ui/lucideIcons';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { FollowupProcedureCard } from '../FollowupProcedureCard';
import { SpecificDeliveryPropertyExpertRequestCard } from '../SpecificDeliveryPropertyExpertRequestCard';
import { SpecificDeliveryMovableValuationExpertCard } from '../SpecificDeliveryMovableValuationExpertCard';
import { SpecificDeliveryConversionRequestCard } from '../SpecificDeliveryConversionRequestCard';
import { evictionProcedureIcon } from './evictionProceduresUiHelpers';
import type { EvictionProceduresSectionState } from './useEvictionProceduresSectionState';

export function EvictionProceduresSectionBody(state: EvictionProceduresSectionState) {
    const {
        executionCoerciveButtonDisabled,
        inlineActionGateKey,
        gracePeriodEnded,
        setInlineActionGateKey,
        handleEndGracePeriod,
        appendEvictionExecutorRequest,
        decisionsStorageExecutionId,
        showToast,
        EVICTION_TIMELINE_ACTION_IDS,
        hideEncroachmentEvictionProcedureItems = false,
        showCustodianProcedure = false,
        showGenericFieldProcedureCards = false,
        specificDeliveryItemName = '',
        specificDeliveryItems = null,
        specificDeliveryFinancialized = false,
        onSpecificDeliveryFinancialized,
        onSpecificDeliveryItemDeclaredDestroyed,
        onSpecificDeliveryExpenseRecorded,
        isMaritalFurnitureClaim = false,
        expandedByKey,
        toggleExpanded,
        showPropertyExpertCard,
        showMovableValuationExpertCard,
        showSpecificDeliveryConversionCard,
        hasPendingDeliveryItems,
        appendEvictionProcedureSafe,
        fieldVisitRow,
        policeRow,
        breakInventoryRow,
        custodianRow,
        forcedEvictionRow,
        renderProcedurePanel,
        showBreakInventory,
        isRowWorkflowComplete,
        procedureCardInProgress,
        lifecycleForBranch,
        resubmitWarning,
    } = state;

    return (
        <div className="space-y-2.5">
            <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-stretch">
                {!gracePeriodEnded && !hideEncroachmentEvictionProcedureItems && (
                    <button
                        type="button"
                        disabled={executionCoerciveButtonDisabled}
                        onClick={() => handleEndGracePeriod()}
                        title="مهلة"
                        aria-label="مهلة"
                        className={`w-full sm:w-[108px] sm:shrink-0 text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 ${
                            executionCoerciveButtonDisabled
                                ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                                : ''
                        }`}
                    >
                        <div className="flex flex-row-reverse items-center justify-center gap-2 sm:flex-col sm:gap-1">
                            <Calendar className="shrink-0 text-sky-300" size={20} />
                            <p className="text-sky-100 font-bold text-sm text-center leading-tight">مهلة</p>
                        </div>
                    </button>
                )}
                <div className="relative flex-1 min-w-0">
                    {!isMaritalFurnitureClaim && showGenericFieldProcedureCards ? (
                        <FollowupProcedureCard
                            label="طلب تحديد موعد الخروج الميداني"
                            icon={evictionProcedureIcon(<Calendar className="w-6 h-6 text-white/70" />)}
                            gateKey="eviction_field_visit"
                            inlineActionGateKey={inlineActionGateKey}
                            setInlineActionGateKey={setInlineActionGateKey}
                            hasActiveRequest={procedureCardInProgress(fieldVisitRow)}
                            expanded={Boolean(expandedByKey.field_visit)}
                            onToggleExpanded={() => toggleExpanded('field_visit')}
                            workflowComplete={isRowWorkflowComplete(fieldVisitRow)}
                            lifecycleSummary={lifecycleForBranch('Field Visit Date')}
                            disabled={executionCoerciveButtonDisabled}
                            resubmitWarningMessage={resubmitWarning}
                            onConfirmSend={({ resubmit } = {}) => {
                                appendEvictionProcedureSafe({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT as EvictionTimelineActionId,
                                    title: '📍 طلب تحديد موعد الخروج الميداني',
                                    description: 'طلب تحديد موعد الخروج الميداني مع منفذ العدل (باشر).',
                                    supersedeCompletedHub: resubmit,
                                });
                            }}
                            panelBody={renderProcedurePanel(
                                'طلب تحديد موعد الخروج الميداني',
                                fieldVisitRow,
                                'Field Visit Date',
                            )}
                        />
                    ) : null}
                </div>
            </div>

            {showGenericFieldProcedureCards ? (
                <FollowupProcedureCard
                    label="مفاتحة الشرطة للقوة الإجرائية"
                    icon={evictionProcedureIcon(<Shield className="w-6 h-6 text-white/70" />)}
                    gateKey="eviction_police_force"
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    hasActiveRequest={procedureCardInProgress(policeRow)}
                    expanded={Boolean(expandedByKey.police)}
                    onToggleExpanded={() => toggleExpanded('police')}
                    workflowComplete={isRowWorkflowComplete(policeRow)}
                    lifecycleSummary={lifecycleForBranch('Police Assistance Request')}
                    disabled={executionCoerciveButtonDisabled}
                    resubmitWarningMessage={resubmitWarning}
                    onConfirmSend={({ resubmit } = {}) =>
                        appendEvictionProcedureSafe({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE as EvictionTimelineActionId,
                            title: '🛡️ مفاتحة الشرطة للقوة الإجرائية',
                            description:
                                'تمت مفاتحة الجهة الأمنية لطلب القوة الإجرائية المساندة للتنفيذ الميداني.',
                            supersedeCompletedHub: resubmit,
                        })
                    }
                    panelBody={renderProcedurePanel(
                        'مفاتحة الشرطة للقوة الإجرائية',
                        policeRow,
                        'Police Assistance Request',
                    )}
                />
            ) : null}

            {showPropertyExpertCard && decisionsStorageExecutionId ? (
                <SpecificDeliveryPropertyExpertRequestCard
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    specificDeliveryItemName={specificDeliveryItemName}
                    onExpenseRecorded={onSpecificDeliveryExpenseRecorded}
                />
            ) : null}

            {showBreakInventory && !isMaritalFurnitureClaim ? (
                <FollowupProcedureCard
                    label="طلب كسر الأقفال وجرد الأثاث"
                    icon={evictionProcedureIcon(<Gavel className="w-6 h-6 text-white/70" />)}
                    gateKey="eviction_break_inventory"
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    hasActiveRequest={procedureCardInProgress(breakInventoryRow)}
                    expanded={Boolean(expandedByKey.break_inventory)}
                    onToggleExpanded={() => toggleExpanded('break_inventory')}
                    workflowComplete={isRowWorkflowComplete(breakInventoryRow)}
                    lifecycleSummary={lifecycleForBranch('Lock Breaking & Inventory')}
                    disabled={executionCoerciveButtonDisabled}
                    resubmitWarningMessage={resubmitWarning}
                    onConfirmSend={({ resubmit } = {}) => {
                        appendEvictionProcedureSafe({
                            actionId: EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY as EvictionTimelineActionId,
                            title: '🔨 طلب كسر الأقفال وجرد الأثاث',
                            description:
                                'طلب عرض على منفذ العدل بشأن كسر الأقفال وجرد محتويات المنقولات في العين المؤجرة.',
                            supersedeCompletedHub: resubmit,
                        });
                    }}
                    panelBody={renderProcedurePanel(
                        'طلب كسر الأقفال وجرد الأثاث',
                        breakInventoryRow,
                        'Lock Breaking & Inventory',
                    )}
                />
            ) : null}

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
        </div>
    );
}
