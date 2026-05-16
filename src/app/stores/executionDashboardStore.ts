import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    type AdditionalExecutionCreditor,
    type AdditionalExecutionDebtor,
    type Debtor,
    type DossierLifecycleStatus,
    type ExecutionFile,
    type TimelineEvent,
    normalizeDossierLifecycleStatus,
} from '@/app/types/execution';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import SecureStoreService from '@/app/services/SecureStoreService';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { storageCache } from '@/app/utils/storageCache';

const secureStateStorage = {
    getItem: (name: string) => SecureStoreService.getItemSync(name),
    setItem: (name: string, value: string) => {
        try { SecureStoreService.setItemSync(name, value); } catch { /* quota */ }
    },
    removeItem: (name: string) => {
        try { SecureStoreService.deleteItemSync(name); } catch { /* ignore */ }
    },
};

export const INABA_SUB_FILE_ID = '__inaba__';
export const INABA_SUB_FILE_PREFIX = INABA_SUB_FILE_ID;

export function makeInabaSubFileId(parentFileId: string): string {
    const p = String(parentFileId || '').trim();
    return p ? `${INABA_SUB_FILE_PREFIX}:${p}` : INABA_SUB_FILE_PREFIX;
}

export function isInabaSubFileId(id: string | null | undefined): boolean {
    const v = String(id || '').trim();
    if (!v) return false;
    return v === INABA_SUB_FILE_PREFIX || v.startsWith(`${INABA_SUB_FILE_PREFIX}:`);
}

export interface SubExecutionFile {
    id: string;
    fileNumber: string;
    parentFileId?: string;
    debtorCourt?: string;
    directorate?: string;
    creditors?: any[];
    debtors?: any[];
    debtAmount?: number;
    claimType?: string;
    status?: string;
    dossier_lifecycle_status?: string;
    debtor_summons_marker?: any;
    decisions: any[];
    timelineEvents: TimelineEvent[];
    createdAt: string;
    updatedAt: string;
    delegationTargetDirectorate?: string;
    delegationPurpose?: string;
}

interface ModalStates {
    showPaymentModal: boolean;
    showNotificationModal: boolean;
    showDocumentsModal: boolean;
    showAppointmentModal: boolean;
    showCoerciveModal: boolean;
    showPaymentCalculator: boolean;
    showSettlementCalculator: boolean;
    showNotesModal: boolean;
    showDecisionsModal: boolean;
    showSeizedAssetsModal: boolean;
    showTimelineModal: boolean;
    showUnifiedExecutionModal: boolean;
    showUnifiedSummonsModal: boolean;
    showLedgerModal: boolean;
    showPauseModal: boolean;
}

interface NoteFormData {
    noteTitle: string;
    noteBody: string;
    isTask: boolean;
    taskDueDate: string;
    taskStatus: string;
}

interface UIState {
    expandedParties: Record<string, boolean>;
    activeBottomTab: string;
    isHeaderExpanded: boolean;
}

interface DossierLifecycleSlice {
    dossierStatus: string;
    lastActionDate: string;
    dossierStatusReason: string;
    dossierStatusDate: string;
}

export interface ExecutionDashboardState {
    currentFile: ExecutionFile | null;
    _stashedOriginalFile: ExecutionFile | null;
    activeSubFileId: string | null;
    /** معرف الإضبارة الأم في علاقة الإنابة — يُثبَّت عند التبديل إلى الإضبارة الفرعية ويُمسح عند العودة */
    delegationParentFileId: string | null;
    subFiles: SubExecutionFile[];
    linkedDossiers: NonNullable<ExecutionFile['linkedDossiers']>;
    unificationTick: number;
    pendingUnificationLink: {
        decisionId: string;
        targetFileNumber?: string;
        targetYear?: string;
        targetDirectorate?: string;
    } | null;
    additionalCreditors: AdditionalExecutionCreditor[];
    additionalDebtors: AdditionalExecutionDebtor[];
    isSolidaryLiability: boolean;
    modals: ModalStates;
    noteForm: NoteFormData;
    ui: UIState;
    dossierLifecycleByFileId: Record<string, DossierLifecycleSlice>;

    setCurrentFile: (file: ExecutionFile | null) => void;
    updateCurrentFile: (updates: Partial<ExecutionFile>) => void;
    appendTimelineEventToFile: (fileId: string, event: TimelineEvent) => void;
    appendTimelineEventToSubFile: (subFileId: string, parentFileId: string, event: TimelineEvent) => void;
    openModal: (modalName: keyof ModalStates) => void;
    closeModal: (modalName: keyof ModalStates) => void;
    closeAllModals: () => void;
    toggleModal: (modalName: keyof ModalStates) => void;
    updateNoteForm: <K extends keyof NoteFormData>(field: K, value: NoteFormData[K]) => void;
    resetNoteForm: () => void;
    togglePartyExpanded: (partyId: string) => void;
    setActiveBottomTab: (tab: string) => void;
    toggleHeaderExpanded: () => void;
    setHeaderExpanded: (expanded: boolean) => void;
    setActiveSubFileId: (id: string | null) => void;
    setSubFiles: (files: SubExecutionFile[]) => void;
    addSubFile: (file: SubExecutionFile) => void;
    removeSubFile: (id: string) => void;
    swapToSubFile: (subFile: SubExecutionFile) => void;
    restoreOriginalFile: () => void;
    setDelegationParentFileId: (id: string | null) => void;
    setLinkedDossiers: (dossiers: NonNullable<ExecutionFile['linkedDossiers']>) => void;
    addLinkedDossier: (dossier: NonNullable<ExecutionFile['linkedDossiers']>[number]) => void;
    removeLinkedDossier: (linkedId: string) => void;
    generateLinkToken: () => string;
    setParentIdForDossier: (dossierId: string, parentId: string | null) => void;
    getChildDossiers: (rootFileId?: string) => ExecutionFile[];
    setPendingUnificationLink: (link: NonNullable<ExecutionDashboardState['pendingUnificationLink']> | null) => void;
    resetUIPanelsForExecutionContext: () => void;
    reconcileDossierLifecycle: (fileId: string, file?: ExecutionFile | null) => void;
    setDossierStatus: (fileId: string, dossierStatus: string) => void;
    setDossierLastActionDate: (fileId: string, isoDate: string) => void;
    touchDossierProceduralToday: (fileId: string) => void;
    getDossierLifecycleOrDefault: (fileId: string) => DossierLifecycleSlice;
    incorporateDossierMetaUpdate: (fileId: string, isoDate: string, reason: string) => void;
    resetStore: () => void;
}

const initialModalStates: ModalStates = {
    showPaymentModal: false,
    showNotificationModal: false,
    showDocumentsModal: false,
    showAppointmentModal: false,
    showCoerciveModal: false,
    showPaymentCalculator: false,
    showSettlementCalculator: false,
    showNotesModal: false,
    showDecisionsModal: false,
    showSeizedAssetsModal: false,
    showTimelineModal: false,
    showUnifiedExecutionModal: false,
    showUnifiedSummonsModal: false,
    showLedgerModal: false,
    showPauseModal: false,
};

const EXECUTION_EXCLUSIVE_MAIN_MODALS: (keyof ModalStates)[] = [
    'showPaymentModal', 'showNotificationModal', 'showDocumentsModal',
    'showAppointmentModal', 'showCoerciveModal', 'showPaymentCalculator', 'showSettlementCalculator',
    'showNotesModal', 'showDecisionsModal', 'showSeizedAssetsModal', 'showTimelineModal',
    'showUnifiedExecutionModal', 'showUnifiedSummonsModal', 'showLedgerModal', 'showPauseModal',
];

const initialNoteForm: NoteFormData = {
    noteTitle: '',
    noteBody: '',
    isTask: false,
    taskDueDate: '',
    taskStatus: 'pending',
};

const initialUIState: UIState = {
    expandedParties: {},
    activeBottomTab: 'all',
    isHeaderExpanded: false,
};

export const useExecutionDashboardStore = create<ExecutionDashboardState>()(
    persist(
        (set, get): ExecutionDashboardState => ({
            currentFile: null,
            _stashedOriginalFile: null,
            activeSubFileId: null,
            delegationParentFileId: null,
            subFiles: [],
            linkedDossiers: [],
            unificationTick: 0,
            pendingUnificationLink: null,
            additionalCreditors: [],
            additionalDebtors: [],
            isSolidaryLiability: false,
            modals: initialModalStates,
            noteForm: initialNoteForm,
            ui: initialUIState,
            dossierLifecycleByFileId: {},

            setCurrentFile: (file) =>
                set({ currentFile: file }),

            updateCurrentFile: (updates) => set((state) => {
                if (!state.currentFile) return state;
                const updatedFile = { ...state.currentFile, ...updates };
                try {
                    const allFiles = loadExecutionFilesRaw();
                    const targetId = String(updatedFile.id ?? '').trim();
                    if (targetId) {
                        const fileIndex = allFiles.findIndex((item) => {
                            if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
                            return String((item as { id?: unknown }).id ?? '').trim() === targetId;
                        });
                        if (fileIndex >= 0) {
                            allFiles[fileIndex] = updatedFile;
                        } else {
                            allFiles.push(updatedFile);
                        }
                        saveExecutionFilesRaw(allFiles);
                    }
                } catch {}
                return { currentFile: updatedFile };
            }),

            appendTimelineEventToFile: (fileId, event) =>
                set((state) => {
                    const targetId = String(fileId || '').trim();
                    if (!targetId) return state;
                    try {
                        const allFiles: any[] = loadExecutionFilesRaw() as any[];
                        const idx = allFiles.findIndex((f: any) => String(f?.id || '').trim() === targetId);
                        if (idx >= 0) {
                            const prev = allFiles[idx] as any;
                            const prevEvents: TimelineEvent[] = Array.isArray(prev?.timelineEvents) ? prev.timelineEvents : [];
                            const nextEvents = [...prevEvents, event];
                            allFiles[idx] = { ...prev, timelineEvents: nextEvents, updatedAt: new Date().toISOString() };
                            saveExecutionFilesRaw(allFiles);
                            const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                            if (Array.isArray(cache)) {
                                const cacheArr = cache as any[];
                                const cIdx = cacheArr.findIndex((f: any) => String(f?.id || '').trim() === targetId);
                                if (cIdx >= 0) {
                                    const cPrev = cacheArr[cIdx] as any;
                                    const cPrevEvents: TimelineEvent[] = Array.isArray(cPrev?.timelineEvents)
                                        ? cPrev.timelineEvents
                                        : [];
                                    cacheArr[cIdx] = { ...cPrev, timelineEvents: [...cPrevEvents, event] };
                                    storageCache.set(EXECUTION_FILES_STORAGE_KEY, cacheArr);
                                }
                            }
                            if (String((state.currentFile as any)?.id || '').trim() === targetId) {
                                return {
                                    currentFile: {
                                        ...(state.currentFile as any),
                                        timelineEvents: (Array.isArray((state.currentFile as any)?.timelineEvents)
                                            ? [...((state.currentFile as any).timelineEvents as any[]), event]
                                            : [event]) as any,
                                    } as any,
                                };
                            }
                        }
                    } catch {}
                    return state;
                }),

            appendTimelineEventToSubFile: (subFileId, parentFileId, event) =>
                set((state) => {
                    const subId = String(subFileId || '').trim();
                    const pId = String(parentFileId || '').trim();
                    if (!subId || !pId) return state;
                    const now = new Date().toISOString();
                    const nextSubFiles = state.subFiles.map((sf) => {
                        if (String(sf.id) !== subId) return sf;
                        if (String(sf.parentFileId || '') !== pId) return sf;
                        const prevEvents: TimelineEvent[] = Array.isArray(sf.timelineEvents) ? sf.timelineEvents : [];
                        return { ...sf, timelineEvents: [...prevEvents, event], updatedAt: now };
                    });
                    const nextState: any = { subFiles: nextSubFiles };
                    if (String(state.activeSubFileId || '') === subId && state.currentFile) {
                        const prevEvents: TimelineEvent[] = Array.isArray((state.currentFile as any)?.timelineEvents)
                            ? ((state.currentFile as any).timelineEvents as any)
                            : [];
                        nextState.currentFile = { ...(state.currentFile as any), timelineEvents: [...prevEvents, event] };
                    }
                    return nextState;
                }),

            openModal: (modalName) =>
                set((state) => {
                    const next = { ...state.modals, [modalName]: true };
                    if (EXECUTION_EXCLUSIVE_MAIN_MODALS.includes(modalName)) {
                        for (const key of EXECUTION_EXCLUSIVE_MAIN_MODALS) {
                            if (key !== modalName) next[key] = false;
                        }
                    }
                    return { modals: next };
                }),

            closeModal: (modalName) =>
                set((state) => ({ modals: { ...state.modals, [modalName]: false } })),

            closeAllModals: () => set({ modals: initialModalStates }),

            toggleModal: (modalName) =>
                set((state) => ({ modals: { ...state.modals, [modalName]: !state.modals[modalName] } })),

            updateNoteForm: (field, value) => set((state) => ({
                noteForm: { ...state.noteForm, [field]: value },
            })),

            resetNoteForm: () => set({ noteForm: initialNoteForm }),

            togglePartyExpanded: (partyId) => set((state) => ({
                ui: { ...state.ui, expandedParties: { ...state.ui.expandedParties, [partyId]: !state.ui.expandedParties[partyId] } },
            })),

            setActiveBottomTab: (tab) => set((state) => ({ ui: { ...state.ui, activeBottomTab: tab } })),

            toggleHeaderExpanded: () => set((state) => ({
                ui: { ...state.ui, isHeaderExpanded: !state.ui.isHeaderExpanded }
            })),

            setHeaderExpanded: (expanded) => set((state) => ({
                ui: { ...state.ui, isHeaderExpanded: expanded }
            })),

            setActiveSubFileId: (id) => set({ activeSubFileId: id }),
            setDelegationParentFileId: (id) => set({ delegationParentFileId: id }),
            setSubFiles: (files) => set({ subFiles: files }),

            addSubFile: (file) => set((state) => {
                const exists = state.subFiles.some((f) => f.id === file.id);
                if (exists) return state;
                const next = [...state.subFiles, file];
                try {
                    const allFiles: any[] = loadExecutionFilesRaw() as any[];
                    allFiles.push({ _subFileRef: { id: file.id, parentFileId: file.parentFileId, updatedAt: new Date().toISOString() } } as any);
                    saveExecutionFilesRaw(allFiles);
                    const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                    if (Array.isArray(cache)) {
                        storageCache.set(EXECUTION_FILES_STORAGE_KEY, [...cache]);
                    }
                } catch {}
                return { subFiles: next };
            }),

            removeSubFile: (id) => set((state) => {
                const nextSubFiles = state.subFiles.filter((f) => f.id !== id);
                if (nextSubFiles.length === state.subFiles.length) return state;
                try {
                    const allFiles: any[] = loadExecutionFilesRaw() as any[];
                    const filtered = allFiles.filter((f: any) => !(f && f._subFileRef && f._subFileRef.id === id));
                    saveExecutionFilesRaw(filtered);
                    const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                    if (Array.isArray(cache)) {
                        storageCache.set(EXECUTION_FILES_STORAGE_KEY, [...cache]);
                    }
                } catch {}
                return {
                    subFiles: nextSubFiles,
                    activeSubFileId: state.activeSubFileId === id ? null : state.activeSubFileId,
                };
            }),

            swapToSubFile: (subFile) => set((state) => {
                if (!state.currentFile) return state;
                const parentId = String(state.currentFile.id);
                /** تحديث الرابط فوراً — المصدر الأساسي للحقيقة */
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('delegationParentId', parentId);
                    window.history.replaceState(window.history.state, '', url.toString());
                } catch {}
                const parentFile: ExecutionFile = JSON.parse(JSON.stringify(state.currentFile));
                let subTimelineEvents = ((subFile as any).timelineEvents as TimelineEvent[]) || [];
                if (isInabaSubFileId(subFile.id) && subTimelineEvents.length > 0) {
                    subTimelineEvents = subTimelineEvents.filter((e: any) => {
                        const title = String(e?.title || '');
                        const source = String(e?.source || '');
                        const meta = (e?.metadata || {}) as Record<string, unknown>;
                        const action = (meta?.dossierActionPayload as Record<string, unknown> | undefined)?.actionType;
                        if (action !== 'delegation') return true;
                        if (!/طلب\s*الإنابة\s*التنفيذية/.test(title)) return true;
                        if (source !== 'محضر المتابعة' && source !== 'القرارات والطعون') return true;
                        return false;
                    });
                }
                const subDecisions = ((subFile as any).decisions as any[]) || [];
                const subAsFile: ExecutionFile = {
                    ...parentFile,
                    id: subFile.id,
                    fileNumber: subFile.fileNumber as any,
                    directorate: (subFile.directorate || parentFile.directorate) as any,
                    debtor_summons_marker: null,
                    decisions: subDecisions as any,
                    timelineEvents: subTimelineEvents as any,
                    caseNotesLog: [],
                    caseTasksPending: [],
                    delegationTargetDirectorate: (subFile as any).delegationTargetDirectorate,
                    delegationPurpose: (subFile as any).delegationPurpose,
                    ...(isInabaSubFileId(subFile.id)
                        ? {
                              linkedDossiers: [],
                              linkToken: undefined,
                          }
                        : {}),
                    /** الرابط العكسي: الإضبارة الفرعية تحمل معرف الأم */
                    parentId: isInabaSubFileId(subFile.id) ? parentId : subFile.parentFileId,
                } as ExecutionFile & { delegationTargetDirectorate?: string; delegationPurpose?: string };
                return {
                    _stashedOriginalFile: parentFile,
                    currentFile: subAsFile,
                    activeSubFileId: subFile.id,
                    delegationParentFileId: parentId,
                };
            }),

            restoreOriginalFile: () => set((state) => {
                const restoreById = (parentId: string) => {
                    try {
                        const allFiles: any[] = loadExecutionFilesRaw() as any[];
                        const match = allFiles.find((f: any) => String(f?.id || '') === String(parentId));
                        if (!match) return null;
                        return match as ExecutionFile;
                    } catch {
                        return null;
                    }
                };
                /** إزالة المعرّف من الرابط فوراً */
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('delegationParentId');
                    window.history.replaceState(window.history.state, '', url.toString());
                } catch {}
                if (!state._stashedOriginalFile) {
                    const currentId = String((state.currentFile as any)?.id || '');
                    const looksLikeInaba = isInabaSubFileId(currentId) || isInabaSubFileId(state.activeSubFileId);
                    if (!looksLikeInaba) return state;
                    const parentId =
                        String(state.delegationParentFileId || '').trim() ||
                        String((state.currentFile as any)?.parentId || '').trim();
                    if (!parentId) {
                        return {
                            activeSubFileId: null,
                            delegationParentFileId: null,
                        };
                    }
                    const restored = restoreById(parentId);
                    if (!restored) {
                        return {
                            activeSubFileId: null,
                            delegationParentFileId: null,
                        };
                    }
                    return {
                        currentFile: restored,
                        _stashedOriginalFile: null,
                        activeSubFileId: null,
                        delegationParentFileId: null,
                    };
                }
                return {
                    currentFile: state._stashedOriginalFile,
                    _stashedOriginalFile: null,
                    activeSubFileId: null,
                    delegationParentFileId: null,
                };
            }),

            setLinkedDossiers: (dossiers) => set({ linkedDossiers: dossiers }),

            addLinkedDossier: (dossier) => set((state) => {
                const exists = state.linkedDossiers.some((d) => d.linkedId === dossier.linkedId);
                if (exists) return state;
                return { linkedDossiers: [...state.linkedDossiers, dossier] };
            }),

            removeLinkedDossier: (linkedId) => set((state) => ({
                linkedDossiers: state.linkedDossiers.filter((d) => d.linkedId !== linkedId),
            })),

            generateLinkToken: () => {
                const hex = () => Math.random().toString(16).slice(2, 10);
                return `hami_${hex()}${hex()}`;
            },

            setParentIdForDossier: (dossierId, parentId) => {
                try {
                    const allFiles: any[] = loadExecutionFilesRaw() as any[];
                    const idx = allFiles.findIndex((f: any) => String(f.id) === dossierId);
                    if (idx >= 0) {
                        if (parentId == null || String(parentId).trim() === '') {
                            const { parentId: _drop, ...rest } = allFiles[idx] || {};
                            allFiles[idx] = rest as any;
                        } else {
                            allFiles[idx] = { ...allFiles[idx], parentId };
                        }
                        saveExecutionFilesRaw(allFiles);
                        const cache = storageCache.get(EXECUTION_FILES_STORAGE_KEY);
                        if (Array.isArray(cache)) {
                            const cacheArr = cache as any[];
                            const cacheIdx = cacheArr.findIndex((f: any) => String(f.id) === dossierId);
                            if (cacheIdx >= 0) {
                                if (parentId == null || String(parentId).trim() === '') {
                                    const { parentId: _drop, ...rest } = cacheArr[cacheIdx] || {};
                                    cacheArr[cacheIdx] = rest as any;
                                } else {
                                    cacheArr[cacheIdx] = { ...cacheArr[cacheIdx], parentId };
                                }
                                storageCache.set(EXECUTION_FILES_STORAGE_KEY, cacheArr);
                            }
                        }
                    }
                } catch {}
                set({ unificationTick: get().unificationTick + 1 });
            },

            getChildDossiers: (rootFileId?: string) => {
                const id = rootFileId || get().currentFile?.id;
                if (!id) return [];
                try {
                    const allFiles: any[] = loadExecutionFilesRaw() as any[];
                    const normalizeParentId = (rawKey: unknown): string => {
                        const key = String(rawKey || '').trim();
                        if (!key) return '';
                        const childIdx = key.indexOf('__child__');
                        const subIdx = key.indexOf('__sub__');
                        const idx =
                            childIdx >= 0 && subIdx >= 0 ? Math.min(childIdx, subIdx) : childIdx >= 0 ? childIdx : subIdx;
                        return (idx >= 0 ? key.slice(0, idx) : key).trim();
                    };
                    const root = String(id).trim();
                    const result: ExecutionFile[] = allFiles.filter(
                        (f: any) => f && normalizeParentId(f.parentId) === root
                    );
                    return result;
                } catch {
                    return [];
                }
            },

            setPendingUnificationLink: (link) => set({ pendingUnificationLink: link }),

            resetUIPanelsForExecutionContext: () =>
                set({ ui: { ...initialUIState } }),

            reconcileDossierLifecycle: () => {},
            setDossierStatus: () => {},
            setDossierLastActionDate: () => {},
            touchDossierProceduralToday: () => {},
            getDossierLifecycleOrDefault: () => ({
                dossierStatus: '',
                lastActionDate: '',
                dossierStatusReason: '',
                dossierStatusDate: '',
            }),
            incorporateDossierMetaUpdate: () => {},

            resetStore: () => set({
                currentFile: null,
                _stashedOriginalFile: null,
                activeSubFileId: null,
                delegationParentFileId: null,
                subFiles: [],
                linkedDossiers: [],
                additionalCreditors: [],
                additionalDebtors: [],
                isSolidaryLiability: false,
                modals: initialModalStates,
                noteForm: initialNoteForm,
                ui: initialUIState,
                dossierLifecycleByFileId: {},
            }),
        }),
        {
            name: 'execution-dashboard-storage',
            storage: createJSONStorage(() => secureStateStorage),
            partialize: (state) => ({
                ui: state.ui,
                noteForm: state.noteForm,
                dossierLifecycleByFileId: state.dossierLifecycleByFileId,
                subFiles: state.subFiles,
                linkedDossiers: state.linkedDossiers,
                delegationParentFileId: state.delegationParentFileId,
            }),
        }
    )
);

export type { ModalStates };

export const selectCurrentFile = (s: ExecutionDashboardState) => s.currentFile;
export const selectModals = (s: ExecutionDashboardState) => s.modals;
export const selectNoteForm = (s: ExecutionDashboardState) => s.noteForm;
export const selectUIState = (s: ExecutionDashboardState) => s.ui;
export const selectIsModalOpen = (modalName: keyof ModalStates) => (s: ExecutionDashboardState) => s.modals[modalName];
export const selectActiveBottomTab = (s: ExecutionDashboardState) => s.ui.activeBottomTab;
export const selectIsHeaderExpanded = (s: ExecutionDashboardState) => s.ui.isHeaderExpanded;
export const selectExpandedParties = (s: ExecutionDashboardState) => s.ui.expandedParties;

export const isDebtorRowEmployee = (debtor: any): boolean => {
    if (!debtor) return false;
    const occ = String(debtor.occupation || '');
    return occ === 'موظف' || occ === 'employee' || occ === 'موظفة';
};
export const debtorEmploymentToggleMenuLabel = (isEmployee: boolean, initial?: boolean) => isEmployee ? 'إلغاء توظيف' : 'توظيف';
export const buildDebtorEmploymentTogglePatch = (executionData: any, debtorKey: string): Record<string, unknown> | null => {
    if (!executionData || !debtorKey) return null;
    const primaryKey = String(executionData.debtors?.[0]?.id || 'primary_debtor');
    if (debtorKey === primaryKey) {
        const current = isDebtorRowEmployee(executionData.debtors?.[0]);
        return { ...executionData, debtors: [{ ...(executionData.debtors?.[0] || {}), occupation: current ? '' : 'موظف' }] };
    }
    const adIdx = (executionData.party_multiplicity?.additionalDebtors || []).findIndex(
        (a: any) => String(a.id) === debtorKey
    );
    if (adIdx < 0) return null;
    const ad = executionData.party_multiplicity.additionalDebtors[adIdx];
    const nextIsEmployee = ad.isEmployee !== false ? false : true;
    const nextAds = [...(executionData.party_multiplicity?.additionalDebtors || [])];
    nextAds[adIdx] = { ...ad, isEmployee: nextIsEmployee, occupation: nextIsEmployee ? 'موظف' : '' };
    return {
        ...executionData,
        party_multiplicity: { ...executionData.party_multiplicity, additionalDebtors: nextAds },
    };
};

export function resolveTotalRemainingBalance(file: any): number {
    const debt = Number(file.debtAmount) || 0;
    const paid = Number(file.paidDebt) || 0;
    return Math.max(0, debt - paid);
}
