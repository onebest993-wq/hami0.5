import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { partiesForLegacyModals } from './smartFileModalsPortalTypes';
import {
    LazyPauseCaseModal,
    LazyInterruptionModal,
    LazyResumeInterruptionModal,
    LazyInterlocutoryAppealModal,
    LazyObjectionRegistrationModal,
    LazyObjectionJudgmentModal,
    LazyAbsentJudgmentNotificationModal,
    LazyOpponentAbsentObjectionModal,
    LazyTrashModal,
} from '../../lazySmartFileModalChunks';

export function SmartFileModalsFlowSection(props: SmartFileModalsPortalProps) {
    const {
        isTrashOpen,
        setIsTrashOpen,
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
        showAbsentJudgmentNotificationModal,
        setShowAbsentJudgmentNotificationModal,
        showOpponentAbsentObjectionModal,
        setShowOpponentAbsentObjectionModal,
        editingEvent,
        setEditingEvent,
        pauseReason,
        linkedCaseNo,
        interruptionData,
        deletedEvents,
        currentStage,
        handlers: h,
    } = props;

    return (
        <>
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
                {showAbsentJudgmentNotificationModal && (
                    <LazyAbsentJudgmentNotificationModal
                        key="abs-notif"
                        isOpen={showAbsentJudgmentNotificationModal}
                        onClose={() => setShowAbsentJudgmentNotificationModal(false)}
                        onConfirm={h.handleAbsentJudgmentNotification}
                    />
                )}
                {showOpponentAbsentObjectionModal && (
                    <LazyOpponentAbsentObjectionModal
                        key="opp-abs-obj"
                        isOpen={showOpponentAbsentObjectionModal}
                        onClose={() => setShowOpponentAbsentObjectionModal(false)}
                        onConfirm={h.handleOpponentAbsentObjection}
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
        </>
    );
}
