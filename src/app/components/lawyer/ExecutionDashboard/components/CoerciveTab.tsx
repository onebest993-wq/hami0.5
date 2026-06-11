import React, { Suspense } from 'react';
import { AlertCircle, CheckCircle, ClipboardList } from 'lucide-react';
import { EvictionProceduresSection } from './EvictionProceduresSection';
import { CoerciveToolsGrid } from './CoerciveToolsGrid';
import type { CoerciveToolsGridProps } from './CoerciveToolsGrid';
import type { EvictionProceduresSectionProps } from './EvictionProceduresSection';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { EncroachmentRemovalRequestCards } from './EncroachmentRemovalRequestCards';
import type { EncroachmentCaseExpenseRow } from '@/app/utils/encroachmentRemovalRequests';

export interface CoerciveTabProps {
    coerciveUiLocked: boolean;
    isEvictionExecutionModule: boolean;
    executionData: Record<string, any> | null | undefined;
    gracePeriodEnded: boolean;
    daysRemainingInGracePeriod: number;
    executionStatus: string;
    debtorAttendedVoluntarily: boolean;
    lawyerStartedPostNoticeExecution: boolean;
    registerDebtorVoluntaryAttendance: () => void;
    openExecutionSeizuresTab: () => void;
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyEvictionFieldProceduresPanel: React.LazyExoticComponent<React.ComponentType<any>>;
    evictionProcedureLocked: boolean;
    evictionProcedureLockHint: string;
    activeTimelineEvents: any[];
    evictionPremisesUseResolved: string;
    showResidentialEvictionGraceControl: boolean;
    residentialGracePeriodSaved?: boolean;
    openEvictionResidentialGraceModal: (opts?: { edit?: boolean }) => void;
    showResidentialGraceEarlyEndRequest: boolean;
    showBreakInventoryRequest?: boolean;
    /** الخروج الميداني والقوة الجبرية — بعد انتهاء/إنهاء المهلة السكنية */
    showEvictionFieldworkRequests?: boolean;
    evictionHeirsNotificationDateYmd: string;
    handleEvictionHeirsNotificationDateChange: (ymd: string) => void;
    handleIssueHeirsExecutionNoticeMemo: () => void;
    appendEvictionProcedure: (procedure: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
    }) => void;
    tryOpenPendingBreakInventoryLedger: () => boolean;
    tryOpenPendingCustodianDetails: () => boolean;
    openPoliceAssistanceDetails?: (input: { decisionId: string; requestTitle: string }) => void;
    savePoliceAssistance?: (input: {
        decisionId: string;
        agencyName: string;
        linkToTasks: boolean;
    }) => void;
    saveBreakInventoryLedger?: EvictionProceduresSectionProps['saveBreakInventoryLedger'];
    finalizeBreakInventoryRequest?: EvictionProceduresSectionProps['finalizeBreakInventoryRequest'];
    isMaritalFurnitureClaim?: boolean;
    maritalFurnitureItems?: EvictionProceduresSectionProps['maritalFurnitureItems'];
    saveMaritalFurnitureDeliveryInventory?: EvictionProceduresSectionProps['saveMaritalFurnitureDeliveryInventory'];
    expandProcedureKey?: EvictionProceduresSectionProps['expandProcedureKey'];
    onExpandProcedureConsumed?: EvictionProceduresSectionProps['onExpandProcedureConsumed'];
    followupEmployeeFinancialSalaryOnlyCoercive: boolean;
    followupMonetaryCoerciveLimitedOnly: boolean;
    hideCoerciveGraceNoticeBanner?: boolean;
    hideCoerciveFinancialBanners?: boolean;
    hideCoerciveSeizureSalaryAndProperty?: boolean;
    hideEncroachmentEvictionProcedureItems?: boolean;
    showEncroachmentRemovalRequestCards?: boolean;
    showSpecificDeliverySurveyorCard?: boolean;
    showSpecificDeliveryConversionCard?: boolean;
    showSpecificDeliveryBreakInventoryCard?: boolean;
    showSpecificDeliveryFieldProcedures?: boolean;
    showGenericFieldProcedureCards?: boolean;
    isSpecificDeliveryModule?: boolean;
    hideEvictionCustodianProcedure?: boolean;
    specificDeliveryFinancialized?: boolean;
    specificDeliveryItemName?: string;
    specificDeliveryItemNature?: string | null;
    debtAmount?: number | null;
    totalAmount?: number | null;
    specificDeliveryConvertedAmount?: number | null;
    onSpecificDeliveryFinancialized?: (amount: number) => void;
    onEncroachmentExpenseRecorded?: (row: EncroachmentCaseExpenseRow) => void;
    onSpecificDeliveryExpenseRecorded?: (
        row: import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow
    ) => void;
    executionCoerciveButtonDisabled: boolean;
    inlineActionGateKey: CoerciveToolsGridProps['inlineActionGateKey'];
    setInlineActionGateKey: CoerciveToolsGridProps['setInlineActionGateKey'];
    handleCoerciveAction: (type: string) => void;
    handleEndGracePeriod: () => void;
    appendEvictionExecutorRequest: EvictionProceduresSectionProps['appendEvictionExecutorRequest'];
    decisionsStorageExecutionId: string | undefined;
    showToast: EvictionProceduresSectionProps['showToast'];
    EVICTION_TIMELINE_ACTION_IDS: EvictionProceduresSectionProps['EVICTION_TIMELINE_ACTION_IDS'];
    activeDebtorIsEmployee: boolean;
    activeCoerciveActions: CoerciveToolsGridProps['activeCoerciveActions'];
    followupSalarySeizureLabel: CoerciveToolsGridProps['followupSalarySeizureLabel'];
    followupGarnishmentAmountPreview: CoerciveToolsGridProps['followupGarnishmentAmountPreview'];
    hideFollowupCoerciveTab?: boolean;
}

export const CoerciveTab: React.FC<CoerciveTabProps> = ({
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
    EXEC_OVERLAY_LAZY_FALLBACK,
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
    openPoliceAssistanceDetails,
    savePoliceAssistance,
    saveBreakInventoryLedger,
    finalizeBreakInventoryRequest,
    isMaritalFurnitureClaim = false,
    maritalFurnitureItems = [],
    saveMaritalFurnitureDeliveryInventory,
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
    debtAmount = 0,
    totalAmount = 0,
    specificDeliveryConvertedAmount = 0,
    onSpecificDeliveryFinancialized,
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
    activeCoerciveActions,
    followupSalarySeizureLabel,
    followupGarnishmentAmountPreview,
    hideFollowupCoerciveTab = false,
}) => (
    <>
        {coerciveUiLocked && isEvictionExecutionModule && (
            <p className="text-amber-400 text-xs text-center font-semibold">موقوفة</p>
        )}
        {coerciveUiLocked && !isEvictionExecutionModule && (
            <div className="backdrop-blur-xl bg-amber-900/40 border border-amber-500/40 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>
                    </svg>
                    <div className="flex-1 text-right">
                        <p className="text-amber-300 font-semibold text-sm">
                            الإضبارة موقوفة — الإجراءات الجبرية متوقفة بسبب الإيقاف أو الاستئخار.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {!gracePeriodEnded && !coerciveUiLocked && !isEvictionExecutionModule && !hideCoerciveGraceNoticeBanner && (
            <div className="backdrop-blur-xl bg-slate-800/40 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-right">
                        <p className="text-amber-300 font-semibold text-sm mb-1.5">
                            تنبيه مهلة الإخبار
                        </p>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            يمكنك تسجيل الإجراءات من الواجهة؛ راجع وقائع الإضبارة والمهل القانونية. {(daysRemainingInGracePeriod ?? 0) > 0 ? `(باقي نحو ${daysRemainingInGracePeriod} يوماً تقويمياً على مهلة الإخبار إن وُجدت)` : ''}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {(executionStatus === 'GRACE_PERIOD' || executionStatus === 'READY_FOR_COERCIVE') &&
            !isEvictionExecutionModule &&
            !debtorAttendedVoluntarily &&
            !lawyerStartedPostNoticeExecution &&
            !coerciveUiLocked && (
                <div className="flex flex-col sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            registerDebtorVoluntaryAttendance();
                        }}
                        className="flex-1 min-h-[40px] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={16} />
                        تسجيل حضور المدين
                    </button>
                    {executionStatus === 'READY_FOR_COERCIVE' && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openExecutionSeizuresTab();
                            }}
                            className="flex-1 min-h-[40px] backdrop-blur-xl border border-rose-500/40 bg-rose-950/30 text-rose-100 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
                        >
                            <ClipboardList size={16} />
                            محضر المتابعة
                        </button>
                    )}
                </div>
            )}

        {isEvictionExecutionModule && (
            <>
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyEvictionFieldProceduresPanel
                        locked={evictionProcedureLocked}
                        lockHint={evictionProcedureLockHint}
                        timelineEvents={activeTimelineEvents}
                        premisesUse={evictionPremisesUseResolved}
                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                        showResidentialEvictionGraceButton={
                            showResidentialEvictionGraceControl
                        }
                        residentialGracePeriodSaved={residentialGracePeriodSaved}
                        onResidentialEvictionGraceClick={openEvictionResidentialGraceModal}
                        showResidentialGraceEarlyEndRequest={showResidentialGraceEarlyEndRequest}
                        showBreakInventoryRequest={showBreakInventoryRequest}
                        showEvictionFieldworkRequests={showEvictionFieldworkRequests}
                        showDebtorHeirsEvictionTools={false}
                        heirsNotificationDateYmd={evictionHeirsNotificationDateYmd}
                        onHeirsNotificationDateYmdChange={
                            handleEvictionHeirsNotificationDateChange
                        }
                        onIssueHeirsExecutionNoticeMemo={
                            handleIssueHeirsExecutionNoticeMemo
                        }
                        onRecordAction={appendEvictionProcedure}
                        tryOpenPendingBreakInventoryLedger={
                            tryOpenPendingBreakInventoryLedger
                        }
                        tryOpenPendingCustodianDetails={
                            tryOpenPendingCustodianDetails
                        }
                        openPoliceAssistanceDetails={openPoliceAssistanceDetails}
                        savePoliceAssistance={savePoliceAssistance}
                        saveBreakInventoryLedger={saveBreakInventoryLedger}
                        finalizeBreakInventoryRequest={finalizeBreakInventoryRequest}
                        isMaritalFurnitureClaim={isMaritalFurnitureClaim}
                        maritalFurnitureItems={maritalFurnitureItems}
                        saveMaritalFurnitureDeliveryInventory={saveMaritalFurnitureDeliveryInventory}
                    />
                </Suspense>
            </>
        )}

        {!isEvictionExecutionModule && followupEmployeeFinancialSalaryOnlyCoercive && !hideCoerciveFinancialBanners && (
            <div className="backdrop-blur-xl bg-emerald-950/30 border border-emerald-500/35 rounded-2xl p-3 text-right">
                <p className="text-emerald-200/95 text-[11px] leading-relaxed">
                    تنفيذ مالي ومدين موظف: طلب حجز راتب (١/٥) أو عقار أو مال منقول يُعرَض على منفذ العدل. مسار الحجز المالي هنا؛ الإجراءات الشخصية وطلب الكفيل و«تحركات الطرف الآخر» من محضر المتابعة عند الحاجة.
                </p>
            </div>
        )}

        {!isEvictionExecutionModule && followupMonetaryCoerciveLimitedOnly && !hideCoerciveFinancialBanners && (
            <div className="backdrop-blur-xl bg-sky-950/30 border border-sky-500/35 rounded-2xl p-3 text-right">
                <p className="text-sky-200/95 text-[11px] leading-relaxed">
                    تنفيذ مالي: طلبات حجز الراتب أو العقار أو المال المنقول تُعرَض على منفذ العدل. الإحضار الجبري والمفاتحة وطلب الكفيل من تبويب «التنفيذ الجبري الشخصي» في محضر المتابعة.
                </p>
            </div>
        )}

        {!isEvictionExecutionModule &&
            isSpecificDeliveryModule &&
            !showSpecificDeliveryFieldProcedures &&
            !specificDeliveryFinancialized && (
                <div
                    className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-3 text-right"
                    dir="rtl"
                >
                    <p className="text-[11px] font-bold text-amber-200">
                        حدّد طبيعة الشيء (منقول / غير منقول) من معلومات الإضبارة قبل الإجراءات
                        الميدانية.
                    </p>
                </div>
            )}

        {!isEvictionExecutionModule && (
            <div className="space-y-2.5">
                {showEncroachmentRemovalRequestCards && decisionsStorageExecutionId && (
                    <EncroachmentRemovalRequestCards
                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                        inlineActionGateKey={inlineActionGateKey}
                        setInlineActionGateKey={setInlineActionGateKey}
                        showToast={showToast}
                        onExpenseRecorded={onEncroachmentExpenseRecorded}
                    />
                )}
            {(showSpecificDeliveryFieldProcedures || isMaritalFurnitureClaim) ? (
            <EvictionProceduresSection
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                inlineActionGateKey={inlineActionGateKey}
                gracePeriodEnded={gracePeriodEnded}
                setInlineActionGateKey={setInlineActionGateKey}
                handleEndGracePeriod={handleEndGracePeriod}
                appendEvictionProcedure={appendEvictionProcedure}
                appendEvictionExecutorRequest={appendEvictionExecutorRequest}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                showToast={showToast}
                EVICTION_TIMELINE_ACTION_IDS={EVICTION_TIMELINE_ACTION_IDS}
                hideEncroachmentEvictionProcedureItems={hideEncroachmentEvictionProcedureItems}
                hideEvictionCustodianProcedure={hideEvictionCustodianProcedure}
                showGenericFieldProcedureCards={showGenericFieldProcedureCards}
                showSpecificDeliveryBreakInventoryCard={showSpecificDeliveryBreakInventoryCard}
                showSpecificDeliverySurveyorCard={showSpecificDeliverySurveyorCard}
                showSpecificDeliveryConversionCard={showSpecificDeliveryConversionCard}
                specificDeliveryItemName={specificDeliveryItemName}
                specificDeliveryItemNature={specificDeliveryItemNature}
                debtAmount={debtAmount}
                totalAmount={totalAmount}
                specificDeliveryConvertedAmount={specificDeliveryConvertedAmount}
                specificDeliveryFinancialized={specificDeliveryFinancialized}
                onSpecificDeliveryFinancialized={onSpecificDeliveryFinancialized}
                onSpecificDeliveryExpenseRecorded={onSpecificDeliveryExpenseRecorded}
                openPoliceAssistanceDetails={openPoliceAssistanceDetails}
                savePoliceAssistance={savePoliceAssistance}
                saveBreakInventoryLedger={saveBreakInventoryLedger}
                finalizeBreakInventoryRequest={finalizeBreakInventoryRequest}
                isMaritalFurnitureClaim={isMaritalFurnitureClaim}
                maritalFurnitureItems={maritalFurnitureItems}
                saveMaritalFurnitureDeliveryInventory={saveMaritalFurnitureDeliveryInventory}
                expandProcedureKey={expandProcedureKey}
                onExpandProcedureConsumed={onExpandProcedureConsumed}
            />
            ) : null}
            </div>
        )}

        <CoerciveToolsGrid
            isEvictionExecutionModule={isEvictionExecutionModule}
            activeDebtorIsEmployee={activeDebtorIsEmployee}
            executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
            activeCoerciveActions={activeCoerciveActions}
            inlineActionGateKey={inlineActionGateKey}
            followupSalarySeizureLabel={followupSalarySeizureLabel}
            followupGarnishmentAmountPreview={followupGarnishmentAmountPreview}
            followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
            followupMonetaryCoerciveLimitedOnly={followupMonetaryCoerciveLimitedOnly}
            hideCoerciveSeizureSalaryAndProperty={
                hideCoerciveSeizureSalaryAndProperty || hideFollowupCoerciveTab
            }
            setInlineActionGateKey={setInlineActionGateKey}
            handleCoerciveAction={handleCoerciveAction}
        />
    </>
);
