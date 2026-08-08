import React, { Suspense, useCallback, useMemo } from 'react';
import { AlertCircle, CheckCircle, ClipboardList } from '@/app/components/ui/lucideIcons';
import { EvictionProceduresSection } from './EvictionProceduresSection';
import { CoerciveSeizureToolsSection } from './CoerciveSeizureToolsSection';
import type { CoerciveSeizureToolsSectionProps } from './CoerciveSeizureToolsSection';
import type { EvictionProceduresSectionProps } from './EvictionProceduresSection';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import {
    getExecutionModuleStrategy,
    isEncroachmentRemovalClaim,
} from '@/app/utils/executionModuleStrategies';
import { EncroachmentRemovalRequestCards } from './EncroachmentRemovalRequestCards';
import { SpecificDeliveryNatureSetupCard } from './SpecificDeliveryNatureSetupCard';
import type { EncroachmentCaseExpenseRow } from '@/app/utils/encroachmentRemovalRequests';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile } from '@/app/types/execution';
import { EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';

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
    saveJudicialCustodianDetails?: (input: {
        decisionId: string;
        name: string;
        salary: string;
    }) => void;
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
    onOpenDecisionsModal?: EvictionProceduresSectionProps['onOpenDecisionsModal'];
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
    specificDeliveryItems?: import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[] | null;
    debtAmount?: number | null;
    totalAmount?: number | null;
    specificDeliveryConvertedAmount?: number | null;
    onSpecificDeliveryFinancialized?: (amount: number, itemId?: string) => void;
    onSpecificDeliveryItemDeclaredDestroyed?: (itemId: string) => void;
    onEncroachmentExpenseRecorded?: (row: EncroachmentCaseExpenseRow) => void;
    onSpecificDeliveryExpenseRecorded?: (
        row: import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow
    ) => void;
    executionCoerciveButtonDisabled: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleCoerciveAction: (type: string) => void;
    handleEndGracePeriod: () => void;
    appendEvictionExecutorRequest: EvictionProceduresSectionProps['appendEvictionExecutorRequest'];
    decisionsStorageExecutionId: string | undefined;
    showToast: EvictionProceduresSectionProps['showToast'];
    EVICTION_TIMELINE_ACTION_IDS: EvictionProceduresSectionProps['EVICTION_TIMELINE_ACTION_IDS'];
    activeDebtorIsEmployee: boolean;
    activeDebtorIsDeceased?: boolean;
    activeCoerciveActions: string[];
    followupSalarySeizureLabel: string;
    followupGarnishmentAmountPreview: string | number | null | undefined;
    hideFollowupCoerciveTab?: boolean;
    isHistoricalMode?: boolean;
    /** نوع المطالبة — يُستخدم كاحتياط لإظهار بطاقات إزالة التجاوز */
    claimType?: string | null;
    saveCoerciveAction?: CoerciveSeizureToolsSectionProps['saveCoerciveAction'];
    pushTimelineEvent?: CoerciveSeizureToolsSectionProps['pushTimelineEvent'];
    nextTimelineId?: () => string;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
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
    const encroachmentClaimActive = isEncroachmentRemovalClaim(claimType);
    const effectiveEvictionModule =
        isEvictionExecutionModule ||
        getExecutionModuleStrategy(claimType).useEvictionFieldProcedures;
    const evictionPanelLazyFallback = EXEC_OVERLAY_LAZY_FALLBACK ?? EXEC_SECTION_LAZY_FALLBACK;
    const seizureToolsReady =
        typeof saveCoerciveAction === 'function' &&
        typeof pushTimelineEvent === 'function' &&
        typeof nextTimelineId === 'function';

    const recordEvictionTimelineAction = useCallback(
        (input: {
            actionId: EvictionTimelineActionId;
            title: string;
            description: string;
        }) => {
            if (!pushTimelineEvent || !nextTimelineId) return;
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                type: 'eviction',
                date: now.slice(0, 10),
                timestamp: now,
                title: input.title,
                description: input.description,
                source: 'الإجراءات الميدانية — تخلية',
                metadata: { evictionActionId: input.actionId },
            });
        },
        [pushTimelineEvent, nextTimelineId],
    );
    const showEncroachmentCards =
        showEncroachmentRemovalRequestCards || encroachmentClaimActive;
    const encroachmentExecutionId = String(
        decisionsStorageExecutionId || executionData?.id || '',
    ).trim();

    const needsSpecificDeliveryNatureSetup =
        isSpecificDeliveryModule &&
        !showSpecificDeliveryFieldProcedures &&
        !specificDeliveryFinancialized;

    const showSpecificDeliveryProceduresBlock =
        showSpecificDeliveryFieldProcedures ||
        (isSpecificDeliveryModule && !specificDeliveryFinancialized);

    const showNonEvictionProcedureBlock = useMemo(() => {
        if (effectiveEvictionModule) return false;
        if (showEncroachmentCards && encroachmentExecutionId) return true;
        if (showSpecificDeliveryProceduresBlock || isMaritalFurnitureClaim) return true;
        return false;
    }, [
        effectiveEvictionModule,
        showEncroachmentCards,
        encroachmentExecutionId,
        showSpecificDeliveryProceduresBlock,
        isMaritalFurnitureClaim,
    ]);

    const showEmptyCoerciveHint = useMemo(() => {
        if (effectiveEvictionModule) return false;
        if (seizureToolsReady && !hideCoerciveSeizureSalaryAndProperty && !hideFollowupCoerciveTab) {
            return false;
        }
        if (showNonEvictionProcedureBlock) return false;
        if (
            !gracePeriodEnded &&
            !coerciveUiLocked &&
            !hideCoerciveGraceNoticeBanner
        ) {
            return false;
        }
        if (
            (executionStatus === 'GRACE_PERIOD' || executionStatus === 'READY_FOR_COERCIVE') &&
            !debtorAttendedVoluntarily &&
            !lawyerStartedPostNoticeExecution &&
            !coerciveUiLocked
        ) {
            return false;
        }
        if (coerciveUiLocked) return false;
        if (followupEmployeeFinancialSalaryOnlyCoercive && !hideCoerciveFinancialBanners) {
            return false;
        }
        if (
            isSpecificDeliveryModule &&
            !showSpecificDeliveryFieldProcedures &&
            !specificDeliveryFinancialized
        ) {
            return false;
        }
        return true;
    }, [
        effectiveEvictionModule,
        seizureToolsReady,
        hideCoerciveSeizureSalaryAndProperty,
        hideFollowupCoerciveTab,
        showNonEvictionProcedureBlock,
        gracePeriodEnded,
        coerciveUiLocked,
        hideCoerciveGraceNoticeBanner,
        executionStatus,
        debtorAttendedVoluntarily,
        lawyerStartedPostNoticeExecution,
        followupEmployeeFinancialSalaryOnlyCoercive,
        hideCoerciveFinancialBanners,
        isSpecificDeliveryModule,
        showSpecificDeliveryFieldProcedures,
        specificDeliveryFinancialized,
    ]);

    return (
    <>
        {coerciveUiLocked && effectiveEvictionModule && (
            <p className="text-amber-400 text-xs text-center font-semibold">موقوفة</p>
        )}
        {coerciveUiLocked && !effectiveEvictionModule && (
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

        {!gracePeriodEnded && !coerciveUiLocked && !effectiveEvictionModule && !hideCoerciveGraceNoticeBanner && (
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
            !effectiveEvictionModule &&
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

        {effectiveEvictionModule ? (
            <>
                <Suspense fallback={evictionPanelLazyFallback}>
                    <LazyEvictionFieldProceduresPanel
                        locked={evictionProcedureLocked}
                        lockHint={evictionProcedureLockHint}
                        timelineEvents={activeTimelineEvents}
                        premisesUse={evictionPremisesUseResolved}
                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                        executionData={executionData ?? null}
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
                        onRecordAction={recordEvictionTimelineAction}
                        tryOpenPendingBreakInventoryLedger={
                            tryOpenPendingBreakInventoryLedger
                        }
                        tryOpenPendingCustodianDetails={
                            tryOpenPendingCustodianDetails
                        }
                        saveJudicialCustodianDetails={saveJudicialCustodianDetails}
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
        ) : null}

        {!effectiveEvictionModule && followupEmployeeFinancialSalaryOnlyCoercive && !hideCoerciveFinancialBanners && (
            <div className="backdrop-blur-xl bg-emerald-950/30 border border-emerald-500/35 rounded-2xl p-3 text-right">
                <p className="text-emerald-200/95 text-[11px] leading-relaxed">
                    تنفيذ مالي ومدين موظف: طلب حجز راتب (١/٥) أو عقار أو مال منقول يُعرَض على منفذ العدل. مسار الحجز المالي هنا؛ الإجراءات الشخصية وطلب الكفيل و«تحركات الطرف الآخر» من محضر المتابعة عند الحاجة.
                </p>
            </div>
        )}

        {!effectiveEvictionModule && needsSpecificDeliveryNatureSetup ? (
            <SpecificDeliveryNatureSetupCard
                executionData={executionData}
                persistExecutionMerge={persistExecutionMerge}
                showToast={showToast}
            />
        ) : null}

        {!effectiveEvictionModule && (
            <div className="space-y-2.5">
                {showEncroachmentCards && encroachmentExecutionId ? (
                    <EncroachmentRemovalRequestCards
                        decisionsStorageExecutionId={encroachmentExecutionId}
                        inlineActionGateKey={inlineActionGateKey}
                        setInlineActionGateKey={setInlineActionGateKey}
                        showToast={showToast}
                        onExpenseRecorded={onEncroachmentExpenseRecorded}
                    />
                ) : null}
                {(showSpecificDeliveryProceduresBlock && showSpecificDeliveryFieldProcedures) ||
                isMaritalFurnitureClaim ? (
            <EvictionProceduresSection
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                inlineActionGateKey={inlineActionGateKey}
                gracePeriodEnded={gracePeriodEnded}
                setInlineActionGateKey={setInlineActionGateKey}
                handleEndGracePeriod={handleEndGracePeriod}
                appendEvictionProcedure={appendEvictionProcedure}
                appendEvictionExecutorRequest={appendEvictionExecutorRequest}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                executionData={executionData}
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
                persistExecutionMerge={persistExecutionMerge}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                onOpenDecisionsModal={onOpenDecisionsModal}
                expandProcedureKey={expandProcedureKey}
                onExpandProcedureConsumed={onExpandProcedureConsumed}
            />
            ) : null}
            </div>
        )}

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
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-[11px] leading-relaxed text-white/55">
                {seizureToolsReady
                    ? 'لا تتوفر عناصر إجرائية في هذا التبويب لهذه الإضبارة.'
                    : 'جاري تجهيز الإجراءات الجبرية — إن لم يظهر المحتوى خلال ثوانٍ أعد فتح التبويب.'}
            </p>
        ) : null}
    </>
    );
};
