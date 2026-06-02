import React, { Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import type { CaseStage, IncidentalCase, Task, TimelineEvent } from '../../LawyerShared';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import type { JudgmentPayload } from '../smartFile/judgmentTypes';
import type { SmartFileCaseFormData } from '../smartFile/modalFormTypes';

/** Legacy modal widgets expect string party ids; CaseStage uses numeric Party.id. */
function partiesForLegacyModals(
    parties: CaseStage['parties'] | undefined,
): Array<{ id: string; name: string; role?: string; isClient?: boolean }> {
    return (parties ?? []).map((p) => ({
        id: String(p.id),
        name: p.name,
        role: p.role,
        isClient: p.isClient,
    }));
}
import {
    LazyAddActionModal,
    LazyAddAppointmentModal,
    LazyAddDocumentModal,
    LazyAddIncidentalCaseModal,
    LazyAddNoteModal,
    LazyAddPaymentModal,
    LazyAddProvisionalOrderModal,
    LazyAddTaskModal,
    LazyAppealRegistrationModal,
    LazyAppealTransitionModal,
    LazyAttachmentShieldModal,
    LazyAttorneyResignationModal,
    LazyCaseConsolidationModal,
    LazyCrossAppealModal,
    LazyEditCaseInfoModal,
    LazyExecutionTransferModal,
    LazyExtraordinaryAppealModal,
    LazyFastTrackModal,
    LazyInterlocutoryAppealModal,
    LazyInterruptionModal,
    LazyJudgeRecusalModal,
    LazyJudicialNotificationModal,
    LazyMaterialErrorCorrectionModal,
    LazyObjectionJudgmentModal,
    LazyObjectionRegistrationModal,
    LazyPauseCaseModal,
    LazyResumeInterruptionModal,
    LazySmartJudgmentModal,
    LazyTrashModal,
    LazyTransferJurisdictionModal,
} from '../lazySmartFileModalChunks';
import { LazyLegalActionsMenu } from '../lazySmartFileModalWidgets';

const MODAL_LAZY_FALLBACK = null;

export type SmartFileModalsPortalProps = {
    isViewingArchived: boolean;
    isActionsMenuOpen: boolean;
    setIsActionsMenuOpen: (v: boolean) => void;
    isPaused: boolean;
    isInterrupted: boolean;
    isTrashOpen: boolean;
    setIsTrashOpen: (v: boolean) => void;
    showEditInfoModal: boolean;
    setShowEditInfoModal: (v: boolean) => void;
    showTaskModal: boolean;
    setShowTaskModal: (v: boolean) => void;
    showDocModal: boolean;
    setShowDocModal: (v: boolean) => void;
    showNoteModal: boolean;
    setShowNoteModal: (v: boolean) => void;
    showPaymentModal: boolean;
    setShowPaymentModal: (v: boolean) => void;
    showIncidentalModal: boolean;
    setShowIncidentalModal: (v: boolean) => void;
    showFastTrackModal: boolean;
    setShowFastTrackModal: (v: boolean) => void;
    showAttachmentModal: boolean;
    setShowAttachmentModal: (v: boolean) => void;
    showActionModal: boolean;
    setShowActionModal: (v: boolean) => void;
    showApptModal: boolean;
    setShowApptModal: (v: boolean) => void;
    showPauseModal: boolean;
    setShowPauseModal: (v: boolean) => void;
    showInterruptionModal: boolean;
    setShowInterruptionModal: (v: boolean) => void;
    showResumeInterruptionModal: boolean;
    setShowResumeInterruptionModal: (v: boolean) => void;
    showInterlocutoryModal: boolean;
    setShowInterlocutoryModal: (v: boolean) => void;
    showObjectionRegistrationModal: boolean;
    setShowObjectionRegistrationModal: (v: boolean) => void;
    showObjectionJudgmentModal: boolean;
    setShowObjectionJudgmentModal: (v: boolean) => void;
    showJudgmentModal: boolean;
    setShowJudgmentModal: (v: boolean) => void;
    showAppealModal: boolean;
    setShowAppealModal: (v: boolean) => void;
    showAppealTransitionModal: boolean;
    setShowAppealTransitionModal: (v: boolean) => void;
    showCrossAppealModal: boolean;
    setShowCrossAppealModal: (v: boolean) => void;
    showProvisionalOrderModal: boolean;
    setShowProvisionalOrderModal: (v: boolean) => void;
    showNotificationModal: boolean;
    setShowNotificationModal: (v: boolean) => void;
    showExtraordinaryAppealModal: boolean | string;
    setShowExtraordinaryAppealModal: (v: boolean | string) => void;
    showMaterialErrorModal: string | null;
    setShowMaterialErrorModal: (v: string | null) => void;
    showJudgeRecusalModal: boolean;
    setShowJudgeRecusalModal: (v: boolean) => void;
    showTransferJurisdictionModal: boolean;
    setShowTransferJurisdictionModal: (v: boolean) => void;
    showCaseConsolidationModal: boolean;
    setShowCaseConsolidationModal: (v: boolean) => void;
    showAttorneyResignationModal: boolean;
    setShowAttorneyResignationModal: (v: boolean) => void;
    showExecutionTransferModal: boolean;
    setShowExecutionTransferModal: (v: boolean) => void;
    editingEvent: TimelineEvent | null;
    setEditingEvent: (e: TimelineEvent | null) => void;
    editingTask: Task | null;
    setEditingTask: (t: Task | null) => void;
    editingIncidental: IncidentalCase | null;
    setEditingIncidental: (c: IncidentalCase | null) => void;
    editingFastTrack: Record<string, unknown> | null;
    setEditingFastTrack: (v: Record<string, unknown> | null) => void;
    editingAttachment: Record<string, unknown> | null;
    setEditingAttachment: (v: Record<string, unknown> | null) => void;
    tempJudgmentData: JudgmentPayload | null;
    setTempJudgmentData: (v: JudgmentPayload | null) => void;
    pauseReason: string;
    linkedCaseNo: string;
    interruptionData: Record<string, unknown> | null;
    deletedEvents: TimelineEvent[];
    displayStage: CaseStage;
    currentStage: CaseStage;
    parentData: SmartFileParentData;
    displayStageName?: string;
    handlers: Record<string, (...args: unknown[]) => void>;
};

export function SmartFileModalsPortal(props: SmartFileModalsPortalProps) {
    const {
        isViewingArchived,
        isActionsMenuOpen,
        setIsActionsMenuOpen,
        isPaused,
        isInterrupted,
        isTrashOpen,
        setIsTrashOpen,
        showEditInfoModal,
        setShowEditInfoModal,
        showTaskModal,
        setShowTaskModal,
        showDocModal,
        setShowDocModal,
        showNoteModal,
        setShowNoteModal,
        showPaymentModal,
        setShowPaymentModal,
        showIncidentalModal,
        setShowIncidentalModal,
        showFastTrackModal,
        setShowFastTrackModal,
        showAttachmentModal,
        setShowAttachmentModal,
        showActionModal,
        setShowActionModal,
        showApptModal,
        setShowApptModal,
        showPauseModal,
        setShowPauseModal,
        showInterruptionModal,
        setShowInterruptionModal,
        showResumeInterruptionModal,
        setShowResumeInterruptionModal,
        showInterlocutoryModal,
        setShowInterlocutoryModal,
        showObjectionRegistrationModal,
        setShowObjectionRegistrationModal,
        showObjectionJudgmentModal,
        setShowObjectionJudgmentModal,
        showJudgmentModal,
        setShowJudgmentModal,
        showAppealModal,
        setShowAppealModal,
        showAppealTransitionModal,
        setShowAppealTransitionModal,
        showCrossAppealModal,
        setShowCrossAppealModal,
        showProvisionalOrderModal,
        setShowProvisionalOrderModal,
        showNotificationModal,
        setShowNotificationModal,
        showExtraordinaryAppealModal,
        setShowExtraordinaryAppealModal,
        showMaterialErrorModal,
        setShowMaterialErrorModal,
        showJudgeRecusalModal,
        setShowJudgeRecusalModal,
        showTransferJurisdictionModal,
        setShowTransferJurisdictionModal,
        showCaseConsolidationModal,
        setShowCaseConsolidationModal,
        showAttorneyResignationModal,
        setShowAttorneyResignationModal,
        showExecutionTransferModal,
        setShowExecutionTransferModal,
        editingEvent,
        setEditingEvent,
        editingTask,
        setEditingTask,
        editingIncidental,
        setEditingIncidental,
        editingFastTrack,
        setEditingFastTrack,
        editingAttachment,
        setEditingAttachment,
        tempJudgmentData,
        setTempJudgmentData,
        pauseReason,
        linkedCaseNo,
        interruptionData,
        deletedEvents,
        displayStage,
        currentStage,
        parentData,
        handlers: h,
    } = props;

    return (
        <AnimatePresence>
            <Suspense fallback={null} key="actions-menu-suspense">
                <LazyLegalActionsMenu
                    isOpen={isActionsMenuOpen}
                    onClose={() => setIsActionsMenuOpen(false)}
                    onNotification={!isViewingArchived ? () => setShowNotificationModal(true) : undefined}
                    onAddProvisionalOrder={!isViewingArchived ? () => setShowProvisionalOrderModal(true) : undefined}
                    onAbandon={!isViewingArchived ? h.handleAbandonment : undefined}
                    onInterrupt={!isViewingArchived ? h.handleInterruptionToggle : undefined}
                    onPause={!isViewingArchived ? () => setShowPauseModal(true) : undefined}
                    onResume={!isViewingArchived ? h.handleResume : undefined}
                    isPaused={isPaused}
                    isInterrupted={isInterrupted}
                    onAction={h.handleQuickAction}
                    onAddSessionRecord={() => setShowActionModal(true)}
                    currentStageName={displayStage?.stageName}
                />
            </Suspense>
            <Suspense fallback={MODAL_LAZY_FALLBACK} key="modals-suspense">
                {showEditInfoModal && (
                    <LazyEditCaseInfoModal
                        key="edit-info"
                        isOpen={showEditInfoModal}
                        onClose={() => setShowEditInfoModal(false)}
                        formData={{
                            ...(displayStage as unknown as SmartFileCaseFormData),
                            docType: parentData.docType || displayStage.type,
                            representedParty: parentData.representedParty,
                        }}
                        onSave={h.handleUpdateCaseInfo}
                    />
                )}
                {showTaskModal && (
                    <LazyAddTaskModal
                        key="add-task"
                        isOpen={showTaskModal}
                        onClose={() => {
                            setShowTaskModal(false);
                            setEditingTask(null);
                        }}
                        onAdd={h.handleAddTask}
                        editMode={!!editingTask}
                        editData={editingTask}
                    />
                )}
                {showDocModal && (
                    <LazyAddDocumentModal
                        key="add-doc"
                        isOpen={showDocModal}
                        onClose={() => {
                            setShowDocModal(false);
                            setEditingEvent(null);
                        }}
                        onAdd={h.handleAddDoc}
                        editMode={!!editingEvent}
                        editData={editingEvent}
                    />
                )}
                {showNoteModal && (
                    <LazyAddNoteModal
                        key="add-note"
                        isOpen={showNoteModal}
                        onClose={() => {
                            setShowNoteModal(false);
                            setEditingEvent(null);
                        }}
                        onAdd={h.handleAddNote}
                        editMode={!!editingEvent}
                        editData={editingEvent}
                    />
                )}
                {showPaymentModal && (
                    <LazyAddPaymentModal
                        key="add-payment"
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        onAdd={h.handleAddPayment}
                    />
                )}
                {showIncidentalModal && (
                    <LazyAddIncidentalCaseModal
                        key="add-incidental"
                        isOpen={showIncidentalModal}
                        onClose={() => {
                            setShowIncidentalModal(false);
                            setEditingIncidental(null);
                        }}
                        onAdd={h.handleAddIncidentalCase}
                        currentStage={currentStage}
                        editMode={!!editingIncidental}
                        editData={editingIncidental ?? undefined}
                    />
                )}
                {showFastTrackModal && (
                    <LazyFastTrackModal
                        key="fast-track"
                        isOpen={showFastTrackModal}
                        onClose={() => {
                            setShowFastTrackModal(false);
                            setEditingFastTrack(null);
                        }}
                        onSave={h.handleSaveFastTrack}
                        editMode={!!editingFastTrack}
                        editData={editingFastTrack as never}
                    />
                )}
                {showAttachmentModal && (
                    <LazyAttachmentShieldModal
                        key="attachment-shield"
                        isOpen={showAttachmentModal}
                        onClose={() => {
                            setShowAttachmentModal(false);
                            setEditingAttachment(null);
                        }}
                        onSave={h.handleSaveAttachment}
                        editMode={!!editingAttachment}
                        editData={editingAttachment as never}
                    />
                )}
                {showActionModal && (
                    <LazyAddActionModal
                        key="add-action"
                        isOpen={showActionModal}
                        onClose={() => {
                            setShowActionModal(false);
                            setEditingEvent(null);
                        }}
                        onAdd={h.handleAddAction}
                        editMode={!!editingEvent}
                        editData={editingEvent}
                    />
                )}
                {showApptModal && (
                    <LazyAddAppointmentModal
                        key="add-appt"
                        isOpen={showApptModal}
                        onClose={() => {
                            setShowApptModal(false);
                            setEditingEvent(null);
                        }}
                        onAdd={h.handleAddAppointment}
                        editMode={!!editingEvent}
                        editData={editingEvent}
                    />
                )}
                {showPauseModal && (
                    <LazyPauseCaseModal
                        key="pause-case"
                        isOpen={showPauseModal}
                        onClose={() => {
                            setShowPauseModal(false);
                            setEditingEvent(null);
                        }}
                        onConfirm={h.handlePauseConfirm}
                        editMode={!!editingEvent}
                        editData={
                            editingEvent
                                ? {
                                      id: editingEvent.id,
                                      reason: editingEvent.details?.split('\n\n🔗')[0] || pauseReason,
                                      linkedCaseNo: editingEvent.details?.split('رقم: ')[1] || linkedCaseNo,
                                  }
                                : undefined
                        }
                    />
                )}
                {showInterruptionModal && (
                    <LazyInterruptionModal
                        key="interruption"
                        isOpen={showInterruptionModal}
                        onClose={() => {
                            setShowInterruptionModal(false);
                            setEditingEvent(null);
                        }}
                        onConfirm={h.handleInterruptionConfirm}
                        currentParties={partiesForLegacyModals(currentStage.parties)}
                        editMode={!!editingEvent}
                        editData={
                            editingEvent
                                ? {
                                      id: editingEvent.id,
                                      reason: String(
                                          editingEvent.details?.match(/السبب القانوني: (.*)\n/)?.[1] ??
                                              interruptionData?.reason ??
                                              '',
                                      ),
                                      affectedParty: String(
                                          editingEvent.details?.match(/الخصم المعني: (.*)\n/)?.[1] ??
                                              interruptionData?.affectedParty ??
                                              '',
                                      ),
                                      date: editingEvent.date,
                                      notes:
                                          editingEvent.details?.match(/ملاحظات: (.*)\n/)?.[1] || '',
                                  }
                                : undefined
                        }
                    />
                )}
                {showResumeInterruptionModal && (
                    <LazyResumeInterruptionModal
                        key="resume-interruption"
                        isOpen={showResumeInterruptionModal}
                        onClose={() => setShowResumeInterruptionModal(false)}
                        onConfirm={h.handleResumeInterruptionConfirm}
                    />
                )}
                {showInterlocutoryModal && (
                    <LazyInterlocutoryAppealModal
                        key="interlocutory"
                        isOpen={showInterlocutoryModal}
                        onClose={() => {
                            setShowInterlocutoryModal(false);
                            setEditingEvent(null);
                        }}
                        onConfirm={h.handleInterlocutoryAppealConfirm}
                        editMode={!!editingEvent}
                        editData={
                            editingEvent
                                ? {
                                      id: editingEvent.id,
                                      decisionType: editingEvent.details?.match(/نوع القرار: (.*)\n/)?.[1],
                                      decisionDate:
                                          editingEvent.details?.match(/تاريخ صدور القرار: (.*)\n/)?.[1] ||
                                          editingEvent.date,
                                  }
                                : undefined
                        }
                    />
                )}
                {showObjectionRegistrationModal && (
                    <LazyObjectionRegistrationModal
                        key="obj-reg"
                        isOpen={showObjectionRegistrationModal}
                        onClose={() => setShowObjectionRegistrationModal(false)}
                        onConfirm={h.handleRegisterObjection}
                    />
                )}
                {showObjectionJudgmentModal && (
                    <LazyObjectionJudgmentModal
                        key="obj-judg"
                        isOpen={showObjectionJudgmentModal}
                        onClose={() => setShowObjectionJudgmentModal(false)}
                        onConfirm={h.handleObjectionJudgment}
                    />
                )}
                {isTrashOpen && (
                    <LazyTrashModal
                        key="trash"
                        isOpen={isTrashOpen}
                        onClose={() => setIsTrashOpen(false)}
                        deletedItems={deletedEvents}
                        onRestore={h.handleRestoreEvent}
                        onPermanentDelete={h.handleHardDeleteEvent}
                        onEmptyTrash={h.handleEmptyTrash}
                    />
                )}
                {showJudgmentModal && (
                    <LazySmartJudgmentModal
                        key="judgment"
                        isOpen={showJudgmentModal}
                        onClose={() => setShowJudgmentModal(false)}
                        onConfirm={h.handleJudgmentConfirm}
                        currentParties={partiesForLegacyModals(currentStage.parties)}
                        currentStage={currentStage.stageName}
                        representedParty={parentData.representedParty}
                    />
                )}
                {showAppealModal && (
                    <LazyAppealRegistrationModal
                        key="appeal-reg"
                        isOpen={showAppealModal}
                        onClose={() => setShowAppealModal(false)}
                        onConfirm={h.handleAppealRegistration}
                    />
                )}
                {showAppealTransitionModal && (
                    <LazyAppealTransitionModal
                        key="appeal-transition"
                        isOpen={showAppealTransitionModal}
                        onClose={() => {
                            setShowAppealTransitionModal(false);
                            setTempJudgmentData(null);
                        }}
                        onConfirm={h.handleAppealTransition}
                        currentParties={partiesForLegacyModals(currentStage.parties)}
                        representedParty={parentData.representedParty}
                    />
                )}
                {showCrossAppealModal && (
                    <LazyCrossAppealModal
                        key="cross-appeal"
                        isOpen={showCrossAppealModal}
                        onClose={() => setShowCrossAppealModal(false)}
                        onConfirm={h.handleCrossAppeal}
                    />
                )}
                {showProvisionalOrderModal && (
                    <LazyAddProvisionalOrderModal
                        key="provisional-order"
                        isOpen={showProvisionalOrderModal}
                        onClose={() => setShowProvisionalOrderModal(false)}
                        onConfirm={h.handleProvisionalOrderConfirm}
                        currentParties={partiesForLegacyModals(currentStage.parties)}
                    />
                )}
                {showNotificationModal && (
                    <LazyJudicialNotificationModal
                        key="notification"
                        isOpen={showNotificationModal}
                        onClose={() => setShowNotificationModal(false)}
                        onConfirm={h.handleSaveNotification}
                    />
                )}
                {!!showExtraordinaryAppealModal && (
                    <LazyExtraordinaryAppealModal
                        key="extra-appeal"
                        isOpen
                        onClose={() => setShowExtraordinaryAppealModal(false)}
                        onConfirm={h.handleExtraordinaryAppeal}
                        type={
                            typeof showExtraordinaryAppealModal === 'string'
                                ? showExtraordinaryAppealModal
                                : ''
                        }
                        currentCourt={currentStage.court}
                    />
                )}
                {showMaterialErrorModal && (
                    <LazyMaterialErrorCorrectionModal
                        key="material-error"
                        isOpen={!!showMaterialErrorModal}
                        onClose={() => setShowMaterialErrorModal(null)}
                        onConfirm={h.handleMaterialErrorCorrection}
                        correctionType={showMaterialErrorModal}
                    />
                )}
                {showJudgeRecusalModal && (
                    <LazyJudgeRecusalModal
                        key="judge-recusal"
                        isOpen={showJudgeRecusalModal}
                        onClose={() => setShowJudgeRecusalModal(false)}
                        onConfirm={h.handleJudgeRecusal}
                    />
                )}
                {showTransferJurisdictionModal && (
                    <LazyTransferJurisdictionModal
                        key="transfer-jurisdiction"
                        isOpen={showTransferJurisdictionModal}
                        onClose={() => setShowTransferJurisdictionModal(false)}
                        onConfirm={h.handleTransferJurisdiction}
                    />
                )}
                {showCaseConsolidationModal && (
                    <LazyCaseConsolidationModal
                        key="case-consolidation"
                        isOpen={showCaseConsolidationModal}
                        onClose={() => setShowCaseConsolidationModal(false)}
                        onConfirm={h.handleCaseConsolidation}
                    />
                )}
                {showAttorneyResignationModal && (
                    <LazyAttorneyResignationModal
                        key="attorney-resignation"
                        isOpen={showAttorneyResignationModal}
                        onClose={() => setShowAttorneyResignationModal(false)}
                        onConfirm={h.handleAttorneyResignation}
                    />
                )}
                {showExecutionTransferModal && (
                    <LazyExecutionTransferModal
                        key="execution-transfer"
                        isOpen={showExecutionTransferModal}
                        onClose={() => setShowExecutionTransferModal(false)}
                        onConfirm={h.handleExecutionTransfer}
                    />
                )}
            </Suspense>
        </AnimatePresence>
    );
}
