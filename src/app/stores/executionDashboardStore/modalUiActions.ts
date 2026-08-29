import {
    EXECUTION_EXCLUSIVE_MAIN_MODALS,
    initialModalStates,
    initialNoteForm,
    initialUIState,
} from './initialState';
import type { ModalStates, NoteFormData } from './types';
import type { DashboardStoreGet, DashboardStoreSet } from './storeSet';

export function createModalUiActions(set: DashboardStoreSet, _get: DashboardStoreGet) {
    return {
        openModal: (modalName: keyof ModalStates) =>
            set((state) => {
                const next = { ...state.modals, [modalName]: true };
                if (EXECUTION_EXCLUSIVE_MAIN_MODALS.includes(modalName)) {
                    for (const key of EXECUTION_EXCLUSIVE_MAIN_MODALS) {
                        if (key !== modalName) next[key] = false;
                    }
                }
                return { modals: next };
            }),

        closeModal: (modalName: keyof ModalStates) =>
            set((state) => ({ modals: { ...state.modals, [modalName]: false } })),

        closeAllModals: () => set({ modals: initialModalStates }),

        toggleModal: (modalName: keyof ModalStates) =>
            set((state) => ({
                modals: { ...state.modals, [modalName]: !state.modals[modalName] },
            })),

        updateNoteForm: <K extends keyof NoteFormData>(field: K, value: NoteFormData[K]) =>
            set((state) => ({
                noteForm: { ...state.noteForm, [field]: value },
            })),

        resetNoteForm: () => set({ noteForm: initialNoteForm }),

        togglePartyExpanded: (partyId: string) =>
            set((state) => ({
                ui: {
                    ...state.ui,
                    expandedParties: {
                        ...state.ui.expandedParties,
                        [partyId]: !state.ui.expandedParties[partyId],
                    },
                },
            })),

        setActiveBottomTab: (tab: string) =>
            set((state) => ({ ui: { ...state.ui, activeBottomTab: tab } })),

        toggleHeaderExpanded: () =>
            set((state) => ({
                ui: { ...state.ui, isHeaderExpanded: !state.ui.isHeaderExpanded },
            })),

        setHeaderExpanded: (expanded: boolean) =>
            set((state) => ({
                ui: { ...state.ui, isHeaderExpanded: expanded },
            })),

        resetUIPanelsForExecutionContext: () => set({ ui: { ...initialUIState } }),
    };
}
