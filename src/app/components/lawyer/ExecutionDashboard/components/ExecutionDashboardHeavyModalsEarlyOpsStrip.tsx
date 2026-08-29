/** Seized assets / payment / timeline / notification / coercive / heirs — EarlyCluster sibling */
import React, { Suspense } from 'react';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { closeUnknownScope } from '../closeUnknownScope';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import {
    ExecutionFullTimelineInstantFrame,
    ExecutionNamedOverlayInstantFrame,
    ExecutionSeizedAssetsInstantFrame,
} from './executionOverlayInstantPresets';
import {
    LazyExecutionCoerciveActionsModalContainer as LazyExecutionCoerciveActionsModalContainerStrict,
    LazyExecutionDebtorNotificationMemoModalContainer as LazyExecutionDebtorNotificationMemoModalContainerStrict,
    LazyExecutionFullTimelineModalContainer as LazyExecutionFullTimelineModalContainerStrict,
    LazyExecutionHeirsNotificationModalContainer as LazyExecutionHeirsNotificationModalContainerStrict,
    LazyExecutionPaymentModalContainer as LazyExecutionPaymentModalContainerStrict,
    LazyExecutionSeizedAssetsModalContainer as LazyExecutionSeizedAssetsModalContainerStrict,
    LazyModalSeizedAssetsManager,
    LazyPremiumTimelineAuditLog,
} from '../executionDashboardLazyRegistryOverlays';

type LooseComp = React.ComponentType<Record<string, unknown>>;
const LazyExecutionSeizedAssetsModalContainer =
    LazyExecutionSeizedAssetsModalContainerStrict as unknown as LooseComp;
const LazyExecutionPaymentModalContainer =
    LazyExecutionPaymentModalContainerStrict as unknown as LooseComp;
const LazyExecutionFullTimelineModalContainer =
    LazyExecutionFullTimelineModalContainerStrict as unknown as LooseComp;
const LazyExecutionDebtorNotificationMemoModalContainer =
    LazyExecutionDebtorNotificationMemoModalContainerStrict as unknown as LooseComp;
const LazyExecutionCoerciveActionsModalContainer =
    LazyExecutionCoerciveActionsModalContainerStrict as unknown as LooseComp;
const LazyExecutionHeirsNotificationModalContainer =
    LazyExecutionHeirsNotificationModalContainerStrict as unknown as LooseComp;

export function ExecutionDashboardHeavyModalsEarlyOpsStrip({
    s,
}: {
    s: Record<string, unknown>;
}) {
    return (
        <>
            {s.showSeizedAssetsModal && (
                <Suspense
                    fallback={
                        <ExecutionSeizedAssetsInstantFrame
                            onClose={
                                typeof s.onCloseSeizedAssetsModal === 'function'
                                    ? (s.onCloseSeizedAssetsModal as () => void)
                                    : () => {
                                          if (typeof s.setShowSeizedAssetsModal === 'function') {
                                              (s.setShowSeizedAssetsModal as (v: boolean) => void)(
                                                  false,
                                              );
                                          }
                                      }
                            }
                        />
                    }
                >
                    <LazyExecutionSeizedAssetsModalContainer
                        showSeizedAssetsModal={s.showSeizedAssetsModal}
                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                        LazyModalSeizedAssetsManager={LazyModalSeizedAssetsManager}
                        setShowSeizedAssetsModal={s.setShowSeizedAssetsModal}
                        onCloseSeizedAssetsModal={s.onCloseSeizedAssetsModal}
                        seizedAssetsModalExecutionId={s.executionId || s.file?.id}
                        seizedAssets={s.seizedAssets}
                        onUpdateSeizedAssets={(next: unknown) => {
                            s.setSeizedAssets(next);
                            s.persistExecutionMerge({ seizedAssets: next });
                        }}
                    />
                </Suspense>
            )}

            {s.showPaymentModal && (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="إضافة تسديد جديد"
                            onClose={closeUnknownScope(
                                s,
                                'onClosePaymentModal',
                                'setShowPaymentModal',
                            )}
                        />
                    }
                >
                    <LazyExecutionPaymentModalContainer
                        showPaymentModal={s.showPaymentModal}
                        setShowPaymentModal={s.setShowPaymentModal}
                        onClosePaymentModal={s.onClosePaymentModal}
                        paymentAmount={s.paymentAmount}
                        setPaymentAmount={s.setPaymentAmount}
                        paymentDate={s.paymentDate}
                        setPaymentDate={s.setPaymentDate}
                        handlePayment={s.handlePayment}
                    />
                </Suspense>
            )}

            {s.showTimelineModal ? (
                <Suspense
                    fallback={
                        <ExecutionFullTimelineInstantFrame
                            onClose={
                                typeof s.onCloseTimelineModal === 'function'
                                    ? (s.onCloseTimelineModal as () => void)
                                    : () => {
                                          if (typeof s.setShowTimelineModal === 'function') {
                                              (s.setShowTimelineModal as (v: boolean) => void)(
                                                  false,
                                              );
                                          }
                                      }
                            }
                        />
                    }
                >
                    <LazyExecutionFullTimelineModalContainer
                        showTimelineModal={s.showTimelineModal}
                        setShowTimelineModal={s.setShowTimelineModal}
                        onCloseTimelineModal={s.onCloseTimelineModal}
                        debtorBrowserTabsMode={s.debtorBrowserTabsMode}
                        activeTimelineEventsDebtorScoped={s.mergedTimelineEventsDebtorScoped}
                        activeTimelineEvents={s.mergedTimelineEvents}
                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                        PremiumTimelineAuditLog={LazyPremiumTimelineAuditLog}
                        History={s.History}
                        toggleTimelineEventPin={s.toggleTimelineEventPin}
                        moveTimelineEventToTrash={s.moveTimelineEventToTrash}
                        onRequestEditTimelineEvent={s.requestEditTimelineEvent}
                        isHistoricalMode={s.isHistoricalMode}
                        activeTimelineFilter={s.activeTimelineFilter}
                        setActiveTimelineFilter={s.setActiveTimelineFilter}
                        todayYmd={s.todayYmd}
                        timelineFilterOptions={s.timelineFilterOptions}
                    />
                </Suspense>
            ) : null}

            {s.showNotificationModal && (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="التبليغ"
                            onClose={closeUnknownScope(
                                s,
                                'onCloseNotificationModal',
                                'setShowNotificationModal',
                            )}
                            zIndex={EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification}
                        />
                    }
                >
                    <LazyExecutionDebtorNotificationMemoModalContainer
                        showNotificationModal={s.showNotificationModal}
                        setShowNotificationModal={s.setShowNotificationModal}
                        onCloseNotificationModal={s.onCloseNotificationModal}
                        debtorNotificationDate={s.debtorNotificationDate}
                        setDebtorNotificationDate={s.setDebtorNotificationDate}
                        handleNotifyDebtor={s.handleNotifyDebtor}
                        getLocalTodayYmd={s.getLocalTodayYmd}
                        EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                        notificationModalZIndex={EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification}
                    />
                </Suspense>
            )}

            {s.showCoerciveModal && (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title={
                                s.followupEmployeeFinancialSalaryOnlyCoercive
                                    ? 'طلبات حجز — تنفيذ مالي (موظف)'
                                    : s.followupMonetaryCoerciveLimitedOnly
                                      ? 'طلبات حجز مال — راتب وعقار ومنقول'
                                      : 'التنفيذ الجبري والإكراه'
                            }
                            onClose={closeUnknownScope(
                                s,
                                'onCloseCoerciveModal',
                                'setShowCoerciveModal',
                            )}
                        />
                    }
                >
                    <LazyExecutionCoerciveActionsModalContainer
                        showCoerciveModal={s.showCoerciveModal}
                        setShowCoerciveModal={s.setShowCoerciveModal}
                        onCloseCoerciveModal={s.onCloseCoerciveModal}
                        followupEmployeeFinancialSalaryOnlyCoercive={
                            s.followupEmployeeFinancialSalaryOnlyCoercive
                        }
                        followupMonetaryCoerciveLimitedOnly={s.followupMonetaryCoerciveLimitedOnly}
                        activeDebtorIsEmployee={s.activeDebtorIsEmployee}
                        executionCoerciveButtonDisabled={s.executionCoerciveButtonDisabled}
                        daysSinceNoticeCalculated={s.daysSinceNoticeCalculated}
                        remaining={s.remaining}
                        handleCoerciveAction={s.handleCoerciveAction}
                        isDebtorGovernmentEmployee={s.isDebtorGovernmentEmployee}
                        isDebtorFreelancer={s.isDebtorFreelancer}
                        isNonFinancialClaim={s.isNonFinancialClaim}
                        showToast={s.showToast}
                    />
                </Suspense>
            )}

            {s.showHeirsNotificationModal && (
                <Suspense
                    fallback={
                        <ExecutionNamedOverlayInstantFrame
                            title="مركز تبليغ الورثة — متابعة مستقلة"
                            onClose={closeUnknownScope(
                                s,
                                'onCloseHeirsNotificationModal',
                                'setShowHeirsNotificationModal',
                            )}
                            zIndex={EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification}
                        />
                    }
                >
                    <LazyExecutionHeirsNotificationModalContainer
                        showHeirsNotificationModal={s.showHeirsNotificationModal}
                        setShowHeirsNotificationModal={s.setShowHeirsNotificationModal}
                        onCloseHeirsNotificationModal={s.onCloseHeirsNotificationModal}
                        EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                        heirsNotificationModalZIndex={
                            EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification
                        }
                        activeDebtorHeirsForNotification={s.activeDebtorHeirsForNotification}
                        normalizeHeirWorkflowKey={s.normalizeHeirWorkflowKey}
                        heirsWorkflowByHeir={s.heirsWorkflowByHeir}
                        computeDaysRemaining={s.computeDaysRemaining}
                        computeDeadlineYmd={s.computeDeadlineYmd}
                        heirSummonsDatePickerOpenByHeir={s.heirSummonsDatePickerOpenByHeir}
                        setHeirSummonsDatePickerOpenByHeir={s.setHeirSummonsDatePickerOpenByHeir}
                        heirNoticeDateDrafts={s.heirNoticeDateDrafts}
                        setHeirNoticeDateDrafts={s.setHeirNoticeDateDrafts}
                        issueHeirMemoNotice={s.issueHeirMemoNotice}
                        closeHeirMemoManually={s.closeHeirMemoManually}
                        issueHeirSummons={s.issueHeirSummons}
                        markHeirSummonsAttended={s.markHeirSummonsAttended}
                        markHeirSummonsPeriodEnded={s.markHeirSummonsPeriodEnded}
                    />
                </Suspense>
            )}
        </>
    );
}
