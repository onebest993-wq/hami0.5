import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { LazyEditCaseInfoModal, LazyAddDocumentModal, LazyAddNoteModal, LazyAddPaymentModal, LazyAddIncidentalCaseModal, LazyFastTrackModal, LazyAttachmentShieldModal, LazyAddAppointmentModal } from '../../lazySmartFileModalChunks';
import type { SmartFileCaseFormData } from '../../smartFile/modalFormTypes';

export function SmartFileModalsContentSection(props: SmartFileModalsPortalProps) {
    const {
        showEditInfoModal,
        setShowEditInfoModal,
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
        showApptModal,
        setShowApptModal,
        editingEvent,
        setEditingEvent,
        editingIncidental,
        setEditingIncidental,
        editingFastTrack,
        setEditingFastTrack,
        editingAttachment,
        setEditingAttachment,
        displayStage,
        currentStage,
        parentData,
        handlers: h,
    } = props;

    return (
        <>
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
                        onSpawnLinkedCase={h.handleSpawnLinkedIncidentalCase}
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
                        editMode={Boolean(editingFastTrack?.id)}
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
        </>
    );
}
