/** Barrel re-exports — prefer direct imports from ./modals/* for code-splitting. */
export { getLegalRoleTitle } from './smartFile/legalRoleTitle';
export { ExtraordinaryAppealModal } from './modals/extraordinaryAppealModal';
export {
    AddTaskModal,
    AddDocumentModal,
    AddNoteModal,
    AddPaymentModal,
    AddAppointmentModal,
} from './modals/contentEntryModals';
export {
    AddIncidentalCaseModal,
    PauseCaseModal,
    InterruptionModal,
    ResumeInterruptionModal,
    TransitionModal,
    AddProvisionalOrderModal,
} from './modals/incidentalAndFlowModals';
export {
    InterlocutoryAppealModal,
    AppealRegistrationModal,
    JudicialNotificationModal,
    AbsentJudgmentNotificationModal,
    OpponentAbsentObjectionModal,
    ObjectionRegistrationModal,
    ObjectionJudgmentModal,
} from './modals/appealObjectionModals';
export { EditCaseInfoModal } from './modals/EditCaseInfoModal';
