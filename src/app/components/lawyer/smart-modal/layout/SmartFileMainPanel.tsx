import React from 'react';
import { ArrowRightLeft, ChevronDown, Clock } from 'lucide-react';
import { SmartHeader } from '../parts/SmartHeader';
import { ToDoList } from '../parts/ToDoList';
import { SessionAndRequestsHub } from '../parts/SessionAndRequestsHub';
import { CivilLawReferenceHub } from '../parts/CivilLawReferenceHub';
import { IncidentalCasesManager } from '../parts/IncidentalCasesManager';
import { QuickActions } from '../parts/QuickActions';
import { TimelineFeed } from '../parts/TimelineFeed';
import { storedFastTrackStatus } from '../smartFile/fastTrackStatus';
import { buildSessionRecordPayload, isOpponentProceedingsEvent, isSessionTimelineEvent } from '../smartFile/sessionRecordEngine';
import { pickNonemptyString, readFileDetailsField } from './mainPanel/smartFileMainPanelUtils';
import { useSmartFileMainPanelLayout } from './mainPanel/useSmartFileMainPanelLayout';
import { SmartFileStatusBanners } from './mainPanel/SmartFileStatusBanners';
import { SmartFileAppealDeadlineBanner } from './mainPanel/SmartFileAppealDeadlineBanner';
import { SmartFileStageFooterBar } from './mainPanel/SmartFileStageFooterBar';
import { isCassationStageName } from '../smartFile/judgmentTypes';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PersonalStatusDossierBody } from '@/app/components/lawyer/personal-status/PersonalStatusDossierBody';
export type { SmartFileMainPanelProps } from './mainPanel/smartFileMainPanelTypes';
import type { SmartFileMainPanelProps } from './mainPanel/smartFileMainPanelTypes';

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
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        isPleadingsClosed,
        lastJudgmentType,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        handleResumeAbandonment,
        handleResume,
        handleToggleClient,
        handleStageSelect,
        handleInterruptionToggle,
        handleAbandonment,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
        handleToggleNotification,
        handleCassationDecision,
        handleClosePleadings,
        handleReopenPleadings,
        handleOpenDefendantCassationAppeal,
        handleDefaultObjection,
        handleWaiveObjection,
        handleOtherAppeals,
        onAbsentJudgmentNotification,
        onOpponentAbsentObjection,
        handleExportPDF,
        setShowAppealModal,
        setShowProvisionalOrderModal,
        handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision,
        setShowIncidentalModal,
        setShowDocModal,
        setShowApptModal,
        setIsActionsMenuOpen,
        handleQuickAction,
        setShowPauseModal,
        setShowResumeInterruptionModal,
        setShowNotificationModal,
        setShowPaymentModal,
        setParentData,
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
        handleAddCrossAppeal,
        stepperStages,
        currentStageId,
        onOpenLinkedFile,
    } = p;
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
        showAppealStageFooter,
        showPetitionVoidFooter,
        showPleadingCloseFooter,
        quickActionsVariant,
        absentJudgmentFooterPanel,
        opponentAppealFooterPanel,
        appealStageFooterPanel,
        petitionVoidFooterPanel,
    } = useSmartFileMainPanelLayout(p);

    const isCassationStage = isCassationStageName(displayStage?.stageName);

    if (isPersonalStatusFile(file)) {
        return (
            <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
                <PersonalStatusDossierBody {...p} />
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
                        <div 
                            className="relative z-[1] flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide print:overflow-visible print:max-h-max p-3 pb-2 sm:p-6 pointer-events-auto"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >

                            {/* PRINT HEADER */}
                            <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                                <h1 className="text-2xl font-bold">تقرير حالة دعوى قضائية</h1>
                                <p className="text-sm mt-2">تاريخ الإصدار: {new Date().toLocaleDateString('ar-IQ')}</p>
                            </div>
                            
                            <SmartFileStatusBanners
                                displayStage={displayStage}
                                status={status}
                                isViewingArchived={isViewingArchived}
                                handleResumeAbandonment={handleResumeAbandonment}
                                setShowResumeInterruptionModal={setShowResumeInterruptionModal}
                                handleResume={handleResume}
                            />

                            <SmartHeader 
                                formData={{
                                    ...displayStage,
                                    parties: headerParties,
                                    caseNo: pickNonemptyString(displayStage?.caseNo, primaryCaseNo),
                                    court: pickNonemptyString(
                                        displayStage?.court,
                                        (displayStage as Record<string, unknown> | undefined)?.courtName,
                                        file?.court,
                                        parentData?.court,
                                        readFileDetailsField(file, 'court'),
                                    ),
                                    judge: pickNonemptyString(
                                        displayStage?.judge,
                                        (displayStage as Record<string, unknown> | undefined)?.judgeName,
                                        (displayStage as Record<string, unknown> | undefined)?.judge_name,
                                        file?.judge,
                                        parentData?.judge,
                                        (file as Record<string, unknown> | undefined)?.judgeName,
                                        readFileDetailsField(file, 'judge'),
                                        readFileDetailsField(file, 'judgeName'),
                                        readFileDetailsField(file, 'judge_name'),
                                    ),
                                    docType: primaryDocType,
                                    claimValue: pickNonemptyString(
                                        file?.claimValue,
                                        displayStage?.claimValue,
                                    ),
                                }}
                                caseType={String(file?.type ?? displayStage?.type ?? 'غير محدد')}
                                representedParty={parentData.representedParty}
                                onToggleClient={!isViewingArchived ? handleToggleClient : undefined}
                                incidentalCases={displayStage?.incidentalCases || []}
                                stages={stepperStages}
                                crossAppealEligibility={crossAppealEligibility}
                                currentStageId={currentStageId}
                                onStageClick={handleStageSelect}
                                stageHistory={stages.filter(s => s.status === 'completed' || s.status === 'locked')}
                                isPaused={isPaused}
                                pauseReason={pauseReason}
                                onResume={!isViewingArchived ? handleResume : undefined}
                                onPause={!isViewingArchived ? () => setShowPauseModal(true) : undefined}
                                status={status}
                                isInterrupted={isInterrupted}
                                interruptionData={interruptionData}
                                linkedCaseNo={consolidatedSecondaryLabel || linkedCaseNo}
                                onInterrupt={!isViewingArchived ? handleInterruptionToggle : undefined}
                                onAbandon={!isViewingArchived ? handleAbandonment : undefined}
                                onNotification={!isViewingArchived ? () => setShowNotificationModal(true) : undefined}
                                isReadOnly={isViewingArchived}
                                hasCrossAppeal={displayStage?.hasCrossAppeal}
                                onCancelCrossAppeal={!isViewingArchived ? handleCancelCrossAppeal : undefined}
                                onAddCrossAppeal={
                                    !isViewingArchived && crossAppealEligibility.showButton
                                        ? () => setShowCrossAppealModal(true)
                                        : undefined
                                }
                                notificationStatus={displayStage?.parties?.[1]?.notificationStatus || displayStage?.defendantNotificationStatus}
                                onToggleNotification={!isViewingArchived ? handleToggleNotification : undefined}
                                // Cassation Props
                                onCassationDecision={
                                    !isViewingArchived
                                        ? (type) =>
                                              handleCassationDecision(type as 'ratified' | 'quashed')
                                        : undefined
                                }
                                // Pleadings Lock Props
                                isPleadingsClosed={displayStage?.isPleadingsClosed}
                                wasReopened={displayStage?.wasReopened}
                                onClosePleadings={!isViewingArchived ? handleClosePleadings : undefined}
                                onReopenPleadings={!isViewingArchived ? handleReopenPleadings : undefined}
                                onCassationAppeal={!isViewingArchived ? handleOpenDefendantCassationAppeal : undefined}
                                onRegisterOpponentAppeal={!isViewingArchived ? () => setShowAppealModal(true) : undefined}
                                hasJudgment={Boolean(displayStage?.finalDecision || displayStage?.isPleadingsClosed)}
                                // Default Judgment Props
                                onDefaultObjection={!isViewingArchived ? handleDefaultObjection : undefined}
                                onWaiveObjection={!isViewingArchived ? handleWaiveObjection : undefined}
                                onOtherAppeals={!isViewingArchived ? handleOtherAppeals : undefined}
                                provisionalOrders={displayStage?.provisionalOrders || []}
                                onAddProvisionalOrder={!isViewingArchived ? () => setShowProvisionalOrderModal(true) : undefined}
                                thirdParties={displayStage?.thirdParties || []}
                                onUpdateIncidentalEntryDecision={
                                    !isViewingArchived ? handleUpdateIncidentalEntryDecision : undefined
                                }
                            />
                            
                            <SmartFileAppealDeadlineBanner
                                displayStage={displayStage}
                                showOpponentAppealBtn={showOpponentAppealBtn}
                                showAbsentJudgmentFooter={showAbsentJudgmentFooter}
                            />

                            {/* 2. Incidental Cases — مرحلة البداءة فقط */}
                            {showFirstInstanceIncidentalUi ? (
                                <div className="mt-2 space-y-2">
                                    {incidentalParentLink && onOpenLinkedFile ? (
                                        <button
                                            type="button"
                                            onClick={() => onOpenLinkedFile(incidentalParentLink.parentFileId)}
                                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-3 py-2.5 text-right hover:bg-[#E6C673]/12 transition-colors"
                                        >
                                            <ArrowRightLeft size={14} className="text-[#E6C673] shrink-0" />
                                            <span className="text-xs font-bold text-[#E6C673]">
                                                الانتقال إلى الدعوى الأم ({incidentalParentLink.parentCaseNo || '—'})
                                            </span>
                                        </button>
                                    ) : null}
                                    {internalCaseLink && onOpenLinkedFile ? (
                                        <button
                                            type="button"
                                            onClick={() => onOpenLinkedFile(internalCaseLink.peerFileId!)}
                                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-sky-400/25 bg-sky-400/8 px-3 py-2.5 text-right hover:bg-sky-400/12 transition-colors"
                                        >
                                            <ArrowRightLeft size={14} className="text-sky-300 shrink-0" />
                                            <span className="text-xs font-bold text-sky-200">
                                                الانتقال إلى الدعوى المربوطة ({internalCaseLink.peerCaseNo || '—'})
                                            </span>
                                        </button>
                                    ) : null}
                                    {externalConsolidationRefs.map((ref) => (
                                        <div
                                            key={ref.id}
                                            className="rounded-xl border border-dashed border-teal-400/20 bg-teal-400/5 px-3 py-2.5 text-right"
                                        >
                                            <p className="text-[10px] text-teal-300/70 mb-0.5">
                                                دعوى موحّدة (مرجع — غير موجودة في المخزن)
                                            </p>
                                            <p className="text-xs font-bold text-white/80" dir="ltr">
                                                {ref.caseNo}
                                            </p>
                                            {ref.consolidationDate ? (
                                                <p className="text-[10px] text-white/40 mt-1">
                                                    تاريخ التوحيد: {ref.consolidationDate}
                                                </p>
                                            ) : null}
                                            {ref.reason ? (
                                                <p className="text-[10px] text-white/50 mt-0.5">{ref.reason}</p>
                                            ) : null}
                                        </div>
                                    ))}
                                    {externalCaseLinks.map((link) => (
                                        <div
                                            key={link.id}
                                            className="rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] px-3 py-2.5 text-right"
                                        >
                                            <p className="text-[10px] text-white/45 mb-0.5">دعوى مربوطة (مرجع)</p>
                                            <p className="text-xs font-bold text-white/75">{link.peerCaseNo}</p>
                                            <p className="text-[10px] text-white/40 mt-1">تاريخ الربط: {link.linkDate}</p>
                                            {link.reason ? (
                                                <p className="text-[10px] text-white/50 mt-0.5">{link.reason}</p>
                                            ) : null}
                                        </div>
                                    ))}
                                    {linkedChildIncidentalCases.length > 0 && onOpenLinkedFile
                                        ? linkedChildIncidentalCases.map((linkedCase) => (
                                              <button
                                                  key={linkedCase.id}
                                                  type="button"
                                                  onClick={() => onOpenLinkedFile(linkedCase.linkedFileId!)}
                                                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-3 py-2.5 text-right hover:bg-[#E6C673]/12 transition-colors"
                                              >
                                                  <ArrowRightLeft size={14} className="text-[#E6C673] shrink-0" />
                                                  <span className="text-xs font-bold text-[#E6C673]">
                                                      {linkedCase.type === 'joined'
                                                          ? 'الانتقال إلى الدعوى المنضمة'
                                                          : 'الانتقال إلى الدعوى المتقابلة'}{' '}
                                                      ({linkedCase.linkedCaseNo || '—'})
                                                  </span>
                                              </button>
                                          ))
                                        : null}
                                    <IncidentalCasesManager 
                                        cases={displayStage?.incidentalCases || []} 
                                        onResolve={!isViewingArchived ? handleResolveIncidentalCase : undefined}
                                        onOpenLinkedFile={onOpenLinkedFile}
                                    />
                                </div>
                            ) : null}

                            {/* 4. Quick Actions */}
                            {!isViewingArchived && !isCassationStage && (
                                <div className="print:hidden">
                                    <QuickActions
                                        variant={quickActionsVariant}
                                        onAction={handleQuickAction}
                                        onPause={() => setShowPauseModal(true)}
                                        onOpenLegalActions={() => setIsActionsMenuOpen(true)}
                                    />
                                </div>
                            )}

                            {/* Civil law reference — القضاء المدني فقط */}
                            {!isViewingArchived && !isCassationStage && (
                                <CivilLawReferenceHub readOnly={isViewingArchived} />
                            )}

                            {/* 5. Session record + Requests — فقط أثناء المرافعة المفتوحة */}
                            {!isViewingArchived && !isCassationStage && !displayStage?.isPleadingsClosed && (
                                <SessionAndRequestsHub
                                    readOnly={isViewingArchived}
                                    visualVariant="civil"
                                    timeline={displayTimeline}
                                    editingSessionRecord={
                                        editingEvent
                                            && isSessionTimelineEvent(editingEvent)
                                            && !isOpponentProceedingsEvent(editingEvent)
                                            ? editingEvent
                                            : null
                                    }
                                    onCancelEditSessionRecord={() => setEditingEvent(null)}
                                    onSubmitSessionRecord={(data) => {
                                        handleAddAction(buildSessionRecordPayload(data, data.id));
                                    }}
                                    onAddFastTrack={(preset) => {
                                        setEditingFastTrack(
                                            preset?.requestType
                                                ? { type: preset.requestType, requestType: preset.requestType }
                                                : null,
                                        );
                                        setShowFastTrackModal(true);
                                    }}
                                    petitions={displayStage?.fastTrackPetitions ?? []}
                                    attachments={displayStage?.attachments ?? []}
                                    onEditPetition={(petition) => {
                                        setEditingFastTrack(petition as unknown as Record<string, unknown>);
                                        setShowFastTrackModal(true);
                                    }}
                                    onEditAttachment={(attachment) => {
                                        setEditingAttachment(attachment as unknown as Record<string, unknown>);
                                        setShowAttachmentModal(true);
                                    }}
                                    onResolvePetition={(petition, outcome) => {
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
                                    }}
                                />
                            )}

                            {/* 6. To-Do List - CRITICAL: Display viewedStage tasks - Hide in Cassation OR Pleadings Closed */}
                            {!isViewingArchived && !isCassationStage && !displayStage?.isPleadingsClosed && (
                                <div className="mt-4 pt-1">
                                <ToDoList 
                                    tasks={displayStage?.tasks || []} 
                                    visualVariant="civil"
                                    onAddTask={() => setShowTaskModal(true)}
                                    onToggleTask={handleToggleTask}
                                    onAppealBriefFile={handleAppealBriefFile}
                                    onAppealBriefOutcome={handleAppealBriefOutcome}
                                    onCorrespondenceResponse={handleCorrespondenceResponse}
                                    onEditTask={(task) => setEditingTask(task)}
                                />
                                </div>
                            )}

                            {/* 6. Timeline - collapsible */}
                            <div className="mb-4 print:block">
                                <button
                                    type="button"
                                    onClick={() => setIsTimelineExpanded((v) => !v)}
                                    className="w-full flex items-center justify-between gap-2 pb-2 border-b text-right group/timeline-head print:pointer-events-none border-white/5"
                                    aria-expanded={isTimelineExpanded}
                                >
                                    <span className="text-lg font-bold flex items-center gap-2 min-w-0 text-gray-300">
                                        <Clock size={18} className="shrink-0 text-[#E6C673]" />
                                        السجل الزمني
                                        {timelineEventCount > 0 ? (
                                            <span className="text-[10px] font-bold text-white/40 tabular-nums">
                                                ({timelineEventCount})
                                            </span>
                                        ) : null}
                                    </span>
                                    <ChevronDown
                                        size={18}
                                        className={`shrink-0 transition-transform duration-200 print:hidden ${
                                            isTimelineExpanded ? 'rotate-180' : ''
                                        } text-[#E6C673]/70`}
                                        aria-hidden
                                    />
                                </button>

                                {isTimelineExpanded ? (
                                    <div className="mt-3 print:block">
                                        <TimelineFeed
                                            events={displayTimeline}
                                            visualVariant="civil"
                                            onDelete={!isViewingArchived ? handleDeleteEvent : undefined}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>

                            <SmartFileStageFooterBar
                            isViewingArchived={isViewingArchived}
                            showOpponentAppealBtnEffective={showOpponentAppealBtnEffective}
                            showAbsentJudgmentFooter={showAbsentJudgmentFooter}
                            showAppealStageFooter={showAppealStageFooter}
                            showPetitionVoidFooter={showPetitionVoidFooter}
                            displayStage={displayStage}
                            crossAppealEligibility={crossAppealEligibility}
                            setShowCrossAppealModal={setShowCrossAppealModal}
                            petitionVoidFooterPanel={petitionVoidFooterPanel}
                            absentJudgmentFooterPanel={absentJudgmentFooterPanel}
                            opponentAppealFooterPanel={opponentAppealFooterPanel}
                            appealStageFooterPanel={appealStageFooterPanel}
                            showPleadingCloseFooter={showPleadingCloseFooter}
                            setShowJudgmentModal={setShowJudgmentModal}
                            />
        </div>

    );
}
