/** Summons + finance/transfer/linked overlays — extracted from HeavyModals (no visual change) */
import React, { Suspense } from 'react';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { closeUnknownScope } from '../closeUnknownScope';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
import {
    LazyExecutionFinancialLedgerPortalContainer as LazyExecutionFinancialLedgerPortalContainerStrict,
    LazyExecutionTransferFileNumberModal as LazyExecutionTransferFileNumberModalStrict,
    LazyLinkedDossierTimelineModal as LazyLinkedDossierTimelineModalStrict,
    LazyPaymentCalculator as LazyPaymentCalculatorStrict,
    LazySettlementCalculator as LazySettlementCalculatorStrict,
    LazyUnifiedSummonsHub,
    LazyUnifiedSummonsModalContainer as LazyUnifiedSummonsModalContainerStrict,
} from '../executionDashboardLazyRegistryOverlays';

type LooseComp = React.ComponentType<Record<string, unknown>>;
const LazyUnifiedSummonsModalContainer = LazyUnifiedSummonsModalContainerStrict as unknown as LooseComp;
const LazyPaymentCalculator = LazyPaymentCalculatorStrict as unknown as LooseComp;
const LazySettlementCalculator = LazySettlementCalculatorStrict as unknown as LooseComp;
const LazyExecutionFinancialLedgerPortalContainer =
    LazyExecutionFinancialLedgerPortalContainerStrict as unknown as LooseComp;
const LazyExecutionTransferFileNumberModal =
    LazyExecutionTransferFileNumberModalStrict as unknown as LooseComp;
const LazyLinkedDossierTimelineModal = LazyLinkedDossierTimelineModalStrict as unknown as LooseComp;

export function ExecutionDashboardHeavyModalsLateCluster({ s }: { s: Record<string, unknown> }) {
    return (
        <>
            {s.showUnifiedSummonsModal ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="مركز التبليغات"
                        onClose={closeUnknownScope(
                            s,
                            'onCloseUnifiedSummonsModal',
                            'setShowUnifiedSummonsModal',
                        )}
                    />
                }
            >
            <LazyUnifiedSummonsModalContainer
                showUnifiedSummonsModal={s.showUnifiedSummonsModal}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                LazyUnifiedSummonsHub={LazyUnifiedSummonsHub}
                executionId={s.executionId}
                unifiedSummonsTargetDebtorKey={s.unifiedSummonsTargetDebtorKey}
                summonsHubInitialMainTab={s.summonsHubInitialMainTab}
                setSummonsHubInitialMainTab={s.setSummonsHubInitialMainTab}
                setSummonsContextDebtorKey={s.setSummonsContextDebtorKey}
                setShowUnifiedSummonsModal={s.setShowUnifiedSummonsModal}
                onCloseUnifiedSummonsModal={s.onCloseUnifiedSummonsModal}
                primaryDebtorKeyResolved={s.primaryDebtorKeyResolved}
                isEvictionExecutionModule={s.isEvictionExecutionModule}
                setManualGraceCalendarExtra={s.setManualGraceCalendarExtra}
                executionData={s.viewExecutionData}
                notificationCount={s.notificationCount}
                onUpdate={s.onUpdate}
                buildDebtorNoticePatchForKey={s.buildDebtorNoticePatchForKey}
                executionStorageKey={s.executionStorageKey}
                storageCache={s.storageCache}
                handleNotifyDebtor={s.handleNotifyDebtor}
                subsequentNoticeUnlocked={s.subsequentNoticeUnlocked}
                noticeKindGoalStrictBinding={s.noticeKindGoalStrictBinding}
                forcedSummoningAnalysis={s.forcedSummoningAnalysis}
                followupIsDebtorGovernmentEmployee={s.followupIsDebtorGovernmentEmployee}
                followupIsDebtorRetired={s.followupIsDebtorRetired}
                activeCoerciveActions={s.activeCoerciveActions}
                activeDebtorIsEmployee={s.activeDebtorIsEmployee}
                registerDebtorVoluntaryAttendance={s.registerDebtorVoluntaryAttendance}
                openExecutionSeizuresTab={s.openExecutionSeizuresTab}
                followupDebtorSummonsProfile={s.followupDebtorSummonsProfile}
                summoningRound={s.summoningRound}
                debtorBrowserTabsMode={s.debtorBrowserTabsMode}
                followupEarnerForcedActionUnlocked={s.followupEarnerForcedActionUnlocked}
                earnerForcedActionUnlocked={s.earnerForcedActionUnlocked}
                forcedAttendanceIssued={s.forcedAttendanceIssued}
                handleForcedAttendance={s.handleForcedAttendance}
                debtorNotifiedForEvictionGrace={s.debtorNotifiedForEvictionGrace}
                voluntaryEndOptimistic={s.voluntaryEndOptimistic}
                isEvictionGraceExpiredCalendar={s.isEvictionGraceExpiredCalendar}
                handleDeclareEvictionVoluntaryPeriodEnd={s.handleDeclareEvictionVoluntaryPeriodEnd}
                isEvictionGraceEffectivelyExpired={s.isEvictionGraceEffectivelyExpired}
                unifiedCollectionApproved={s.unifiedCollectionApproved}
                parsedLawyerFees={s.financialLawyerFeesAmount}
                debtorEvaded={s.debtorEvaded}
                handleDebtorEvasion={s.handleDebtorEvasion}
                noticeVoluntaryPeriodEndOptimistic={s.noticeVoluntaryPeriodEndOptimistic}
                isGracePeriodExpiredNow={s.isGracePeriodExpiredNow}
                debtorAttendedVoluntarily={s.debtorAttendedVoluntarily}
                handleDeclareNoticeVoluntaryPeriodEnd={s.handleDeclareNoticeVoluntaryPeriodEnd}
                lawyerStartedPostNoticeExecution={s.lawyerStartedPostNoticeExecution}
                coerciveUiLocked={s.coerciveUiLocked}
                executionStatus={s.executionStatus}
                employeeAssignmentTabEnabled={s.employeeAssignmentTabEnabled}
                resolvedEmployeeSummonsAssignment={s.resolvedEmployeeSummonsAssignment ?? null}
                handleEmployeeAssignmentConfirm={s.handleEmployeeAssignmentConfirm}
                handleEmployeeAssignmentAttend={s.handleEmployeeAssignmentAttend}
                handleEmployeeAssignmentDeclareAbsent={s.handleEmployeeAssignmentDeclareAbsent}
                handleEmployeeAssignmentTerminate={s.handleEmployeeAssignmentTerminate}
                handleEmployeeAssignmentRequestInvestigation={s.handleEmployeeAssignmentRequestInvestigation}
                handleEmployeeRegisterArrestOrder={s.handleEmployeeRegisterArrestOrder}
                handleEmployeeAssignmentRequestForcedBring={s.handleEmployeeAssignmentRequestForcedBring}
                forcedBringDecisionState={s.forcedBringDecisionState}
                employeeForcedBringAwaitingPersonalOutcome={s.employeeForcedBringAwaitingPersonalOutcome}
                handleEmployeeAssignmentResolveForcedBringOutcome={
                    s.handleEmployeeAssignmentResolveForcedBringOutcome
                }
                handleEmployeeWarrantOutcome={s.handleEmployeeWarrantOutcome}
                getPublicationNoticeForDebtorKey={s.getPublicationNoticeForDebtorKey}
                handlePublicationNoticeRegister={s.handlePublicationNoticeRegister}
                handlePublicationNoticeTerminate={s.handlePublicationNoticeTerminate}
                handlePublicationNoticeDebtorAttended={s.handlePublicationNoticeDebtorAttended}
                activeDebtorNoticeScope={s.activeDebtorNoticeScope}
                scopedSummonsMarker={s.scopedSummonsMarker}
                terminateDebtorSummonsMarker={s.terminateDebtorSummonsMarker}
                persistExecutionMerge={s.persistExecutionMerge}
                setTimelineEvents={s.setTimelineEvents}
                pushTimelineEvent={s.pushTimelineEvent}
                nextTimelineId={s.nextTimelineId}
                showToast={s.showToast}
            />
            </Suspense>
            ) : null}


            {/* 🆕 V9: PAYMENT CALCULATOR */}
            {s.showPaymentCalculator && (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="سداد دفعة"
                            onClose={closeUnknownScope(
                                s,
                                'onClosePaymentCalculator',
                                'setShowPaymentCalculator',
                            )}
                        />
                    }
                >
                    <LazyPaymentCalculator
                        isOpen
                        onClose={
                            typeof s.onClosePaymentCalculator === 'function'
                                ? s.onClosePaymentCalculator
                                : () => s.setShowPaymentCalculator(false)
                        }
                        currentTotal={s.totalOwed}
                        onPayment={s.handlePaymentFromCalculator}
                    />
                </Suspense>
            )}
            
            {/* 🆕 V9: SETTLEMENT CALCULATOR */}
            {s.showSettlementCalculator && (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="تسوية وتقسيط"
                            onClose={closeUnknownScope(
                                s,
                                'onCloseSettlementCalculator',
                                'setShowSettlementCalculator',
                            )}
                        />
                    }
                >
                    <LazySettlementCalculator
                        isOpen
                        onClose={
                            typeof s.onCloseSettlementCalculator === 'function'
                                ? s.onCloseSettlementCalculator
                                : () => s.setShowSettlementCalculator(false)
                        }
                        currentTotal={s.totalOwed}
                        onSettlement={s.handleSettlementFromCalculator}
                    />
                </Suspense>
            )}
            
            {s.showLedgerModal && (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="السجل المالي"
                        onClose={closeUnknownScope(s, 'onCloseLedgerModal', 'setShowLedgerModal')}
                    />
                }
            >
            <LazyExecutionFinancialLedgerPortalContainer
                showLedgerModal={s.showLedgerModal}
                executionData={s.viewExecutionData}
                executionId={s.executionId}
                parsedLawyerFees={s.financialLawyerFeesAmount}
                totalExecutionExpenses={s.total_execution_expenses}
                isEvictionExecutionModule={s.isEvictionExecutionModule}
                evictionCaseExpensesTotalForFinancial={s.evictionCaseExpensesTotalForFinancial}
                principalDebtAmount={s.financialPrincipalAmount}
                evictionCaseExpenses={s.evictionCaseExpenses}
                judicialCustodianSalariesExpenseIqd={s.judicialCustodianSalariesExpenseIqd}
                shouldCalculateExecutionFee={s.shouldCalculateExecutionFee}
                calculatedExecutionFee={s.calculatedExecutionFee}
                hasFinancialLedger={s.hasFinancialLedger}
                financialLedger={s.financialLedger}
                onClose={
                    typeof s.onCloseLedgerModal === 'function'
                        ? s.onCloseLedgerModal
                        : () => s.setShowLedgerModal(false)
                }
                readUnifiedFundsLedger={s.readUnifiedFundsLedger}
                filterUnifiedLawyerFeesHideFileDuplicate={s.filterUnifiedLawyerFeesHideFileDuplicate}
                filterUnifiedExpensesHideFileDuplicate={s.filterUnifiedExpensesHideFileDuplicate}
                formatUnifiedLedgerDate={s.formatUnifiedLedgerDate}
            />
            </Suspense>
            )}

            {s.showTransferFileNumberChangeModal ? (
            <Suspense
                fallback={
                    <ExecutionNamedOverlayInstantFrame
                        title="تغيير رقم الإضبارة"
                        onClose={closeUnknownScope(
                            s,
                            'onCloseTransferFileNumberChangeModal',
                            'setShowTransferFileNumberChangeModal',
                        )}
                    />
                }
            >
            <LazyExecutionTransferFileNumberModal
                open={s.showTransferFileNumberChangeModal}
                initialFileNumber={String(s.executionData?.fileNumber || '').trim()}
                onClose={
                    typeof s.onCloseTransferFileNumberChangeModal === 'function'
                        ? s.onCloseTransferFileNumberChangeModal
                        : () => s.setShowTransferFileNumberChangeModal(false)
                }
                onValidationWarning={(message: string) => s.showToast(message, 'warning')}
                onConfirm={(nextNo: string) => {
                    s.persistExecutionMerge({
                        fileNumber: nextNo,
                        transferPendingFileNumberChange: false,
                    });
                    s.setShowTransferFileNumberChangeModal(false);
                }}
            />
            </Suspense>
            ) : null}

            {s.showLinkedDossierTimeline && s.linkedDossierToView && (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="السجل الزمني — إضبارة زميل"
                            onClose={() => {
                                if (typeof s.onCloseLinkedDossierTimeline === 'function') {
                                    (s.onCloseLinkedDossierTimeline as () => void)();
                                    return;
                                }
                                if (typeof s.setShowLinkedDossierTimeline === 'function') {
                                    (s.setShowLinkedDossierTimeline as (v: boolean) => void)(false);
                                }
                                if (typeof s.setLinkedDossierToView === 'function') {
                                    (s.setLinkedDossierToView as (v: null) => void)(null);
                                }
                            }}
                        />
                    }
                >
                <LazyLinkedDossierTimelineModal
                    dossier={s.linkedDossierToView}
                    onClose={
                        typeof s.onCloseLinkedDossierTimeline === 'function'
                            ? s.onCloseLinkedDossierTimeline
                            : () => {
                                  s.setShowLinkedDossierTimeline(false);
                                  s.setLinkedDossierToView(null);
                              }
                    }
                />
                </Suspense>
            )}
        </>
    );
}
