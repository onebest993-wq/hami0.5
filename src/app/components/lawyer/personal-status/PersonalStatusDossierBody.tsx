// @ts-nocheck
import React, { Suspense } from 'react';
import type { SmartFileMainPanelProps } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelTypes';
import { useSmartFileMainPanelLayout } from '@/app/components/lawyer/smart-modal/layout/mainPanel/useSmartFileMainPanelLayout';
import { SmartFileStatusBanners } from '@/app/components/lawyer/smart-modal/layout/mainPanel/SmartFileStatusBanners';
import { isCassationStageName, shouldShowOpponentAppealRegisterButton } from '@/app/components/lawyer/smart-modal/smartFile/judgmentTypes';
import { shouldShowAbsentJudgmentFooter, isAbsentObjectionStageName } from '@/app/components/lawyer/smart-modal/smartFile/absentJudgmentFlow';
import {
    isPersonalStatusCoreStage,
    shouldShowPersonalStatusCassationOutcomePanel,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { PersonalStatusCassationOutcomePanel } from '@/app/components/lawyer/personal-status/PersonalStatusCassationOutcomePanel';
import { buildSessionRecordPayload, isOpponentProceedingsEvent, isSessionTimelineEvent } from '@/app/components/lawyer/smart-modal/smartFile/sessionRecordEngine';
import { storedFastTrackStatus } from '@/app/components/lawyer/smart-modal/smartFile/fastTrackStatus';
import { pickNonemptyString, readFileDetailsField } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelUtils';
import {
    LazySessionAndRequestsHub,
    LazyToDoList,
    LazyTimelineFeed,
} from '@/app/components/lawyer/smart-modal/lazySmartFileModalWidgets';
import { PersonalStatusIdentityFolio } from '@/app/components/lawyer/personal-status/PersonalStatusIdentityFolio';
import { PersonalStatusPleadingActions } from '@/app/components/lawyer/personal-status/PersonalStatusPleadingActions';
import { PersonalStatusActionDock } from '@/app/components/lawyer/personal-status/PersonalStatusActionDock';
import { PersonalStatusPearlSection } from '@/app/components/lawyer/personal-status/PersonalStatusPearlSection';
import { PersonalStatusWaitingSections } from '@/app/components/lawyer/personal-status/PersonalStatusWaitingSections';
import { PersonalStatusStageFooterBar, PersonalStatusOpponentAppealPanel } from '@/app/components/lawyer/personal-status/PersonalStatusStageFooterBar';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PS_BTN_PEARL, PS_PAGE } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
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

    const isCassationStage = isCassationStageName(displayStage?.stageName);
    const isWaitingView =
        !isViewingArchived && !isCassationStage && Boolean(displayStage?.isPleadingsClosed);
    const showPersonalOpponentAppeal =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        Boolean(displayStage?.isPleadingsClosed) &&
        isPersonalStatusCoreStage(displayStage?.stageName) &&
        !shouldShowAbsentJudgmentFooter(displayStage) &&
        (
            shouldShowOpponentAppealRegisterButton(
                {
                    finalDecision: displayStage?.finalDecision,
                    isPleadingsClosed: displayStage?.isPleadingsClosed,
                    appealDeadline: displayStage?.appealDeadline,
                    wasReopened: displayStage?.wasReopened,
                    awaitingOpponentAppeal: displayStage?.awaitingOpponentAppeal,
                    stageName: displayStage?.stageName,
                    status: displayStage?.status,
                },
                status,
            )
            || (String(status).includes('بانتظار') && Boolean(displayStage?.finalDecision))
        );
    const showWorkSections = !isViewingArchived && !isCassationStage && !displayStage?.isPleadingsClosed;
    const showPleadingControls = !isViewingArchived && !isCassationStage;
    const showPersonalPleadingFooter =
        showPleadingControls &&
        !showPersonalOpponentAppeal &&
        !showAbsentJudgmentFooter &&
        !showPetitionVoidFooter;
    const showCloseJudgment =
        showPleadingControls &&
        (!displayStage?.isPleadingsClosed ||
            Boolean(displayStage?.isUnderObjection) ||
            isAbsentObjectionStageName(displayStage?.stageName));

    const showStageFooterBar =
        isViewingArchived || showAbsentJudgmentFooter || showPetitionVoidFooter;
    const showCassationOutcomePanel = shouldShowPersonalStatusCassationOutcomePanel({
        stage: displayStage,
        isViewingArchived,
        viewingStageIndex,
        activeStageIndex,
    });

    const headerFormData = {
        ...displayStage,
        parties: headerParties,
        caseNo: primaryCaseNo,
        court: pickNonemptyString(
            file?.court,
            parentData?.court,
            readFileDetailsField(file, 'court'),
            displayStage?.court,
        ),
        judge: pickNonemptyString(
            file?.judge,
            parentData?.judge,
            (file as Record<string, unknown> | undefined)?.judgeName,
            readFileDetailsField(file, 'judge'),
            readFileDetailsField(file, 'judgeName'),
            readFileDetailsField(file, 'judge_name'),
            displayStage?.judge,
            (displayStage as Record<string, unknown> | undefined)?.judgeName,
            (displayStage as Record<string, unknown> | undefined)?.judge_name,
        ),
        docType: primaryDocType,
    };

    const sessionHubProps = {
        readOnly: isViewingArchived,
        visualVariant: 'personal' as const,
        layoutMode: 'personal-pearl' as const,
        timeline: displayTimeline,
        editingSessionRecord:
            editingEvent && isSessionTimelineEvent(editingEvent) && !isOpponentProceedingsEvent(editingEvent)
                ? editingEvent
                : null,
        onCancelEditSessionRecord: () => setEditingEvent(null),
        onSubmitSessionRecord: (data: Parameters<typeof buildSessionRecordPayload>[0] & { id?: string }) => {
            handleAddAction(buildSessionRecordPayload(data, data.id));
        },
        onAddFastTrack: (preset?: { requestType?: string }) => {
            setEditingFastTrack(
                preset?.requestType ? { type: preset.requestType, requestType: preset.requestType } : null,
            );
            setShowFastTrackModal(true);
        },
        petitions: displayStage?.fastTrackPetitions ?? [],
        attachments: displayStage?.attachments ?? [],
        onEditPetition: (petition: { id: string; requestType?: string; type?: string; subject?: string; reason?: string; submissionDate?: string; requestDate?: string }) => {
            setEditingFastTrack(petition as unknown as Record<string, unknown>);
            setShowFastTrackModal(true);
        },
        onEditAttachment: (attachment: Record<string, unknown>) => {
            setEditingAttachment(attachment);
            setShowAttachmentModal(true);
        },
        onResolvePetition: (
            petition: { id: string; requestType?: string; type?: string; subject?: string; reason?: string; submissionDate?: string; requestDate?: string },
            outcome: 'accepted' | 'rejected',
        ) => {
            handleSaveFastTrack({
                id: petition.id,
                type: petition.requestType || petition.type || '',
                requestType: petition.requestType || petition.type || '',
                reason: petition.subject || petition.reason || '',
                subject: petition.subject || petition.reason || '',
                requestDate: petition.submissionDate || petition.requestDate || '',
                submissionDate: petition.submissionDate || petition.requestDate || '',
                status: storedFastTrackStatus(outcome),
                notes: '',
            });
        },
    };

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

                <Suspense fallback={null}>
                    <PersonalStatusIdentityFolio
                        formData={headerFormData}
                        caseType={String(file?.type ?? displayStage?.type ?? 'غير محدد')}
                        file={file}
                    />
                </Suspense>

                {!isViewingArchived && !isCassationStage ? (
                    isWaitingView ? (
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
                            {showWorkSections ? (
                                <Suspense fallback={null}>
                                    <LazySessionAndRequestsHub
                                        {...sessionHubProps}
                                        compose="session-only"
                                    />
                                </Suspense>
                            ) : null}

                            {showWorkSections ? (
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
                                        <Suspense fallback={null}>
                                            <LazySessionAndRequestsHub
                                                {...sessionHubProps}
                                                compose="requests-only"
                                            />
                                        </Suspense>
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
                                        <Suspense fallback={null}>
                                            <LazyToDoList
                                                tasks={displayStage?.tasks || []}
                                                visualVariant="personal-pearl"
                                                onAddTask={() => setShowTaskModal(true)}
                                                onToggleTask={handleToggleTask}
                                                onAppealBriefFile={handleAppealBriefFile}
                                                onAppealBriefOutcome={handleAppealBriefOutcome}
                                                onCorrespondenceResponse={handleCorrespondenceResponse}
                                                onEditTask={(task) => setEditingTask(task)}
                                            />
                                        </Suspense>
                                    </PersonalStatusPearlSection>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    )
                ) : null}

                <PersonalStatusPearlSection label="سجل" variant="glass" className="mb-1 print:block" bodyClassName="p-2 pt-1.5">
                    <Suspense fallback={null}>
                        <LazyTimelineFeed
                            events={displayTimeline}
                            visualVariant="personal-pearl"
                            onDelete={!isViewingArchived ? handleDeleteEvent : undefined}
                            onEdit={!isViewingArchived ? handleEditEvent : undefined}
                        />
                    </Suspense>
                </PersonalStatusPearlSection>

                {showCassationOutcomePanel ? (
                    <div className="sticky bottom-0 z-40 -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] mt-3 border-t border-[#F0A8B4]/22 bg-[#101018]/97 backdrop-blur-xl shadow-[0_-10px_40px_rgba(240,168,180,0.12)] print:hidden">
                        <PersonalStatusCassationOutcomePanel
                            onRatify={() => handleCassationDecision('ratified')}
                            onQuash={() => handleCassationDecision('quashed')}
                        />
                    </div>
                ) : showPersonalOpponentAppeal ? (
                    <div className="sticky bottom-0 z-40 -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] mt-3 border-t border-[#F0A8B4]/22 bg-[#101018]/97 backdrop-blur-xl shadow-[0_-10px_40px_rgba(240,168,180,0.12)] print:hidden">
                        <PersonalStatusOpponentAppealPanel onRegister={() => setShowAppealModal(true)} />
                    </div>
                ) : showPersonalPleadingFooter ? (
                    <div className="sticky bottom-0 z-40 -mx-2.5 sm:-mx-3 px-2.5 sm:px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] mt-3 border-t border-[#F0A8B4]/22 bg-[#101018]/97 backdrop-blur-xl shadow-[0_-10px_40px_rgba(240,168,180,0.12)] print:hidden">
                        <PersonalStatusPleadingActions
                            placement="footer"
                            isPleadingsClosed={displayStage?.isPleadingsClosed}
                            showCloseJudgment={showCloseJudgment}
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

            {showStageFooterBar ? (
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
