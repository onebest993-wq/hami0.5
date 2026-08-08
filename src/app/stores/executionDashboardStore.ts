// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    type AdditionalExecutionCreditor,
    type AdditionalExecutionDebtor,
    type ExecutionFile,
    type TimelineEvent,
} from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { createSecureJSONStorage } from '@/app/services/securePersistStorage';
import {
    EXECUTION_DASHBOARD_PERSIST_VERSION,
    EXECUTION_DASHBOARD_STORE_KEY,
    migrateExecutionDashboardPersistState,
    normalizeExecutionDashboardPersistSlice,
} from '@/app/infrastructure/persistence/executionDashboardStorePersist';
import { createPersistRehydrateReporter } from '@/app/infrastructure/persistence/zustandPersistFoundation';

const secureStateStorage = createSecureJSONStorage();

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

/** معرف الإضبارة الأم — ثابت أثناء التبديل بين الأم والإنابة */
export function resolveParentDossierId(
    state: Pick<ExecutionDashboardState, 'currentFile' | 'delegationParentFileId' | 'activeSubFileId'>,
    fallbackId?: string | null
): string {
    const fromDelegation = String(state.delegationParentFileId || '').trim();
    if (fromDelegation && !isInabaSubFileId(fromDelegation)) return fromDelegation;
    const cur = String(state.currentFile?.id || '').trim();
    if (cur && !isInabaSubFileId(cur)) return cur;
    const parentLink = String((state.currentFile as any)?.parentId || '').trim();
    if (parentLink && !isInabaSubFileId(parentLink)) return parentLink;
    const fb = String(fallbackId || '').trim();
    if (fb && !isInabaSubFileId(fb)) return fb;
    return '';
}

/** مفتاح تخزين بيانات إضبارة الإنابة — منفصل عن الأم */
export function inabaSubMetaStorageKey(parentId: string, subFileId: string): string {
    return `${String(parentId || '').trim()}__sub__${String(subFileId || '').trim()}__meta`;
}

export const DOSSIER_SCOPE_INABA = 'inaba';
export const DOSSIER_SCOPE_PARENT = 'parent';

/** حدث يخص إضبارة الإنابة — يشمل الأحداث القديمة بدون metadata داخل blob الإنابة */
export function timelineEventBelongsToInabaDossier(
    event: TimelineEvent | null | undefined,
    subFileId: string
): boolean {
    if (!event || (event as { trashedAt?: string }).trashedAt) return false;
    const subId = String(subFileId || '').trim();
    if (!subId) return false;
    const meta = ((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>;
    const scope = String(meta.dossierScope || '');
    const taggedSub = String(meta.inabaSubFileId || meta.executionDossierId || '').trim();

    if (scope === DOSSIER_SCOPE_PARENT) return false;
    if (scope === DOSSIER_SCOPE_INABA) {
        return !taggedSub || taggedSub === subId;
    }
    if (taggedSub) return taggedSub === subId;
    return true;
}

/** حدث يخص الإضبارة الأم — يستبعد كل ما يُوسَم لإضبارة الإنابة */
export function timelineEventBelongsToParentDossier(
    event: TimelineEvent | null | undefined,
    parentId: string
): boolean {
    if (!event || (event as { trashedAt?: string }).trashedAt) return false;
    const meta = ((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>;
    if (String(meta.dossierScope || '') === DOSSIER_SCOPE_INABA) return false;
    if (String(meta.inabaSubFileId || '').trim()) return false;
    const pid = String(parentId || '').trim();
    const taggedParent = String(meta.parentExecutionId || '').trim();
    if (taggedParent && pid && taggedParent !== pid) {
        if (String(meta.dossierScope || '') === DOSSIER_SCOPE_PARENT) return false;
        return true;
    }
    return true;
}

export function filterTimelineEventsForInabaDossier(
    events: TimelineEvent[],
    subFileId: string
): TimelineEvent[] {
    return (events || []).filter((e) => timelineEventBelongsToInabaDossier(e, subFileId));
}

export function filterTimelineEventsForParentDossier(
    events: TimelineEvent[],
    parentId: string
): TimelineEvent[] {
    return (events || []).filter((e) => timelineEventBelongsToParentDossier(e, parentId));
}

const SUB_DOSSIER_OPENED_THREAD_PREFIX = 'sub_dossier_opened:';

/** حدث افتتاح الإضبارة الفرعية — أول سجل زمني لها */
export function buildSubDossierOpenedTimelineEvent(
    subFileId: string,
    parentId: string,
    directorate?: string
): TimelineEvent {
    const subId = String(subFileId || '').trim();
    const pId = String(parentId || '').trim();
    const now = new Date().toISOString();
    const ymd = getLocalTodayYmd();
    const dirLabel = String(directorate || '').trim();
    const base: TimelineEvent = {
        id: `sub-open-${subId}-${ymd}`,
        type: 'other',
        title: 'فتح الإضبارة الفرعية',
        description: dirLabel
            ? `تم فتح الإضبارة الفرعية — الدائرة المناب إليها: ${dirLabel}`
            : 'تم فتح الإضبارة الفرعية',
        timestamp: now,
        date: ymd,
        source: 'نظام الإضبارة',
        metadata: {
            timelineThreadKey: `${SUB_DOSSIER_OPENED_THREAD_PREFIX}${subId}`,
            dossierLifecycle: 'sub_dossier_opened',
        },
    } as TimelineEvent;
    return stampInabaTimelineEventMetadata(base, subId, pId);
}

export function ensureSubDossierOpenedTimelineEvent(
    events: TimelineEvent[],
    subFileId: string,
    parentId: string,
    directorate?: string
): TimelineEvent[] {
    const subId = String(subFileId || '').trim();
    const threadKey = `${SUB_DOSSIER_OPENED_THREAD_PREFIX}${subId}`;
    const list = Array.isArray(events) ? [...events] : [];
    const hasOpen = list.some(
        (e) => String((e as { metadata?: Record<string, unknown> })?.metadata?.timelineThreadKey || '') === threadKey
    );
    if (hasOpen) return filterTimelineEventsForInabaDossier(list, subId);
    const opened = buildSubDossierOpenedTimelineEvent(subId, parentId, directorate);
    return filterTimelineEventsForInabaDossier([opened, ...list], subId);
}

export function stampInabaTimelineEventMetadata(
    event: TimelineEvent,
    subFileId: string,
    parentId: string
): TimelineEvent {
    const meta = {
        ...(((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>),
        dossierScope: DOSSIER_SCOPE_INABA,
        inabaSubFileId: subFileId,
        parentExecutionId: parentId,
    };
    return { ...event, metadata: meta } as TimelineEvent;
}

export function stampParentTimelineEventMetadata(
    event: TimelineEvent,
    parentId: string
): TimelineEvent {
    const pid = String(parentId || '').trim();
    const meta = {
        ...(((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>),
        dossierScope: DOSSIER_SCOPE_PARENT,
        ...(pid ? { parentExecutionId: pid } : {}),
    };
    return { ...event, metadata: meta } as TimelineEvent;
}

function copyPartyContextFromParent(parentFile: ExecutionFile): Partial<ExecutionFile> {
    const clone = <T>(v: T | undefined): T | undefined =>
        v != null ? (JSON.parse(JSON.stringify(v)) as T) : undefined;
    const creditors = clone(parentFile.creditors) ?? [];
    const debtors = clone(parentFile.debtors) ?? [];
    const parties =
        Array.isArray(parentFile.parties) && parentFile.parties.length > 0
            ? clone(parentFile.parties)!
            : ([...creditors, ...debtors] as ExecutionFile['parties']);
    return {
        creditors,
        debtors,
        parties,
        party_multiplicity: clone(parentFile.party_multiplicity),
        creditor_party_death_case: clone(parentFile.creditor_party_death_case),
        debtor_party_death_case: clone(parentFile.debtor_party_death_case),
        party_death_case: clone(parentFile.party_death_case),
    };
}

/** عرض إضبارة الإنابة — إضبارة جديدة فارغة + الكفيل (مالي/إجرائي) فقط */
export function buildInabaDelegationViewFile(
    parentFile: ExecutionFile,
    subFile: SubExecutionFile,
    parentId: string
): ExecutionFile {
    const gf = parentFile.guarantor_followup
        ? (JSON.parse(JSON.stringify(parentFile.guarantor_followup)) as ExecutionFile['guarantor_followup'])
        : undefined;
    const pg = parentFile.procedural_guarantee
        ? (JSON.parse(JSON.stringify(parentFile.procedural_guarantee)) as ExecutionFile['procedural_guarantee'])
        : undefined;
    const subTimelineRaw = Array.isArray(subFile.timelineEvents) ? subFile.timelineEvents : [];
    const dirLabel = String(
        subFile.delegationTargetDirectorate || subFile.directorate || parentFile.directorate || ''
    ).trim();
    const subTimeline = ensureSubDossierOpenedTimelineEvent(
        subTimelineRaw,
        subFile.id,
        parentId,
        dirLabel
    );
    const subDecisions = Array.isArray(subFile.decisions) ? [...subFile.decisions] : [];
    const partyCtx = copyPartyContextFromParent(parentFile);
    const subFileNumber = String(subFile.fileNumber || '').trim();
    const subFileYear = String((subFile as { fileYear?: string }).fileYear || '').trim();

    return {
        type: parentFile.type,
        id: subFile.id,
        parentId,
        fileNumber: subFileNumber,
        fileYear: subFileYear,
        directorate: (subFile.delegationTargetDirectorate || subFile.directorate || parentFile.directorate) as ExecutionFile['directorate'],
        debtorCourt: subFile.debtorCourt || parentFile.debtorCourt,
        ...partyCtx,
        debtAmount: parentFile.debtAmount,
        claimType: parentFile.claimType,
        status: subFile.status || parentFile.status,
        dossier_lifecycle_status: subFile.dossier_lifecycle_status || 'active',
        debtor_summons_marker: null,
        timelineEvents: subTimeline,
        decisions: subDecisions as ExecutionFile['decisions'],
        caseNotesLog: [],
        caseTasksPending: [],
        linkedDossiers: [],
        linkToken: undefined,
        delegationTargetDirectorate: subFile.delegationTargetDirectorate,
        delegationPurpose: subFile.delegationPurpose,
        ...(gf ? { guarantor_followup: gf } : {}),
        ...(pg ? { procedural_guarantee: pg } : {}),
        hasGuarantor: Boolean(
            parentFile.hasGuarantor || gf?.details_saved || pg?.committed_to_followup
        ),
        seizedAssets: [],
        realEstateSeizureAssets: [],
        thirdPartySeizureAssets: [],
        activeCoerciveActions: [],
        seizureDraftsByDecisionId: {},
        createdAt: subFile.createdAt,
        updatedAt: subFile.updatedAt,
    } as ExecutionFile;
}

function persistParentExecutionFile(parentId: string, file: ExecutionFile) {
    const pid = String(parentId || '').trim();
    if (!pid) return;
    try {
        storageCache.set(executionStorageKey(pid), file);
    } catch {
        /* ignore */
    }
}

export interface SubExecutionFile {
    id: string;
    fileNumber: string;
    fileYear?: string;
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
    /** لوحة مرجع قانون التنفيذ — جانبية، لا تُغلق النوافذ الرئيسية */
    showLawReferencePanel: boolean;
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
    purgeDossierScopedState: (dossierId: string) => void;
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
    showLawReferencePanel: false,
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
                        const stamped = isInabaSubFileId(subId)
                            ? stampInabaTimelineEventMetadata(event, subId, pId)
                            : event;
                        return { ...sf, timelineEvents: [...prevEvents, stamped], updatedAt: now };
                    });
                    const nextState: any = { subFiles: nextSubFiles };
                    if (String(state.activeSubFileId || '') === subId && state.currentFile) {
                        const prevEvents: TimelineEvent[] = Array.isArray((state.currentFile as any)?.timelineEvents)
                            ? ((state.currentFile as any).timelineEvents as any)
                            : [];
                        const stamped = isInabaSubFileId(subId)
                            ? stampInabaTimelineEventMetadata(event, subId, pId)
                            : event;
                        const nextEvents = [...prevEvents, stamped];
                        nextState.currentFile = {
                            ...(state.currentFile as any),
                            timelineEvents: filterTimelineEventsForInabaDossier(nextEvents, subId),
                        };
                        try {
                            storageCache.set(
                                executionStorageKey(inabaSubMetaStorageKey(pId, subId)),
                                nextState.currentFile as ExecutionFile
                            );
                        } catch {}
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
                const curId = String(state.currentFile.id || '').trim();
                const parentId = resolveParentDossierId(state, curId);
                if (!parentId) return state;
                /** تحديث الرابط فوراً — المصدر الأساسي للحقيقة */
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('delegationParentId', parentId);
                    window.history.replaceState(window.history.state, '', url.toString());
                } catch {}
                let parentFile: ExecutionFile;
                if (isInabaSubFileId(curId) && state._stashedOriginalFile) {
                    parentFile = JSON.parse(JSON.stringify(state._stashedOriginalFile)) as ExecutionFile;
                } else if (!isInabaSubFileId(curId)) {
                    parentFile = JSON.parse(JSON.stringify(state.currentFile)) as ExecutionFile;
                } else {
                    try {
                        const allFiles: any[] = loadExecutionFilesRaw() as any[];
                        const match = allFiles.find((f: any) => String(f?.id || '').trim() === parentId);
                        parentFile = (match
                            ? JSON.parse(JSON.stringify(match))
                            : JSON.parse(JSON.stringify(state.currentFile))) as ExecutionFile;
                    } catch {
                        parentFile = JSON.parse(JSON.stringify(state.currentFile)) as ExecutionFile;
                    }
                }
                persistParentExecutionFile(parentId, parentFile);
                const subAsFile = isInabaSubFileId(subFile.id)
                    ? buildInabaDelegationViewFile(parentFile, subFile, parentId)
                    : ({
                          ...parentFile,
                          id: subFile.id,
                          fileNumber: subFile.fileNumber as any,
                          directorate: (subFile.directorate || parentFile.directorate) as any,
                          debtor_summons_marker: null,
                          decisions: (subFile.decisions as any[]) || [],
                          timelineEvents: (subFile.timelineEvents as TimelineEvent[]) || [],
                          caseNotesLog: [],
                          caseTasksPending: [],
                          delegationTargetDirectorate: subFile.delegationTargetDirectorate,
                          delegationPurpose: subFile.delegationPurpose,
                          parentId: subFile.parentFileId,
                      } as ExecutionFile);
                try {
                    storageCache.set(
                        executionStorageKey(inabaSubMetaStorageKey(parentId, subFile.id)),
                        subAsFile
                    );
                } catch {}
                const normalizedSubRecord: SubExecutionFile = {
                    ...subFile,
                    fileNumber: String(subAsFile.fileNumber || subFile.fileNumber || '').trim(),
                    fileYear: String(subAsFile.fileYear || (subFile as { fileYear?: string }).fileYear || '').trim(),
                    timelineEvents: isInabaSubFileId(subFile.id)
                        ? (subAsFile.timelineEvents || [])
                        : subFile.timelineEvents,
                    updatedAt: new Date().toISOString(),
                };
                return {
                    _stashedOriginalFile: parentFile,
                    currentFile: subAsFile,
                    activeSubFileId: subFile.id,
                    delegationParentFileId: parentId,
                    subFiles: state.subFiles.map((f) =>
                        f.id === subFile.id ? normalizedSubRecord : f
                    ),
                };
            }),

            restoreOriginalFile: () => set((state) => {
                const restoreById = (parentId: string): ExecutionFile | null => {
                    const pid = String(parentId || '').trim();
                    if (!pid) return null;
                    if (state._stashedOriginalFile && String(state._stashedOriginalFile.id || '').trim() === pid) {
                        return JSON.parse(JSON.stringify(state._stashedOriginalFile)) as ExecutionFile;
                    }
                    try {
                        const cached = storageCache.get(executionStorageKey(pid)) as ExecutionFile | null;
                        if (cached && String(cached.id || '').trim() === pid) {
                            return JSON.parse(JSON.stringify(cached)) as ExecutionFile;
                        }
                    } catch {}
                    try {
                        const allFiles: any[] = loadExecutionFilesRaw() as any[];
                        const match = allFiles.find((f: any) => String(f?.id || '').trim() === pid);
                        if (!match) return null;
                        return JSON.parse(JSON.stringify(match)) as ExecutionFile;
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
                const currentId = String((state.currentFile as any)?.id || '').trim();
                const looksLikeInaba = isInabaSubFileId(currentId) || isInabaSubFileId(state.activeSubFileId);
                if (!looksLikeInaba && !state._stashedOriginalFile) return state;
                const parentId = resolveParentDossierId(state);
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
                const parentTimeline = filterTimelineEventsForParentDossier(
                    Array.isArray(restored.timelineEvents) ? restored.timelineEvents : [],
                    parentId
                );
                const parentFile = { ...restored, timelineEvents: parentTimeline };
                persistParentExecutionFile(parentId, parentFile);
                return {
                    currentFile: parentFile,
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
                        (f: any) =>
                            f &&
                            !isInabaSubFileId(f.id) &&
                            normalizeParentId(f.parentId) === root
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

            purgeDossierScopedState: (dossierId) =>
                set((state) => {
                    const pid = String(dossierId || '').trim();
                    if (!pid) return state;

                    const nextLifecycle = { ...state.dossierLifecycleByFileId };
                    delete nextLifecycle[pid];

                    const nextSubFiles = state.subFiles.filter((f) => {
                        const fid = String(f.id || '').trim();
                        const parent = String(f.parentFileId || '').trim();
                        return fid !== pid && parent !== pid;
                    });

                    const activeSubOrphaned =
                        Boolean(state.activeSubFileId) &&
                        !nextSubFiles.some((f) => String(f.id) === String(state.activeSubFileId));

                    const currentMatches = String(state.currentFile?.id || '').trim() === pid;

                    return {
                        dossierLifecycleByFileId: nextLifecycle,
                        subFiles: nextSubFiles,
                        linkedDossiers: state.linkedDossiers.filter(
                            (d) => String((d as { id?: string }).id || '').trim() !== pid,
                        ),
                        currentFile: currentMatches ? null : state.currentFile,
                        activeSubFileId: activeSubOrphaned ? null : state.activeSubFileId,
                        delegationParentFileId:
                            String(state.delegationParentFileId || '').trim() === pid
                                ? null
                                : state.delegationParentFileId,
                    };
                }),

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
            name: EXECUTION_DASHBOARD_STORE_KEY,
            version: EXECUTION_DASHBOARD_PERSIST_VERSION,
            storage: secureStateStorage,
            migrate: migrateExecutionDashboardPersistState,
            merge: (persisted, current) => ({
                ...current,
                ...normalizeExecutionDashboardPersistSlice(persisted),
            }),
            onRehydrateStorage: createPersistRehydrateReporter({
                area: 'execution-dashboard-store',
                storageKey: EXECUTION_DASHBOARD_STORE_KEY,
                version: EXECUTION_DASHBOARD_PERSIST_VERSION,
            }),
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
    if (debtor.isEmployee === true) return true;
    if (debtor.isEmployee === false) return false;
    const occ = String(debtor.occupation ?? debtor.employmentType ?? '').trim();
    return occ === 'موظف' || occ === 'employee' || occ === 'موظفة';
};
export const debtorEmploymentToggleMenuLabel = (isEmployee: boolean, _initial?: boolean) =>
    isEmployee ? 'تحويل إلى كاسب' : 'توظيف';

function applyDebtorEmploymentToggleRow(row: Record<string, unknown>): Record<string, unknown> {
    const current = isDebtorRowEmployee(row);
    const nextIsEmployee = !current;
    const occ = nextIsEmployee ? 'موظف' : 'كاسب';
    const employmentInitialWasEmployee =
        typeof row.employmentInitialWasEmployee === 'boolean'
            ? row.employmentInitialWasEmployee
            : current;
    return {
        ...row,
        occupation: occ,
        employmentType: occ,
        isEmployee: nextIsEmployee,
        employmentInitialWasEmployee,
    };
}

function applyDebtorEntityKindRow(
    row: Record<string, unknown>,
    targetKind: 'natural_person' | 'legal_entity'
): Record<string, unknown> {
    const partyType = targetKind === 'legal_entity' ? 'company' : 'individual';
    const next: Record<string, unknown> = {
        ...row,
        entityKind: targetKind,
        entityType: targetKind,
        type: partyType,
    };
    if (targetKind === 'legal_entity') {
        next.isEmployee = false;
        next.isClient = false;
        next.occupation = 'معنوي';
        next.employmentType = 'معنوي';
    }
    return next;
}

function syncDebtorEntityKindInParties(
    parties: unknown[] | undefined,
    nextRow: Record<string, unknown>,
    debtorKey: string,
    primaryKey: string,
): unknown[] | undefined {
    if (!Array.isArray(parties) || parties.length === 0) return undefined;
    let primaryDebtorPartySeen = false;
    return parties.map((raw) => {
        if (!raw || typeof raw !== 'object') return raw;
        const p = raw as Record<string, unknown>;
        const role = String(p.role ?? '');
        const isDebtorRole = role === 'المدين' || role.toLowerCase() === 'debtor';
        if (!isDebtorRole) return raw;
        const pid = String(p.id ?? '').trim();
        const matchAdditional = pid !== '' && pid === debtorKey;
        const matchPrimary =
            debtorKey === primaryKey &&
            (!primaryDebtorPartySeen || pid === primaryKey || pid === String(nextRow.id ?? ''));
        if (matchAdditional || matchPrimary) {
            if (debtorKey === primaryKey) primaryDebtorPartySeen = true;
            return {
                ...p,
                entityKind: nextRow.entityKind,
                entityType: nextRow.entityType,
                type: nextRow.type,
                ...(nextRow.entityKind === 'legal_entity'
                    ? { occupation: 'معنوي', isEmployee: false }
                    : {}),
            };
        }
        return raw;
    });
}

export const buildDebtorEntityKindPatch = (
    executionData: any,
    debtorKey: string,
    targetKind: 'natural_person' | 'legal_entity'
): Record<string, unknown> | null => {
    if (!executionData || !debtorKey) return null;
    const prim = executionData.debtors?.[0];
    const primaryKey =
        prim?.id != null && String(prim.id).trim() !== ''
            ? String(prim.id)
            : 'primary_debtor';
    const byDebtor = {
        ...(executionData.debtor_entity_kind_by_debtor || {}),
        [debtorKey]: targetKind,
    };
    if (debtorKey === primaryKey) {
        const list = Array.isArray(executionData.debtors) ? executionData.debtors : [];
        if (!list.length) return null;
        const next0 = applyDebtorEntityKindRow((list[0] || {}) as Record<string, unknown>, targetKind);
        const nextDebtors = [...list];
        nextDebtors[0] = next0;
        const nextParties = syncDebtorEntityKindInParties(
            executionData.parties,
            next0,
            debtorKey,
            primaryKey
        );
        return {
            debtors: nextDebtors,
            debtor: next0,
            debtor_entity_kind: targetKind,
            debtor_entity_type: targetKind,
            debtor_entity_kind_by_debtor: byDebtor,
            ...(nextParties ? { parties: nextParties } : {}),
        };
    }
    const adIdx = (executionData.party_multiplicity?.additionalDebtors || []).findIndex(
        (a: any) => String(a.id) === debtorKey
    );
    if (adIdx < 0) return null;
    const ad = executionData.party_multiplicity.additionalDebtors[adIdx];
    const nextAd = applyDebtorEntityKindRow(ad as Record<string, unknown>, targetKind);
    const nextAds = [...(executionData.party_multiplicity?.additionalDebtors || [])];
    nextAds[adIdx] = nextAd;
    const nextParties = syncDebtorEntityKindInParties(
        executionData.parties,
        nextAd,
        debtorKey,
        primaryKey
    );
    return {
        party_multiplicity: { ...executionData.party_multiplicity, additionalDebtors: nextAds },
        debtor_entity_kind_by_debtor: byDebtor,
        ...(nextParties ? { parties: nextParties } : {}),
    };
};

function syncDebtorEmploymentInParties(
    parties: unknown[] | undefined,
    nextRow: Record<string, unknown>,
    debtorKey: string,
    primaryKey: string,
): unknown[] | undefined {
    if (!Array.isArray(parties) || parties.length === 0) return undefined;
    let primaryDebtorPartySeen = false;
    return parties.map((raw) => {
        if (!raw || typeof raw !== 'object') return raw;
        const p = raw as Record<string, unknown>;
        const role = String(p.role ?? '');
        const isDebtorRole = role === 'المدين' || role.toLowerCase() === 'debtor';
        if (!isDebtorRole) return raw;
        const pid = String(p.id ?? '').trim();
        const matchAdditional = pid !== '' && pid === debtorKey;
        const matchPrimary =
            debtorKey === primaryKey &&
            (!primaryDebtorPartySeen || pid === primaryKey || pid === String(nextRow.id ?? ''));
        if (matchAdditional || matchPrimary) {
            if (debtorKey === primaryKey) primaryDebtorPartySeen = true;
            return {
                ...p,
                occupation: nextRow.occupation,
                employmentType: nextRow.employmentType,
                isEmployee: nextRow.isEmployee,
                employmentInitialWasEmployee: nextRow.employmentInitialWasEmployee,
            };
        }
        return raw;
    });
}

export const buildDebtorEmploymentTogglePatch = (executionData: any, debtorKey: string): Record<string, unknown> | null => {
    if (!executionData || !debtorKey) return null;
    const prim = executionData.debtors?.[0];
    const primaryKey =
        prim?.id != null && String(prim.id).trim() !== ''
            ? String(prim.id)
            : 'primary_debtor';
    if (debtorKey === primaryKey) {
        const list = Array.isArray(executionData.debtors) ? executionData.debtors : [];
        if (!list.length) return null;
        const next0 = applyDebtorEmploymentToggleRow((list[0] || {}) as Record<string, unknown>);
        const nextDebtors = [...list];
        nextDebtors[0] = next0;
        const nextParties = syncDebtorEmploymentInParties(
            executionData.parties,
            next0,
            debtorKey,
            primaryKey,
        );
        return {
            debtors: nextDebtors,
            debtor: next0,
            ...(nextParties ? { parties: nextParties } : {}),
        };
    }
    const adIdx = (executionData.party_multiplicity?.additionalDebtors || []).findIndex(
        (a: any) => String(a.id) === debtorKey
    );
    if (adIdx < 0) return null;
    const ad = executionData.party_multiplicity.additionalDebtors[adIdx];
    const nextAd = applyDebtorEmploymentToggleRow(ad as Record<string, unknown>);
    const nextAds = [...(executionData.party_multiplicity?.additionalDebtors || [])];
    nextAds[adIdx] = nextAd;
    const nextParties = syncDebtorEmploymentInParties(
        executionData.parties,
        nextAd,
        debtorKey,
        primaryKey,
    );
    return {
        party_multiplicity: { ...executionData.party_multiplicity, additionalDebtors: nextAds },
        ...(nextParties ? { parties: nextParties } : {}),
    };
};

export function resolveTotalRemainingBalance(file: any): number {
    const debt = Number(file.debtAmount) || 0;
    const paid = Number(file.paidDebt) || 0;
    return Math.max(0, debt - paid);
}
