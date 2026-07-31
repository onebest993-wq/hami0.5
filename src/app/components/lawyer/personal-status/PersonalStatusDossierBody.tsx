import React from 'react';
import type { SmartFileMainPanelProps } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelTypes';
import { useSmartFileMainPanelLayout } from '@/app/components/lawyer/smart-modal/layout/mainPanel/useSmartFileMainPanelLayout';
import { SmartFileStatusBanners } from '@/app/components/lawyer/smart-modal/layout/mainPanel/SmartFileStatusBanners';
import { SessionAndRequestsHub } from '@/app/components/lawyer/smart-modal/parts/SessionAndRequestsHub';
import { ToDoList } from '@/app/components/lawyer/smart-modal/parts/ToDoList';
import { TimelineFeed } from '@/app/components/lawyer/smart-modal/parts/TimelineFeed';
import { PersonalStatusIdentityFolio } from '@/app/components/lawyer/personal-status/PersonalStatusIdentityFolio';
import { PersonalStatusPleadingActions } from '@/app/components/lawyer/personal-status/PersonalStatusPleadingActions';
import { PersonalStatusActionDock } from '@/app/components/lawyer/personal-status/PersonalStatusActionDock';
import { PersonalStatusPearlSection } from '@/app/components/lawyer/personal-status/PersonalStatusPearlSection';
import { PersonalStatusWaitingSections } from '@/app/components/lawyer/personal-status/PersonalStatusWaitingSections';
import { PersonalStatusStageFooterBar, PersonalStatusOpponentAppealPanel } from '@/app/components/lawyer/personal-status/PersonalStatusStageFooterBar';
import { PersonalStatusCassationOutcomePanel } from '@/app/components/lawyer/personal-status/PersonalStatusCassationOutcomePanel';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PS_BTN_PEARL, PS_PAGE } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import { derivePersonalStatusDossierFlags } from '@/app/components/lawyer/personal-status/usePersonalStatusDossierDerivedState';
import {
    buildPersonalStatusHeaderFormData,
    buildPersonalStatusSessionHubProps,
} from '@/app/components/lawyer/personal-status/buildPersonalStatusDossierProps';
import { Plus } from 'lucide-react';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';

export function PersonalStatusDossierBody(p: SmartFileMainPanelProps) {
    const {
        file,
        status,
        isViewingArchived,
        displayStage,
        displayTimeline,
        parentData,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        handleResumeAbandonment,
        handleResume,
        handleQuickAction,
        setIsActionsMenuOpen,
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
        setShowResumeInterruptionModal,
        handleInterruptionToggle,
        handleAbandonment,
        setShowPauseModal,
        isPaused,
        isInterrupted,
        handleClosePleadings,
        handleReopenPleadings,
        viewingStageIndex,
        activeStageIndex,
        setShowAppealModal,
        setShowJudgmentModal,
        handleCassationDecision,
    } = p;

    const {
        headerParties,
        primaryCaseNo,
        primaryDocType,
        quickActionsVariant,
        showAbsentJudgmentFooter,
        showPetitionVoidFooter,
        absentJudgmentFooterPanel,
        petitionVoidFooterPanel,
    } = useSmartFileMainPanelLayout(p);

    const flags = derivePersonalStatusDossierFlags({
        status,
        isViewingArchived,
        displayStage,
        viewingStageIndex,
        activeStageIndex,
        showAbsentJudgmentFooterFromLayout: showAbsentJudgmentFooter,
        showPetitionVoidFooterFromLayout: showPetitionVoidFooter,
    });

    const headerFormData = buildPersonalStatusHeaderFormData({
        file,
        parentData,
        displayStage,
        headerParties,
        primaryCaseNo,
        primaryDocType,
    });

    const sessionHubProps = buildPersonalStatusSessionHubProps(p, isViewingArchived);

    return (
        <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-[#101018]">
            <div
                className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide px-2.5 pb-28 sm:px-3 sm:pb-32 print:overflow-visible ${PS_PAGE}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="relative z-[1]">
                    <SmartFileStatusBanners
                        displayStage={displayStage}
                        status={status}
                        isViewingArchived={isViewingArchived}
                        handleResumeAbandonment={handleResumeAbandonment}
                        setShowResumeInterruptionModal={setShowResumeInterruptionModal}
                        handleResume={handleResume}
                    />

                    <PersonalStatusIdentityFolio
                        formData={headerFormData}
                        caseType={String(file?.type ?? displayStage?.type ?? 'غير محدد')}
                        file={file}
                        representedParty={parentData.representedParty ?? file?.representedParty}
                    />

                    {!isViewingArchived && !flags.isCassationStage ? (
                        flags.isWaitingView ? (
                            <PersonalStatusWaitingSections
                                timeline={displayTimeline}
                                attachments={displayStage?.attachments ?? []}
                                onAddNote={() => handleQuickAction('note')}
                                onAddDocument={() => handleQuickAction('document')}
                                onEditNote={handleEditEvent}
                                onEditAttachment={(attachment) => {
                                    setEditingAttachment(attachment as unknown as Record<string, unknown>);
                                    setShowAttachmentModal(true);
                                }}
                            />
                        ) : (
                            <div className="grid grid-cols-[3.25rem_1fr] gap-2.5 items-stretch mb-3 print:hidden">
                                <PersonalStatusActionDock
                                    variant={quickActionsVariant}
                                    onAction={handleQuickAction}
                                    onOpenLegalActions={() => setIsActionsMenuOpen(true)}
                                    applicableLaw={file.applicableLaw as PersonalApplicableLaw | '' | undefined}
                                    showLawReference={!isViewingArchived}
                                    caseFlow={{
                                        onInterrupt: handleInterruptionToggle,
                                        onPause: () => setShowPauseModal(true),
                                        onResume: handleResume,
                                        onAbandon: handleAbandonment,
                                        flowStage: displayStage,
                                        isPaused,
                                        isInterrupted,
                                    }}
                                />

                                <div className="flex flex-col gap-2.5 min-w-0 h-full min-h-full">
                                    {flags.showWorkSections ? (
                                        <SessionAndRequestsHub
                                            {...sessionHubProps}
                                            compose="session-only"
                                        />
                                    ) : null}

                                    {flags.showWorkSections ? (
                                        <div className="grid grid-cols-2 gap-2 min-w-0 flex-1 min-h-0 items-stretch">
                                            <PersonalStatusPearlSection
                                                label="طلبات"
                                                variant="beige"
                                                className="h-full flex flex-col"
                                                bodyClassName="flex-1 min-h-0"
                                                action={
                                                    !isViewingArchived ? (
                                                        <button
                                                            type="button"
                                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.requestsHubAdd}
                                                            onClick={() => {
                                                                setEditingFastTrack(null);
                                                                setShowFastTrackModal(true);
                                                            }}
                                                            className={PS_BTN_PEARL}
                                                            title="طلب جديد"
                                                        >
                                                            <Plus size={11} aria-hidden />
                                                        </button>
                                                    ) : null
                                                }
                                            >
                                                <SessionAndRequestsHub
                                                    {...sessionHubProps}
                                                    compose="requests-only"
                                                />
                                            </PersonalStatusPearlSection>

                                            <PersonalStatusPearlSection
                                                label="مهام"
                                                variant="elephant"
                                                className="h-full flex flex-col"
                                                bodyClassName="flex-1 min-h-0"
                                                action={
                                                    <button
                                                        type="button"
                                                        data-testid={CIVIL_LAWSUIT_TEST_IDS.taskAdd}
                                                        onClick={() => setShowTaskModal(true)}
                                                        className={PS_BTN_PEARL}
                                                        title="إضافة مهمة"
                                                    >
                                                        <Plus size={11} aria-hidden />
                                                    </button>
                                                }
                                            >
                                                <ToDoList
                                                    tasks={displayStage?.tasks || []}
                                                    visualVariant="personal-pearl"
                                                    onAddTask={() => setShowTaskModal(true)}
                                                    onToggleTask={handleToggleTask}
                                                    onAppealBriefFile={handleAppealBriefFile}
                                                    onAppealBriefOutcome={handleAppealBriefOutcome}
                                                    onCorrespondenceResponse={handleCorrespondenceResponse}
                                                    onEditTask={(task) => setEditingTask(task)}
                                                />
                                            </PersonalStatusPearlSection>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )
                    ) : null}

                    <PersonalStatusPearlSection
                        label="سجل"
                        variant="glass"
                        className="mb-1 print:block"
                        bodyClassName="p-2 pt-1.5"
                    >
                        <TimelineFeed
                            events={displayTimeline}
                            visualVariant="personal-pearl"
                            onDelete={!isViewingArchived ? handleDeleteEvent : undefined}
                        />
                    </PersonalStatusPearlSection>

                    {flags.showCassationOutcomePanel ? (
                        <div className="sticky bottom-0 z-40 -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] mt-3 border-t border-[#F0A8B4]/22 bg-[#101018]/97 backdrop-blur-xl shadow-[0_-10px_40px_rgba(240,168,180,0.12)] print:hidden">
                            <PersonalStatusCassationOutcomePanel
                                onRatify={() => handleCassationDecision('ratified')}
                                onQuash={() => handleCassationDecision('quashed')}
                            />
                        </div>
                    ) : flags.showPersonalOpponentAppeal ? (
                        <div className="sticky bottom-0 z-40 -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] mt-3 border-t border-[#F0A8B4]/22 bg-[#101018]/97 backdrop-blur-xl shadow-[0_-10px_40px_rgba(240,168,180,0.12)] print:hidden">
                            <PersonalStatusOpponentAppealPanel onRegister={() => setShowAppealModal(true)} />
                        </div>
                    ) : flags.showPersonalPleadingFooter ? (
                        <div className="sticky bottom-0 z-40 -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] mt-3 border-t border-[#F0A8B4]/22 bg-[#101018]/97 backdrop-blur-xl shadow-[0_-10px_40px_rgba(240,168,180,0.12)] print:hidden">
                            <PersonalStatusPleadingActions
                                placement="footer"
                                isPleadingsClosed={displayStage?.isPleadingsClosed}
                                showCloseJudgment={flags.showCloseJudgment}
                                onClosePleadings={
                                    !displayStage?.isPleadingsClosed ? handleClosePleadings : undefined
                                }
                                onReopenPleadings={
                                    displayStage?.isPleadingsClosed ? handleReopenPleadings : undefined
                                }
                                onOpenJudgment={() => setShowJudgmentModal(true)}
                            />
                        </div>
                    ) : null}
                </div>
            </div>

            {flags.showStageFooterBar ? (
                <PersonalStatusStageFooterBar
                    showAbsentJudgmentFooter={showAbsentJudgmentFooter}
                    showPetitionVoidFooter={showPetitionVoidFooter}
                    absentJudgmentFooterPanel={absentJudgmentFooterPanel}
                    petitionVoidFooterPanel={petitionVoidFooterPanel}
                />
            ) : null}
        </div>
    );
}
