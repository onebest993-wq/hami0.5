import React, { Suspense, useMemo } from 'react';
import { useSmartFileMainPanelLayout } from './mainPanel/useSmartFileMainPanelLayout';
import { SmartFileStageFooterBar } from './mainPanel/SmartFileStageFooterBar';
import { SmartFileCaseLinksSection } from './mainPanel/SmartFileCaseLinksSection';
import { SmartFileIncidentalCasesSection } from './mainPanel/SmartFileIncidentalCasesSection';
import { SmartFileWorkflowHubsSection } from './mainPanel/SmartFileWorkflowHubsSection';
import { SmartFileTimelineSection } from './mainPanel/SmartFileTimelineSection';
import { SmartFileMainHeaderSection } from './mainPanel/SmartFileMainHeaderSection';
import { isCassationStageName } from '../smartFile/judgmentTypes';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { LazyPersonalStatusDossierBody } from '@/app/components/lawyer/personal-status/personalStatusDossierLazy';
export type { SmartFileMainPanelProps } from './mainPanel/smartFileMainPanelTypes';
import type { SmartFileMainPanelProps } from './mainPanel/smartFileMainPanelTypes';
import { resolveViewOnlyQuickActionIds } from '../smartFile/viewOnlyQuickActions';
import { isOpponentProceedingsEvent, isSessionTimelineEvent } from '../smartFile/sessionRecordEngine';

export function SmartFileMainPanel(p: SmartFileMainPanelProps) {
    const {
        file,
        status,
        isViewingArchived,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        linkedCaseNo,
        parentData,
        displayStage,
        displayTimeline,
        setShowPauseResumeModal,
        handleStageSelect,
        handleInterruptionToggle,
        handleAbandonment,
        handleToggleNotification,
        handleCassationDecision,
        handleClosePleadings,
        handleReopenPleadings,
        handleOpenDefendantCassationAppeal,
        handleDefaultObjection,
        handleWaiveObjection,
        handleOtherAppeals,
        setShowAppealModal,
        setShowProvisionalOrderModal,
        handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision,
        setIsActionsMenuOpen,
        handleQuickAction,
        setShowPauseModal,
        setShowNotificationModal,
        setShowTaskModal,
        handleToggleTask,
        handleAppealBriefFile,
        handleAppealBriefOutcome,
        handleCorrespondenceResponse,
        setEditingTask,
        setEditingFastTrack,
        setShowFastTrackModal,
        setEditingAttachment,
        setShowAttachmentModal,
        handleDeleteEvent,
        handleEditEvent,
        handleAddAction,
        handleSaveFastTrack,
        editingEvent,
        setEditingEvent,
        setShowCrossAppealModal,
        setShowJudgmentModal,
        handleCancelCrossAppeal,
        stepperStages,
        currentStageId,
        onOpenLinkedFile,
        onUnlinkCaseLink,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    } = p;
    const isCassationStage = isCassationStageName(displayStage?.stageName);
    const isCaseLinkViewOnly = Boolean(p.isCaseLinkViewOnly);
    const interactionLocked = isViewingArchived || isCaseLinkViewOnly;
    const viewOnlyQuickActionIds = useMemo(
        () => (isCaseLinkViewOnly ? resolveViewOnlyQuickActionIds(displayTimeline) : undefined),
        [isCaseLinkViewOnly, displayTimeline],
    );
    const viewOnlySessionHubVisible = useMemo(() => {
        if (!isCaseLinkViewOnly) return true;
        const hasSessions = (displayTimeline ?? []).some(
            (e) => isSessionTimelineEvent(e) && !isOpponentProceedingsEvent(e),
        );
        const hasPetitions = (displayStage?.fastTrackPetitions ?? []).length > 0;
        const hasAttachments = (displayStage?.attachments ?? []).length > 0;
        return hasSessions || hasPetitions || hasAttachments;
    }, [isCaseLinkViewOnly, displayTimeline, displayStage]);
    const showWorkflowSections = !isViewingArchived && !isCassationStage;
    const showWorkflowPanels =
        showWorkflowSections && (!displayStage?.isPleadingsClosed || isCaseLinkViewOnly);
    const showSessionHubInStageTools =
        showWorkflowPanels && viewOnlySessionHubVisible && Boolean(handleAddAction);
    const {
        incidentalParentLink,
        linkedChildIncidentalCases,
        externalCaseLinks,
        internalCaseLink,
        consolidatedSecondaryLabel,
        externalConsolidationRefs,
        primaryCaseNo,
        primaryDocType,
        headerParties,
        isTimelineExpanded,
        setIsTimelineExpanded,
        timelineEventCount,
        crossAppealEligibility,
        showOpponentAppealBtn,
        showFirstInstanceIncidentalUi,
        showAbsentJudgmentFooter,
        showOpponentAppealBtnEffective,
        showPostJudgmentAppealFooter,
        showAppealStageFooter,
        showPetitionVoidFooter,
        showPleadingCloseFooter,
        quickActionsVariant,
        absentJudgmentFooterPanel,
        opponentAppealFooterPanel,
        appealStageFooterPanel,
        petitionVoidFooterPanel,
        postJudgmentAppealFooterPanel,
        showFlowStatusFooter,
        flowStatusFooterPanel,
    } = useSmartFileMainPanelLayout(p);

    if (isPersonalStatusFile(file)) {
        return (
            <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
                <Suspense
                    fallback={
                        <div
                            className="flex flex-1 min-h-0 bg-[#0B1021]"
                            aria-busy="true"
                            aria-label="جارٍ فتح الإضبارة"
                        />
                    }
                >
                    <LazyPersonalStatusDossierBody {...p} />
                </Suspense>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
                        <div 
                            className="relative z-[1] flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide print:overflow-visible print:max-h-max p-3 pb-2 sm:p-4 pointer-events-auto"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            <SmartFileMainHeaderSection
                                file={file}
                                status={status}
                                isViewingArchived={isViewingArchived}
                                interactionLocked={interactionLocked}
                                isPaused={isPaused}
                                pauseReason={pauseReason}
                                isInterrupted={isInterrupted}
                                interruptionData={interruptionData}
                                linkedCaseNo={linkedCaseNo}
                                parentData={parentData}
                                displayStage={displayStage}
                                stages={p.stages}
                                stepperStages={stepperStages}
                                currentStageId={currentStageId}
                                headerParties={headerParties}
                                primaryCaseNo={primaryCaseNo}
                                primaryDocType={primaryDocType}
                                consolidatedSecondaryLabel={consolidatedSecondaryLabel}
                                crossAppealEligibility={crossAppealEligibility}
                                showOpponentAppealBtn={showOpponentAppealBtn}
                                showAbsentJudgmentFooter={showAbsentJudgmentFooter}
                                handleStageSelect={handleStageSelect}
                                setShowPauseResumeModal={setShowPauseResumeModal}
                                setShowPauseModal={setShowPauseModal}
                                handleInterruptionToggle={handleInterruptionToggle}
                                handleAbandonment={handleAbandonment}
                                setShowNotificationModal={setShowNotificationModal}
                                handleCancelCrossAppeal={handleCancelCrossAppeal}
                                setShowCrossAppealModal={setShowCrossAppealModal}
                                handleToggleNotification={handleToggleNotification}
                                handleCassationDecision={handleCassationDecision}
                                handleClosePleadings={handleClosePleadings}
                                handleReopenPleadings={handleReopenPleadings}
                                handleOpenDefendantCassationAppeal={handleOpenDefendantCassationAppeal}
                                setShowAppealModal={setShowAppealModal}
                                handleDefaultObjection={handleDefaultObjection}
                                handleWaiveObjection={handleWaiveObjection}
                                handleOtherAppeals={handleOtherAppeals}
                                setShowProvisionalOrderModal={setShowProvisionalOrderModal}
                                handleUpdateIncidentalEntryDecision={handleUpdateIncidentalEntryDecision}
                            />

                            {/* ربط الدعاوى — زر التنقل على الإضبارة الطالبة فقط */}
                            <SmartFileCaseLinksSection
                                isCaseLinkViewOnly={isCaseLinkViewOnly}
                                internalCaseLink={internalCaseLink ?? null}
                                externalCaseLinks={externalCaseLinks}
                                primaryCaseNo={primaryCaseNo}
                                onOpenLinkedFile={onOpenLinkedFile}
                                onUnlinkCaseLink={onUnlinkCaseLink}
                            />

                            {/* 2. Incidental Cases — مرحلة البداءة فقط */}
                            <SmartFileIncidentalCasesSection
                                showFirstInstanceIncidentalUi={showFirstInstanceIncidentalUi}
                                incidentalParentLink={incidentalParentLink ?? null}
                                linkedChildIncidentalCases={linkedChildIncidentalCases}
                                externalConsolidationRefs={externalConsolidationRefs}
                                displayStage={displayStage}
                                interactionLocked={interactionLocked}
                                onOpenLinkedFile={onOpenLinkedFile}
                                handleResolveIncidentalCase={handleResolveIncidentalCase}
                            />

                            <SmartFileWorkflowHubsSection
                                showWorkflowSections={showWorkflowSections}
                                showWorkflowPanels={showWorkflowPanels}
                                showSessionHubInStageTools={showSessionHubInStageTools}
                                viewOnlySessionHubVisible={viewOnlySessionHubVisible}
                                isCaseLinkViewOnly={isCaseLinkViewOnly}
                                viewOnlyQuickActionIds={viewOnlyQuickActionIds}
                                quickActionsVariant={quickActionsVariant}
                                displayStage={displayStage}
                                displayTimeline={displayTimeline}
                                firstHearingDate={
                                    typeof file.firstHearingDate === 'string'
                                        ? file.firstHearingDate
                                        : null
                                }
                                editingEvent={editingEvent}
                                setEditingEvent={setEditingEvent}
                                handleQuickAction={handleQuickAction}
                                setIsActionsMenuOpen={setIsActionsMenuOpen}
                                handleAddAction={handleAddAction}
                                setEditingFastTrack={setEditingFastTrack}
                                setShowFastTrackModal={setShowFastTrackModal}
                                setEditingAttachment={setEditingAttachment}
                                setShowAttachmentModal={setShowAttachmentModal}
                                handleSaveFastTrack={handleSaveFastTrack}
                                setShowTaskModal={setShowTaskModal}
                                handleToggleTask={handleToggleTask}
                                handleAppealBriefFile={handleAppealBriefFile}
                                handleAppealBriefOutcome={handleAppealBriefOutcome}
                                handleCorrespondenceResponse={handleCorrespondenceResponse}
                                setEditingTask={setEditingTask}
                            />

                            {/* 7. Timeline - collapsible */}
                            <SmartFileTimelineSection
                                isTimelineExpanded={isTimelineExpanded}
                                setIsTimelineExpanded={setIsTimelineExpanded}
                                timelineEventCount={timelineEventCount}
                                displayTimeline={displayTimeline}
                                interactionLocked={interactionLocked}
                                isCaseLinkViewOnly={isCaseLinkViewOnly}
                                handleDeleteEvent={handleDeleteEvent}
                                handleEditEvent={handleEditEvent}
                                setEditingEvent={setEditingEvent}
                            />
                        </div>

                            <SmartFileStageFooterBar
                            isViewingArchived={interactionLocked}
                            showOpponentAppealBtnEffective={isCaseLinkViewOnly ? false : showOpponentAppealBtnEffective}
                            showAbsentJudgmentFooter={isCaseLinkViewOnly ? false : showAbsentJudgmentFooter}
                            showPostJudgmentAppealFooter={isCaseLinkViewOnly ? false : showPostJudgmentAppealFooter}
                            showAppealStageFooter={isCaseLinkViewOnly ? false : showAppealStageFooter}
                            showPetitionVoidFooter={isCaseLinkViewOnly ? false : showPetitionVoidFooter}
                            displayStage={displayStage}
                            crossAppealEligibility={crossAppealEligibility}
                            setShowCrossAppealModal={setShowCrossAppealModal}
                            petitionVoidFooterPanel={petitionVoidFooterPanel}
                            absentJudgmentFooterPanel={absentJudgmentFooterPanel}
                            opponentAppealFooterPanel={opponentAppealFooterPanel}
                            appealStageFooterPanel={appealStageFooterPanel}
                            postJudgmentAppealFooterPanel={postJudgmentAppealFooterPanel}
                            showPleadingCloseFooter={showPleadingCloseFooter}
                            showFlowStatusFooter={showFlowStatusFooter}
                            flowStatusFooterPanel={flowStatusFooterPanel}
                            setShowJudgmentModal={setShowJudgmentModal}
                            />
        </div>

    );
}
