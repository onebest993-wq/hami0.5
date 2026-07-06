// @ts-nocheck
/** Heavy overlay modals — chunk منفصل */
import React, { Suspense } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import {
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyAlimonyBeneficiaryDeathModal,
    LazyDocumentVault,
    LazyExecutionCoerciveActionsModalContainer,
    LazyExecutionDebtorNotificationMemoModalContainer,
    LazyExecutionDecisionsModalContainer,
    LazyExecutionFinancialLedgerPortalContainer,
    LazyExecutionFullTimelineModalContainer,
    LazyExecutionHeirsNotificationModalContainer,
    LazyExecutionModalsContainer,
    LazyExecutionPaymentModalContainer,
    LazyExecutionSeizedAssetsModalContainer,
    LazyExecutionTransferFileNumberModal,
    LazyGuarantorDetailsPostApprovalModal,
    LazyLinkedDossierTimelineModal,
    LazyPaymentCalculator,
    LazyRealEstateSeizurePostApprovalModal,
    LazySettlementCalculator,
    LazyStayOfExecutionModal,
    LazyPartyDeathReportModal,
    LazyUnifiedSummonsModalContainer,
    LazyDecisionsAndAppealsEngine,
    LazyModalSeizedAssetsManager,
    LazyPremiumTimelineAuditLog,
    LazyUnifiedSummonsHub,
} from '../executionDashboardLazyShell';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';

export function ExecutionDashboardHeavyModals(props: Record<string, any>) {
    const s = props;
    const showAnyHeavyModal = Boolean(
        s.showDocumentsModal ||
            s.showRealEstateSeizureModal ||
            s.showDecisionsModal ||
            s.showSeizedAssetsModal ||
            s.showPaymentModal ||
            s.showTimelineModal ||
            s.showNotificationModal ||
            s.showCoerciveModal ||
            s.showHeirsNotificationModal ||
            s.showGuarantorDetailsModal ||
            s.showStayOfExecutionModal ||
            s.partyDeathModalParty ||
            s.showPauseModal ||
            s.alimonyBeneficiaryDeathModalOpen ||
            s.showUnifiedSummonsModal ||
            s.showPaymentCalculator ||
            s.showSettlementCalculator ||
            s.showLedgerModal ||
            s.showTransferFileNumberChangeModal ||
            (s.showLinkedDossierTimeline && s.linkedDossierToView),
    );

    if (!showAnyHeavyModal) {
        return null;
    }

    return (
        <>
            {s.showDocumentsModal && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyDocumentVault
                        executionId={String(s.executionId || s.file?.id || 'unknown')}
                        onClose={() => s.setShowDocumentsModal(false)}
                        onDocumentUploaded={(info) => {
                            const now = new Date().toISOString();
                            const docEvent: TimelineEvent = {
                                id: s.nextTimelineId(),
                                type: 'other',
                                date: now,
                                timestamp: now,
                                title: `مستند: ${info.title}`,
                                description: `${info.category} — ${info.fileName}`,
                                source: 'المستندات والملفات',
                            };
                            s.setTimelineEvents((prev) => [docEvent, ...prev]);
                        }}
                    />
                </Suspense>
            )}

            {s.showRealEstateSeizureModal ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyRealEstateSeizurePostApprovalModal
                        open={s.showRealEstateSeizureModal}
                        onOpenChange={(open) => {
                            s.setShowRealEstateSeizureModal(open);
                            if (!open) s.setRealEstateSeizureModalDecisionId(null);
                        }}
                        decisionId={String(s.realEstateSeizureModalDecisionId || '')}
                        initial={s.realEstateModalInitial}
                        disabled={s.isHistoricalMode}
                        onSave={s.saveRealEstateSeizureFromModal}
                    />
                </Suspense>
            ) : null}

            {s.showDecisionsModal ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionDecisionsModalContainer
                showDecisionsModal={s.showDecisionsModal}
                onCloseDecisionsModal={() => {
                    s.setShowDecisionsModal(false);
                    s.clearDecisionsModalBootState();
                }}
                LazyDecisionsAndAppealsEngine={LazyDecisionsAndAppealsEngine}
                executionId={
                    s.decisionsStorageExecutionId && s.decisionsStorageExecutionId !== 'default'
                        ? s.decisionsStorageExecutionId
                        : s.executionId && s.executionId !== 'default'
                          ? s.executionId
                          : undefined
                }
                getMilestoneTimelineSnapshot={s.getMilestoneTimelineSnapshot}
                onTimelineUpdate={(event) => {
                    s.setTimelineEvents((prev) => {
                        const next = s.mergeSimilarRecentTimelineEvent(prev, event);
                        queueMicrotask(() => {
                            s.persistExecutionMerge({ timelineEvents: next });
                            const execId = String(
                                s.executionDataRef.current?.id ?? s.executionId ?? ''
                            );
                            if (!execId || execId === 'undefined') return;
                            if (event.snapshot == null) return;
                            const mergedRow =
                                next.find((e) => e.id === event.id) ??
                                next.find((e) => e.snapshot === event.snapshot) ??
                                next[0];
                            const rowForRemote = mergedRow
                                ? { ...mergedRow, id: event.id, snapshot: event.snapshot }
                                : { ...event };
                            void import('@/app/services/timelineEventsSupabase')
                                .then(({ insertTimelineEventToSupabase }) =>
                                    insertTimelineEventToSupabase({
                                        executionFileId: execId,
                                        event: rowForRemote,
                                        snapshotData: event.snapshot,
                                    })
                                )
                                .catch(() => {});
                        });
                        return next;
                    });
                }}
                bootHubTab={
                    (s.decisionsModalBootListTab ?? s.decisionsModalBootHubTab) ?? undefined
                }
                decisionsScrollToIdOnBoot={s.decisionsModalScrollToDecisionId ?? undefined}
                appealsScrollToIdOnBoot={
                    s.decisionsModalBootHubTab === 'appeals'
                        ? (s.appealsModalScrollToDecisionId ?? s.firstActiveAppealDecisionId)
                        : undefined
                }
                executionData={s.viewExecutionData}
                isHistoricalMode={s.isHistoricalMode}
                seizedAssets={s.seizedAssets}
                seizureDraftsByDecisionId={s.seizureDraftsByDecisionId}
                persistExecutionMerge={s.persistExecutionMerge}
                pushTimelineEvent={s.pushTimelineEvent}
                nextTimelineId={s.nextTimelineId}
                syncSeizedAssets={(next) => s.setSeizedAssets(next)}
                syncSeizureDrafts={(next) => s.setSeizureDraftsByDecisionId(next)}
                syncActiveCoerciveActions={(next) => s.setActiveCoerciveActions(next)}
                evictionExecutorWorkflow={
                    s.isEvictionExecutionModule
                        ? {
                              dossierId: String(s.executionData?.id ?? s.executionId ?? s.file?.id ?? 'default'),
                              actions: s.executorApprovalActions,
                          }
                        : undefined
                }
            />
            </Suspense>
            ) : null}

            {s.showSeizedAssetsModal && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionSeizedAssetsModalContainer
                showSeizedAssetsModal={s.showSeizedAssetsModal}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyModalSeizedAssetsManager={LazyModalSeizedAssetsManager}
                setShowSeizedAssetsModal={s.setShowSeizedAssetsModal}
                seizedAssetsModalExecutionId={s.executionId || s.file?.id}
            />
            </Suspense>
            )}

            {s.showPaymentModal && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionPaymentModalContainer
                showPaymentModal={s.showPaymentModal}
                setShowPaymentModal={s.setShowPaymentModal}
                paymentAmount={s.paymentAmount}
                setPaymentAmount={s.setPaymentAmount}
                paymentDate={s.paymentDate}
                setPaymentDate={s.setPaymentDate}
                handlePayment={s.handlePayment}
            />
            </Suspense>
            )}

            {s.showTimelineModal ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionFullTimelineModalContainer
                showTimelineModal={s.showTimelineModal}
                setShowTimelineModal={s.setShowTimelineModal}
                debtorBrowserTabsMode={s.debtorBrowserTabsMode}
                activeTimelineEventsDebtorScoped={s.mergedTimelineEventsDebtorScoped}
                activeTimelineEvents={s.mergedTimelineEvents}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
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
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionDebtorNotificationMemoModalContainer
                    showNotificationModal={s.showNotificationModal}
                    setShowNotificationModal={s.setShowNotificationModal}
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
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionCoerciveActionsModalContainer
                    showCoerciveModal={s.showCoerciveModal}
                    setShowCoerciveModal={s.setShowCoerciveModal}
                    followupEmployeeFinancialSalaryOnlyCoercive={s.followupEmployeeFinancialSalaryOnlyCoercive}
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
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionHeirsNotificationModalContainer
                    showHeirsNotificationModal={s.showHeirsNotificationModal}
                    setShowHeirsNotificationModal={s.setShowHeirsNotificationModal}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    heirsNotificationModalZIndex={EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification}
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

            {s.showGuarantorDetailsModal || s.showStayOfExecutionModal || Boolean(s.partyDeathModalParty) || s.showPauseModal ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionModalsContainer
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                isHistoricalMode={s.isHistoricalMode}
                executionId={s.executionId}
                executionData={s.viewExecutionData}
                executionStorageKey={s.executionStorageKey}
                storageCache={s.storageCache}
                showToast={s.showToast}
                setTimelineEvents={s.setTimelineEvents}
                GuarantorDetailsPostApprovalModal={LazyGuarantorDetailsPostApprovalModal}
                showGuarantorDetailsModal={s.showGuarantorDetailsModal}
                setShowGuarantorDetailsModal={s.setShowGuarantorDetailsModal}
                setGuarantorDetailsDecisionId={s.setGuarantorDetailsDecisionId}
                guarantorNameDraft={s.guarantorNameDraft}
                guarantorWorkplaceDraft={s.guarantorWorkplaceDraft}
                guarantorSalaryDraft={s.guarantorSalaryDraft}
                guarantorDeductionDraft={s.guarantorDeductionDraft}
                setGuarantorNameDraft={s.setGuarantorNameDraft}
                setGuarantorWorkplaceDraft={s.setGuarantorWorkplaceDraft}
                setGuarantorSalaryDraft={s.setGuarantorSalaryDraft}
                setGuarantorDeductionDraft={s.setGuarantorDeductionDraft}
                persistGuarantorFollowupDetails={s.persistGuarantorFollowupDetails}
                StayOfExecutionModal={LazyStayOfExecutionModal}
                showStayOfExecutionModal={s.showStayOfExecutionModal}
                setShowStayOfExecutionModal={s.setShowStayOfExecutionModal}
                stayOfExecutionActive={s.stayOfExecutionActive}
                handleSpecialCasesStay={s.handleSpecialCasesStay}
                PartyDeathReportModal={LazyPartyDeathReportModal}
                partyDeathModalParty={s.partyDeathModalParty}
                setPartyDeathModalParty={s.setPartyDeathModalParty}
                setPartyDeathModalDecisionId={s.setPartyDeathModalDecisionId}
                handlePartyDeathSave={s.handlePartyDeathSave}
                creditorSubstitutionRequestStatus={s.creditorSubstitutionRequestStatus}
                handleRequestCreditorSubstitution={s.handleRequestCreditorSubstitution}
                debtorSubstitutionRequestStatus={s.debtorSubstitutionRequestStatus}
                handleRequestDebtorSubstitution={s.handleRequestDebtorSubstitution}
                X={s.X}
                showPauseModal={s.showPauseModal}
                setShowPauseModal={s.setShowPauseModal}
                isPaused={s.isPaused}
                setIsPaused={s.setIsPaused}
                Pause={s.Pause}
                Play={s.Play}
                AlertCircle={s.AlertCircle}
                CheckCircle={s.CheckCircle}
                pauseReason={s.pauseReason}
                setPauseReason={s.setPauseReason}
            />
            </Suspense>
            ) : null}

            {s.alimonyBeneficiaryDeathModalOpen ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyAlimonyBeneficiaryDeathModal
                open={s.alimonyBeneficiaryDeathModalOpen}
                onClose={() => {
                    s.setAlimonyBeneficiaryDeathModalOpen(false);
                    s.setAlimonyBeneficiaryDeathModalProfile(null);
                }}
                profile={s.alimonyBeneficiaryDeathModalProfile ?? s.alimonyBeneficiaryProfile}
                onConfirm={s.handleAlimonyBeneficiaryDeathConfirm}
            />
            </Suspense>
            ) : null}
            
            {s.showUnifiedSummonsModal ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyUnifiedSummonsModalContainer
                showUnifiedSummonsModal={s.showUnifiedSummonsModal}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyUnifiedSummonsHub={LazyUnifiedSummonsHub}
                executionId={s.executionId}
                unifiedSummonsTargetDebtorKey={s.unifiedSummonsTargetDebtorKey}
                summonsHubInitialMainTab={s.summonsHubInitialMainTab}
                setSummonsHubInitialMainTab={s.setSummonsHubInitialMainTab}
                setSummonsContextDebtorKey={s.setSummonsContextDebtorKey}
                setShowUnifiedSummonsModal={s.setShowUnifiedSummonsModal}
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
                pushTimelineEvent={s.pushTimelineEvent}
                nextTimelineId={s.nextTimelineId}
                showToast={s.showToast}
            />
            </Suspense>
            ) : null}


            {/* 🆕 V9: PAYMENT CALCULATOR */}
            {s.showPaymentCalculator && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyPaymentCalculator
                        isOpen
                        onClose={() => s.setShowPaymentCalculator(false)}
                        currentTotal={s.totalOwed}
                        onPayment={s.handlePaymentFromCalculator}
                    />
                </Suspense>
            )}
            
            {/* 🆕 V9: SETTLEMENT CALCULATOR */}
            {s.showSettlementCalculator && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazySettlementCalculator
                        isOpen
                        onClose={() => s.setShowSettlementCalculator(false)}
                        currentTotal={s.totalOwed}
                        onSettlement={s.handleSettlementFromCalculator}
                    />
                </Suspense>
            )}
            
            {s.showLedgerModal && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
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
                onClose={() => s.setShowLedgerModal(false)}
                readUnifiedFundsLedger={s.readUnifiedFundsLedger}
                filterUnifiedLawyerFeesHideFileDuplicate={s.filterUnifiedLawyerFeesHideFileDuplicate}
                filterUnifiedExpensesHideFileDuplicate={s.filterUnifiedExpensesHideFileDuplicate}
                formatUnifiedLedgerDate={s.formatUnifiedLedgerDate}
            />
            </Suspense>
            )}

            {s.showTransferFileNumberChangeModal ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionTransferFileNumberModal
                open={s.showTransferFileNumberChangeModal}
                initialFileNumber={String(s.executionData?.fileNumber || '').trim()}
                onClose={() => s.setShowTransferFileNumberChangeModal(false)}
                onValidationWarning={(message) => s.showToast(message, 'warning')}
                onConfirm={(nextNo) => {
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
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyLinkedDossierTimelineModal
                    dossier={s.linkedDossierToView}
                    onClose={() => { s.setShowLinkedDossierTimeline(false); s.setLinkedDossierToView(null); }}
                />
                </Suspense>
            )}
        </>
    );
}
