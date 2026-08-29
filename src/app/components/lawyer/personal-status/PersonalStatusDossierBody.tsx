import React from 'react';
import type { SmartFileMainPanelProps } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelTypes';
import { useSmartFileMainPanelLayout } from '@/app/components/lawyer/smart-modal/layout/mainPanel/useSmartFileMainPanelLayout';
import { SmartFileStatusBanners } from '@/app/components/lawyer/smart-modal/layout/mainPanel/SmartFileStatusBanners';
import { PersonalStatusDossierPanel } from '@/app/components/lawyer/personal-status/PersonalStatusDossierPanel';
import { PersonalStatusIdentityFolio } from '@/app/components/lawyer/personal-status/PersonalStatusIdentityFolio';
import { PersonalStatusPleadingActions } from '@/app/components/lawyer/personal-status/PersonalStatusPleadingActions';
import { PersonalStatusWaitingSections } from '@/app/components/lawyer/personal-status/PersonalStatusWaitingSections';
import { PersonalStatusStageFooterBar, PersonalStatusOpponentAppealPanel, FOOTER_SHELL } from '@/app/components/lawyer/personal-status/PersonalStatusStageFooterBar';
import { PersonalStatusCassationOutcomePanel } from '@/app/components/lawyer/personal-status/PersonalStatusCassationOutcomePanel';
import type { PersonalApplicableLaw } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { PS_PAGE } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import { derivePersonalStatusDossierFlags } from '@/app/components/lawyer/personal-status/usePersonalStatusDossierDerivedState';
import { buildPersonalStatusHeaderFormData } from '@/app/components/lawyer/personal-status/buildPersonalStatusDossierProps';
import { CaseLinkUnlinkButton } from '@/app/components/lawyer/smart-modal/parts/CaseLinkUnlinkButton';

export function PersonalStatusDossierBody(p: SmartFileMainPanelProps) {
    const {
        file,
        status,
        isViewingArchived,
        displayStage,
        displayTimeline,
        parentData,
        stages,
        onAbsentJudgmentNotification,
        onOpponentAbsentObjection,
        setShowDocModal,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        setShowPauseResumeModal,
        setShowAbandonmentRenewalModal,
        interruptionData,
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
        isCaseLinkViewOnly,
        onOpenLinkedFile,
        onUnlinkCaseLink,
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
        showOpponentAppealBtnEffective,
        internalCaseLink,
        externalCaseLinks,
    } = useSmartFileMainPanelLayout(p);

    const interactionLocked = isViewingArchived || Boolean(isCaseLinkViewOnly);

    const flags = derivePersonalStatusDossierFlags({
        status,
        isViewingArchived,
        isCaseLinkViewOnly: Boolean(isCaseLinkViewOnly),
        displayStage,
        viewingStageIndex,
        activeStageIndex,
        representedParty: parentData.representedParty,
        showAbsentJudgmentFooterFromLayout: showAbsentJudgmentFooter,
        showPetitionVoidFooterFromLayout: showPetitionVoidFooter,
        showOpponentAppealBtnEffectiveFromLayout: showOpponentAppealBtnEffective,
    });

    const headerFormData = buildPersonalStatusHeaderFormData({
        file,
        parentData,
        displayStage,
        headerParties,
        primaryCaseNo,
        primaryDocType,
    });

    return (
        <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-[#0B1021]">
            <div
                className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide px-2 pb-2 print:overflow-visible ${PS_PAGE}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="relative z-[1]">
                    <SmartFileStatusBanners
                        displayStage={displayStage}
                        status={status}
                        interruptionData={interruptionData}
                    />

                    <PersonalStatusIdentityFolio
                        formData={headerFormData}
                        caseType={String(file?.type ?? displayStage?.type ?? 'غير محدد')}
                        file={file}
                        representedParty={parentData.representedParty ?? file?.representedParty}
                    />

                    {!isCaseLinkViewOnly && internalCaseLink && onOpenLinkedFile ? (
                        <div
                            className="mb-1.5 flex flex-wrap items-center gap-1.5 border-b border-white/[0.07] pb-1.5 print:hidden"
                            dir="rtl"
                        >
                            <div className="min-w-0 flex-1 text-right">
                                <p className="text-[10px] font-bold text-white/40">إضبارة مربوطة</p>
                                <p className="text-[12px] font-semibold text-white/88 truncate">
                                    {internalCaseLink.peerCaseNo || '—'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (
                                            internalCaseLink.peerDossierKind === 'criminal' &&
                                            internalCaseLink.peerCriminalId
                                        ) {
                                            onOpenLinkedFile(0, internalCaseLink.peerCriminalId);
                                            return;
                                        }
                                        if (internalCaseLink.peerFileId != null) {
                                            onOpenLinkedFile(internalCaseLink.peerFileId);
                                        }
                                    }}
                                    className="rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold text-white/85 hover:bg-white/[0.07] transition-colors touch-manipulation min-h-[44px]"
                                >
                                    اطلاع
                                </button>
                                {onUnlinkCaseLink ? (
                                    <CaseLinkUnlinkButton
                                        peerCaseNo={internalCaseLink.peerCaseNo}
                                        originCaseNo={primaryCaseNo}
                                        peerFileId={internalCaseLink.peerFileId}
                                        peerCriminalId={internalCaseLink.peerCriminalId}
                                        onConfirm={onUnlinkCaseLink}
                                        compact
                                        label="فك الربط"
                                        className="flex items-center justify-center gap-1 rounded-lg border border-rose-400/28 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-bold text-rose-100 hover:bg-rose-500/15 touch-manipulation min-h-[44px]"
                                    />
                                ) : null}
                            </div>
                        </div>
                    ) : externalCaseLinks.length > 0 ? (
                        <div className="mb-3 flex flex-wrap gap-2 print:hidden">
                            {externalCaseLinks.map((link) => (
                                <div
                                    key={link.id}
                                    className="inline-flex min-w-[10rem] max-w-xs flex-col rounded-lg border border-dashed border-white/[0.14] bg-white/[0.03] px-3 py-1.5 text-right"
                                >
                                    <p className="text-[11px] font-bold text-[#C9B89A]">دعوى مربوطة</p>
                                    <p className="text-[13px] font-bold text-[#FFFEF9] truncate">
                                        {link.peerCaseNo}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {!isViewingArchived && !flags.isCassationStage ? (
                        flags.isWaitingView ? (
                            <PersonalStatusWaitingSections
                                timeline={displayTimeline}
                                attachments={displayStage?.attachments ?? []}
                                onAddNote={
                                    interactionLocked ? undefined : () => handleQuickAction('note')
                                }
                                onAddDocument={
                                    interactionLocked
                                        ? undefined
                                        : () => handleQuickAction('document')
                                }
                                onEditNote={interactionLocked ? undefined : handleEditEvent}
                                onEditAttachment={
                                    interactionLocked
                                        ? undefined
                                        : (attachment) => {
                                              setEditingAttachment(
                                                  attachment as unknown as Record<string, unknown>,
                                              );
                                              setShowAttachmentModal(true);
                                          }
                                }
                            />
                        ) : null
                    ) : null}

                    <PersonalStatusDossierPanel
                        p={p}
                        displayTimeline={displayTimeline}
                        isViewingArchived={isViewingArchived}
                        interactionLocked={interactionLocked}
                        displayStage={displayStage}
                        quickActionsVariant={quickActionsVariant as 'full' | 'notes-only'}
                        showWorkToolbar={
                            !interactionLocked &&
                            !flags.isCassationStage &&
                            flags.showWorkSections &&
                            !flags.isWaitingView
                        }
                        onOpenLegalActions={
                            interactionLocked ? () => undefined : () => setIsActionsMenuOpen(true)
                        }
                        applicableLaw={file.applicableLaw as PersonalApplicableLaw | '' | undefined}
                        caseFlow={{
                            onInterrupt: interactionLocked ? undefined : handleInterruptionToggle,
                            onPause: interactionLocked ? undefined : () => setShowPauseModal(true),
                            onResume: interactionLocked
                                ? undefined
                                : () => setShowPauseResumeModal(true),
                            onAbandon: interactionLocked ? undefined : handleAbandonment,
                            flowStage: displayStage,
                            isPaused,
                            isInterrupted,
                        }}
                    />

                </div>
            </div>

            {flags.showCassationOutcomePanel ? (
                <div className={FOOTER_SHELL}>
                    <PersonalStatusCassationOutcomePanel
                        onRatify={() => handleCassationDecision('ratified')}
                        onQuash={() => handleCassationDecision('quashed')}
                    />
                </div>
            ) : flags.showPersonalOpponentAppeal ? (
                <div className={FOOTER_SHELL}>
                    <PersonalStatusOpponentAppealPanel onRegister={() => setShowAppealModal(true)} />
                </div>
            ) : flags.showPersonalPleadingFooter ? (
                <div className={FOOTER_SHELL}>
                    <PersonalStatusPleadingActions
                        placement="footer"
                        isPleadingsClosed={displayStage?.isPleadingsClosed}
                        showCloseJudgment={flags.showCloseJudgment}
                        onClosePleadings={
                            interactionLocked || displayStage?.isPleadingsClosed
                                ? undefined
                                : handleClosePleadings
                        }
                        onReopenPleadings={
                            interactionLocked || !displayStage?.isPleadingsClosed
                                ? undefined
                                : handleReopenPleadings
                        }
                        onOpenJudgment={() => setShowJudgmentModal(true)}
                    />
                </div>
            ) : null}

            {flags.showStageFooterBar ? (
                <PersonalStatusStageFooterBar
                    showAbsentJudgmentFooter={flags.showAbsentJudgmentFooter}
                    showPetitionVoidFooter={flags.showPetitionVoidFooter}
                    absentJudgmentFooterPanel={absentJudgmentFooterPanel}
                    petitionVoidFooterPanel={petitionVoidFooterPanel}
                />
            ) : null}
        </div>
    );
}
