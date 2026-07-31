import React, { Suspense } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Clock } from 'lucide-react';
import type {
    ExecutionFile,
    SeizedAsset,
    SeizedMovable,
    SeizedProperty,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import SecureStoreService from '@/app/services/SecureStoreService';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import { getLocalTodayYmd } from '../executionDashboardDate';
import {
    EXEC_FOC_LAZY_FALLBACK,
    EXEC_OVERLAY_LAZY_FALLBACK,
} from '../executionDashboardLazyShellUi';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { SeizureRequestSubjectModalProps } from './SeizureRequestSubjectModal.types';
import type { VisitationCalendarModalProps } from './VisitationCalendarModal';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import {
    LazyExecutionFinancialHubPortal,
    LazyFinancialOperationsCenter,
    LazyJudicialCustodianCardMenu,
    LazySeizureRequestSubjectModal,
    LazyUnifiedSeizureLogHost,
    LazyVisitationScheduleModule,
} from '../executionDashboardLazyRegistry';
import type {
    SeizureLogTab,
    UnifiedSeizureLogEntry,
} from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import type {
    ExecutionDashboardPhoneBodyDeferredScope,
    GraceTaskCard,
} from './ExecutionDashboardPhoneBodyDeferredScope';

export type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';

const LazyGuarantorExternalHub = React.lazy(() =>
    import('./GuarantorExternalHub').then((m) => ({
        default: m.GuarantorExternalHub,
    })),
);

type ExecutionDashboardPhoneBodyDeferredPanelsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    quaternaryStageReady: boolean;
    tertiaryStageReady: boolean;
    safeActiveGraceTasks: GraceTaskCard[];
    safeShouldShowGuarantorExternalHub: (value: unknown) => boolean;
    directOpenUnifiedSummonsHub: (options?: {
        debtorKey?: string | null;
        initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    }) => void;
    removeJudicialCustodianEntry: (id: string) => void;
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    openGuarantorFollowupDetails: () => void;
    closeFinancialHubPortal: () => void;
    toggleFinancialCenterExpanded: () => void;
    directOpenPaymentCalculator: () => void;
    directOpenSettlementCalculator: () => void;
    directOpenLedgerModal: () => void;
    directOpenEvictionExpenseModal: () => void;
};

export function ExecutionDashboardPhoneBodyDeferredPanels({
    scope,
    quaternaryStageReady,
    tertiaryStageReady,
    safeActiveGraceTasks,
    safeShouldShowGuarantorExternalHub,
    directOpenUnifiedSummonsHub,
    removeJudicialCustodianEntry,
    propertyInlineSaveCtx,
    openGuarantorFollowupDetails,
    closeFinancialHubPortal,
    toggleFinancialCenterExpanded,
    directOpenPaymentCalculator,
    directOpenSettlementCalculator,
    directOpenLedgerModal,
    directOpenEvictionExpenseModal,
}: ExecutionDashboardPhoneBodyDeferredPanelsProps) {
    const {
        activeDebtorIsDeceased,
        activeFinancialTab,
        accumulatedAlimony,
        appealPerspective,
        appendGuarantorFollowupRequest,
        archiveAndClearGuarantor,
        assignmentWorkspaceCtx,
        beginThirdPartyReceiveStep,
        calculatedExecutionFee,
        cancelThirdPartyReceiveStep,
        confirmThirdPartyReceive,
        claimType,
        clearActiveSalarySeizurePath,
        closeUnifiedSeizureLog,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        executionStatus,
        evictionAssetsTabUnlocked,
        evictionCaseExpenses,
        evictionCaseExpensesTotalForFinancial,
        evictionGraceHidden,
        evictionGracePinned,
        evictionLawyerFeesInTotals,
        financialHubAutoOpenMode,
        financialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        financialLedger,
        financialLawyerFeesAmount,
        financialPrincipalAmount,
        financialStatus,
        focusSeizureMovableInlineCompletion,
        focusSeizurePropertyInlineCompletion,
        followupSalarySeizureLabel,
        followupSpecialization,
        getLocalTodayYmd: _scopeGetLocalTodayYmd,
        guarantorFollowupAwaitingDetailsSave,
        handleCoerciveAction,
        handleEvictionLawyerFeeRequest,
        handleEvictionLedgerActivated,
        handleFundsLedgerPayment,
        handleGuarantorRequestFromFollowup,
        isAlimonyClaim,
        isEvictionExecutionModule,
        isFinancialCenterExpanded,
        isNonFinancialClaim,
        isPaused,
        isRepresentingDebtor,
        isVisitationClaim,
        judicialCustodiansResolved,
        lawyerFeePayoutApproved,
        monthlyAlimony,
        movableSeizureRegistryAssets,
        movableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        nextTimelineId,
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDirectorateFees,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        patchSalarySeizureAssetDetails,
        persistExecutionMerge,
        pushSeizureAuctionCalendarAppointment,
        pushTimelineEvent,
        realEstateSeizureRegistryAssets,
        releaseSeizureAssetRow,
        remaining,
        salarySeizureRegistryAssets,
        salarySeizureTabRows,
        seizureLogExecutorDecisions,
        seizureMatrixLedgerParamsRef,
        setActiveFinancialTab,
        setCaseTasksPending,
        setEvictionGraceHidden,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setIsFinancialCenterExpanded,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        setShowExecutionFinancialHub,
        setShowVisitationCalendarModal,
        setThirdPartyFundsDraftById,
        setThirdPartySeizuresUi,
        setTimelineEvents,
        setUnifiedLedgerRevision,
        setUnifiedSeizureLogTab,
        showExecutionFinancialHub,
        showToast,
        showUnifiedSeizureLogModal,
        showVisitationCalendarModal,
        standaloneExecutionMarks,
        statusMetadata,
        submitMovableSeizureRequest,
        submitPropertySeizureRequest,
        thirdPartyFundsDraftById,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        timelineDebtorMetadata,
        todayYmd,
        totalOwed,
        totalWithExecutionFee,
        total_execution_expenses,
        unifiedSeizureLogEntries,
        unifiedSeizureLogTab,
        unifiedSeizureTabCounts,
        updateThirdPartyReceiveDraft,
        viewExecutionData,
        visitChildNames,
        propertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        graceHiddenKey,
        shouldCalculateExecutionFee,
        daysSinceNoticeCalculated,
        gracePeriodEnded,
        initiator,
    } = scope;

    const followupSpec = followupSpecialization ?? {};

    return (
        <>
            {quaternaryStageReady &&
            safeShouldShowGuarantorExternalHub(viewExecutionData) &&
            !Boolean(followupSpec.hideAllGuarantorPresence) ? (
                <div className="mx-3 mt-3.5">
                    <Suspense fallback={null}>
                        <LazyGuarantorExternalHub
                            executionData={viewExecutionData}
                            openGuarantorDetailsModal={openGuarantorFollowupDetails}
                            archiveAndClearGuarantor={archiveAndClearGuarantor}
                            handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
                            onOpenUnifiedSummonsHub={directOpenUnifiedSummonsHub}
                        />
                    </Suspense>
                </div>
            ) : null}

            {quaternaryStageReady && isVisitationClaim ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyVisitationScheduleModule
                        executionData={viewExecutionData}
                        visitChildNames={visitChildNames}
                        fileNumber={String(executionData?.fileNumber ?? '')}
                        todayYmd={todayYmd}
                        persistExecutionMerge={persistExecutionMerge}
                        pushTimelineEvent={pushTimelineEvent}
                        nextTimelineId={nextTimelineId}
                        showToast={showToast}
                    />
                </Suspense>
            ) : null}

            {quaternaryStageReady && (judicialCustodiansResolved?.length ?? 0) > 0 ? (
                <div className="mx-3 mt-1.5 space-y-1">
                    <p className="text-[9px] font-bold text-amber-500/90 text-right px-0.5">
                        {judicialCustodiansResolved.length === 1 ? 'الحارس القضائي' : 'الحرس القضائيون'}
                    </p>
                    {judicialCustodiansResolved.map((c) => (
                        <div
                            key={c.id}
                            dir="rtl"
                            className="flex w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-gradient-to-l from-[#0c1426]/98 to-[#080d18]/98 py-1.5 ps-1.5 pe-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                        >
                            <div className="min-w-0 flex-1 text-right">
                                <div className="flex flex-row-reverse flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0">
                                    <span className="inline text-[12px] font-bold leading-tight text-white [overflow-wrap:anywhere]">
                                        {c.fullName}
                                    </span>
                                    <span className="inline shrink-0 rounded bg-amber-500/12 px-1 py-px text-[8px] font-bold tracking-wide text-amber-400/95">
                                        حارس
                                    </span>
                                </div>
                                <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                                    <span className="text-slate-500/85">راتب</span>{' '}
                                    <span className="font-mono tabular-nums text-slate-300/95">{c.salary}</span>
                                </p>
                            </div>
                            <div className="shrink-0 self-center">
                                <Suspense fallback={null}>
                                    <LazyJudicialCustodianCardMenu
                                        onEdit={() => {
                                            setJudicialCustodianModalCtx({
                                                requestTitle:
                                                    judicialCustodiansResolved.length === 1
                                                        ? 'تعديل بيانات الحارس القاضي'
                                                        : 'تعديل بيانات أحد الحرس القضائين',
                                                initialName: c.fullName,
                                                initialSalary: c.salary,
                                                onSaved: (payload: { name: string; salary: string }) => {
                                                    const next = judicialCustodiansResolved.map((row) =>
                                                        String(row.id) === String(c.id)
                                                            ? {
                                                                  ...row,
                                                                  fullName: payload.name,
                                                                  salary: payload.salary,
                                                              }
                                                            : row,
                                                    );
                                                    persistExecutionMerge({
                                                        eviction_judicial_custodians: next,
                                                        eviction_judicial_custodian: null,
                                                    });
                                                    showToast('تم تحديث بيانات الحارس', 'success');
                                                },
                                            });
                                            setJudicialCustodianModalOpen(true);
                                        }}
                                        onDelete={() => removeJudicialCustodianEntry(c.id)}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {quaternaryStageReady && safeActiveGraceTasks.length > 0 && evictionGracePinned && !evictionGraceHidden ? (
                <div className="mx-3 mt-2 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.10] via-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
                    <div className="flex flex-row-reverse items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1 text-right">
                            <p className="text-[12px] font-black text-white">المهلة</p>
                        </div>
                        <div className="flex flex-row-reverse items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEvictionGraceHidden(true);
                                    if (graceHiddenKey) {
                                        try {
                                            SecureStoreService.setItemSync(graceHiddenKey, '1');
                                        } catch {
                                            /* ignore */
                                        }
                                    }
                                }}
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:bg-white/[0.06]"
                            >
                                إخفاء
                            </button>
                            <span className="shrink-0 inline-flex items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/[0.10] px-2.5 py-1 text-[10px] font-bold tabular-nums text-amber-200">
                                {Math.min(1, safeActiveGraceTasks.length)}
                            </span>
                        </div>
                    </div>
                    <div className="px-3 pb-3" dir="rtl">
                        {safeActiveGraceTasks.slice(0, 1).map((t) => (
                            <div
                                key={String(t.id)}
                                className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-white break-words">
                                        {t.title}
                                    </p>
                                    <span className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                        <Clock size={11} className="text-amber-500/90 shrink-0" />
                                        {new Date(t.dueDate).toLocaleDateString('ar-EG', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'short',
                                        })}
                                    </span>
                                </div>
                                {t.body ? (
                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400 whitespace-pre-line break-words">
                                        {t.body}
                                    </p>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            ) : quaternaryStageReady && safeActiveGraceTasks.length > 0 && evictionGracePinned && evictionGraceHidden ? (
                <div className="mx-3 mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2" dir="rtl">
                    <p className="text-[11px] font-bold text-slate-200">المهلة مخفية</p>
                    <button
                        type="button"
                        onClick={() => {
                            setEvictionGraceHidden(false);
                            if (graceHiddenKey) {
                                try {
                                    SecureStoreService.setItemSync(graceHiddenKey, '0');
                                } catch {
                                    /* ignore */
                                }
                            }
                        }}
                        className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/15"
                    >
                        إظهار
                    </button>
                </div>
            ) : null}

            {tertiaryStageReady ? (
                <>
                    <Suspense
                        fallback={
                            showExecutionFinancialHub ? EXEC_OVERLAY_LAZY_FALLBACK : null
                        }
                    >
                        <LazyExecutionFinancialHubPortal
                                showExecutionFinancialHub={showExecutionFinancialHub}
                                onCloseFinancialHub={closeFinancialHubPortal}
                                onOpenUnifiedSeizureLog={() => scope.openUnifiedSeizureLog()}
                                financialHubAutoOpenMode={financialHubAutoOpenMode}
                                setFinancialHubAutoOpenMode={setFinancialHubAutoOpenMode}
                                financialHubSeizedMovableId={financialHubSeizedMovableId}
                                setFinancialHubSeizedMovableId={setFinancialHubSeizedMovableId}
                                financialHubSeizedPropertyId={financialHubSeizedPropertyId}
                                setFinancialHubSeizedPropertyId={setFinancialHubSeizedPropertyId}
                                EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                                EXEC_MODAL_Z={EXEC_MODAL_Z}
                                LazyFinancialOperationsCenter={LazyFinancialOperationsCenter}
                                EXEC_FOC_LAZY_FALLBACK={EXEC_FOC_LAZY_FALLBACK}
                                realEstateSeizureRegistryAssets={realEstateSeizureRegistryAssets}
                                movableSeizureRegistryAssets={movableSeizureRegistryAssets}
                                salarySeizureRegistryAssets={salarySeizureRegistryAssets}
                                thirdPartySeizureRegistryAssets={thirdPartySeizureRegistryAssets}
                                standaloneExecutionMarks={standaloneExecutionMarks}
                                executionData={viewExecutionData}
                                executionId={executionId}
                                isFinancialCenterExpanded={isFinancialCenterExpanded}
                                onToggleFinancialCenterExpanded={toggleFinancialCenterExpanded}
                                activeFinancialTab={activeFinancialTab}
                                setActiveFinancialTab={setActiveFinancialTab}
                                principalDebtAmount={financialPrincipalAmount}
                                evictionLawyerFeesInTotals={evictionLawyerFeesInTotals}
                                isEvictionExecutionModule={isEvictionExecutionModule}
                                parsedLawyerFees={financialLawyerFeesAmount}
                                total_execution_expenses={total_execution_expenses}
                                monthlyAlimony={monthlyAlimony}
                                totalOwed={totalOwed}
                                remaining={remaining}
                                parsedCourtFees={parsedCourtFees}
                                parsedDirectorateFees={parsedDirectorateFees}
                                parsedClientFees={parsedClientFees}
                                financialStatus={financialStatus}
                                isNonFinancialClaim={isNonFinancialClaim}
                                isAlimonyClaim={isAlimonyClaim}
                                claimType={claimType}
                                paidDebt={paidDebt}
                                totalWithExecutionFee={totalWithExecutionFee}
                                calculatedExecutionFee={calculatedExecutionFee}
                                shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                                accumulatedAlimony={accumulatedAlimony}
                                paidCourtFees={paidCourtFees}
                                paidDirectorateFees={paidDirectorateFees}
                                paidClientFees={paidClientFees}
                                daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                                gracePeriodEnded={gracePeriodEnded}
                                initiator={initiator}
                                onOpenPaymentCalculator={directOpenPaymentCalculator}
                                onOpenSettlementCalculator={directOpenSettlementCalculator}
                                handleCoerciveAction={handleCoerciveAction}
                                executionStatus={executionStatus}
                                statusMetadata={statusMetadata}
                                isPaused={isPaused}
                                onOpenLedgerModal={directOpenLedgerModal}
                                financialLedger={financialLedger}
                                evictionCaseExpensesTotalForFinancial={evictionCaseExpensesTotalForFinancial}
                                evictionCaseExpenses={evictionCaseExpenses}
                                onOpenEvictionExpenseModal={directOpenEvictionExpenseModal}
                                handleEvictionLawyerFeeRequest={handleEvictionLawyerFeeRequest}
                                lawyerFeePayoutApproved={lawyerFeePayoutApproved}
                                handleFundsLedgerPayment={handleFundsLedgerPayment}
                                setTimelineEvents={setTimelineEvents}
                                nextTimelineId={nextTimelineId}
                                guarantorFollowupAwaitingDetailsSave={guarantorFollowupAwaitingDetailsSave}
                                onOpenGuarantorFollowupDetails={openGuarantorFollowupDetails}
                                appendGuarantorFollowupRequest={appendGuarantorFollowupRequest}
                                decisionsStorageExecutionId={decisionsStorageExecutionId}
                                showToast={showToast}
                                timelineDebtorMetadata={timelineDebtorMetadata}
                                assignmentWorkspaceCtx={assignmentWorkspaceCtx}
                                persistExecutionMerge={persistExecutionMerge}
                                handleEvictionLedgerActivated={handleEvictionLedgerActivated}
                                evictionAssetsTabUnlocked={evictionAssetsTabUnlocked}
                                getLocalTodayYmd={typeof _scopeGetLocalTodayYmd === 'function' ? _scopeGetLocalTodayYmd : getLocalTodayYmd}
                                setCaseTasksPending={setCaseTasksPending}
                                onClearSalarySeizurePath={clearActiveSalarySeizurePath}
                                isRepresentingDebtor={isRepresentingDebtor}
                                activeDebtorIsDeceased={activeDebtorIsDeceased}
                        />

                        <LazyUnifiedSeizureLogHost
                            isRepresentingDebtor={isRepresentingDebtor}
                            showModal={showUnifiedSeizureLogModal}
                            hasContent={scope.hasUnifiedSeizureLogContent}
                            activeTab={unifiedSeizureLogTab}
                            onTabChange={setUnifiedSeizureLogTab}
                            counts={unifiedSeizureTabCounts}
                            entries={unifiedSeizureLogEntries}
                            onClose={closeUnifiedSeizureLog}
                            footer={{
                                seizedPropertiesForSeizureLog: scope.seizedPropertiesForSeizureLog,
                                seizedMovablesForSeizureLog: scope.seizedMovablesForSeizureLog,
                                realEstateSeizureRegistryAssets,
                                movableSeizureRegistryAssets,
                                salarySeizureTabRows,
                                thirdPartySeizureRegistryAssets,
                                thirdPartySeizuresUi,
                                thirdPartyFundsDraftById,
                                setThirdPartyFundsDraftById,
                                setThirdPartySeizuresUi,
                                decisionsStorageExecutionId,
                                executionId,
                                executionData: executionData ?? null,
                                seizureLogExecutorDecisions,
                                propertyInlineSaveCtx,
                                decisionsReloadEpoch,
                                appealPerspective,
                                showToast,
                                focusSeizurePropertyInlineCompletion,
                                focusSeizureMovableInlineCompletion,
                                followupSalarySeizureLabel,
                                patchSalarySeizureAssetDetails,
                                releaseSeizureAssetRow,
                                persistExecutionMerge,
                                setTimelineEvents,
                                nextTimelineId,
                                getLedgerParams: () => seizureMatrixLedgerParamsRef.current,
                                onLedgerRevision: () => setUnifiedLedgerRevision((v: number) => v + 1),
                                beginThirdPartyReceiveStep,
                                updateThirdPartyReceiveDraft,
                                cancelThirdPartyReceiveStep,
                                confirmThirdPartyReceive,
                            }}
                        />
                    </Suspense>

                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazySeizureRequestSubjectModal
                            open={propertySeizureRequestModalOpen}
                            title="طلب حجز عقار"
                            placeholder="اكتب موضوع طلب حجز العقار"
                            subjectDraft={propertySeizureSubjectDraft}
                            tone="amber"
                            onClose={() => setPropertySeizureRequestModalOpen(false)}
                            onSubjectDraftChange={setPropertySeizureSubjectDraft}
                            onSubmit={submitPropertySeizureRequest}
                        />
                    </Suspense>

                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazySeizureRequestSubjectModal
                            open={movableSeizureRequestModalOpen}
                            title="طلب حجز مال منقول"
                            placeholder="اكتب موضوع طلب حجز المال المنقول"
                            subjectDraft={movableSeizureSubjectDraft}
                            tone="sky"
                            onClose={() => setMovableSeizureRequestModalOpen(false)}
                            onSubjectDraftChange={setMovableSeizureSubjectDraft}
                            onSubmit={submitMovableSeizureRequest}
                        />
                    </Suspense>
                </>
            ) : null}
        </>
    );
}
