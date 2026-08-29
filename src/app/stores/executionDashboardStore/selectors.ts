import type { ExecutionDashboardState, ModalStates } from './types';

export const selectCurrentFile = (s: ExecutionDashboardState) => s.currentFile;
export const selectModals = (s: ExecutionDashboardState) => s.modals;
export const selectNoteForm = (s: ExecutionDashboardState) => s.noteForm;
export const selectUIState = (s: ExecutionDashboardState) => s.ui;
export const selectIsModalOpen = (modalName: keyof ModalStates) => (s: ExecutionDashboardState) => s.modals[modalName];
export const selectActiveBottomTab = (s: ExecutionDashboardState) => s.ui.activeBottomTab;
export const selectIsHeaderExpanded = (s: ExecutionDashboardState) => s.ui.isHeaderExpanded;
export const selectExpandedParties = (s: ExecutionDashboardState) => s.ui.expandedParties;
