import {
    FOUNDATION_STORE_PERSIST_V1,
    unwrapPersistedSlice,
} from '@/app/infrastructure/persistence/zustandPersistFoundation';

export const EXECUTION_DASHBOARD_STORE_KEY = 'execution-dashboard-storage';
export const EXECUTION_DASHBOARD_PERSIST_VERSION = FOUNDATION_STORE_PERSIST_V1;

export type ExecutionDashboardPersistSlice = {
    ui: {
        expandedParties: Record<string, boolean>;
        activeBottomTab: string;
        isHeaderExpanded: boolean;
    };
    noteForm: {
        noteTitle: string;
        noteBody: string;
        isTask: boolean;
        taskDueDate: string;
        taskStatus: string;
    };
    dossierLifecycleByFileId: Record<string, unknown>;
    subFiles: unknown[];
    linkedDossiers: unknown[];
    delegationParentFileId: string | null;
};

const defaultUi = (): ExecutionDashboardPersistSlice['ui'] => ({
    expandedParties: {},
    activeBottomTab: 'all',
    isHeaderExpanded: false,
});

const defaultNoteForm = (): ExecutionDashboardPersistSlice['noteForm'] => ({
    noteTitle: '',
    noteBody: '',
    isTask: false,
    taskDueDate: '',
    taskStatus: 'pending',
});

export function normalizeExecutionDashboardPersistSlice(
    persisted: unknown,
): ExecutionDashboardPersistSlice {
    const slice = unwrapPersistedSlice<ExecutionDashboardPersistSlice>(persisted);
    const uiRaw = slice.ui;
    const ui =
        uiRaw && typeof uiRaw === 'object' && !Array.isArray(uiRaw)
            ? {
                  expandedParties:
                      uiRaw.expandedParties && typeof uiRaw.expandedParties === 'object'
                          ? (uiRaw.expandedParties as Record<string, boolean>)
                          : {},
                  activeBottomTab:
                      typeof uiRaw.activeBottomTab === 'string' ? uiRaw.activeBottomTab : 'all',
                  isHeaderExpanded: Boolean(uiRaw.isHeaderExpanded),
              }
            : defaultUi();

    const noteRaw = slice.noteForm;
    const noteForm =
        noteRaw && typeof noteRaw === 'object' && !Array.isArray(noteRaw)
            ? {
                  noteTitle: typeof noteRaw.noteTitle === 'string' ? noteRaw.noteTitle : '',
                  noteBody: typeof noteRaw.noteBody === 'string' ? noteRaw.noteBody : '',
                  isTask: Boolean(noteRaw.isTask),
                  taskDueDate: typeof noteRaw.taskDueDate === 'string' ? noteRaw.taskDueDate : '',
                  taskStatus: typeof noteRaw.taskStatus === 'string' ? noteRaw.taskStatus : 'pending',
              }
            : defaultNoteForm();

    const dossierLifecycleByFileId =
        slice.dossierLifecycleByFileId &&
        typeof slice.dossierLifecycleByFileId === 'object' &&
        !Array.isArray(slice.dossierLifecycleByFileId)
            ? (slice.dossierLifecycleByFileId as Record<string, unknown>)
            : {};

    const delegation =
        typeof slice.delegationParentFileId === 'string' && slice.delegationParentFileId.trim()
            ? slice.delegationParentFileId.trim()
            : null;

    return {
        ui,
        noteForm,
        dossierLifecycleByFileId,
        subFiles: Array.isArray(slice.subFiles) ? slice.subFiles : [],
        linkedDossiers: Array.isArray(slice.linkedDossiers) ? slice.linkedDossiers : [],
        delegationParentFileId: delegation,
    };
}

export function migrateExecutionDashboardPersistState(
    persisted: unknown,
    _version: number,
): ExecutionDashboardPersistSlice {
    void _version;
    return normalizeExecutionDashboardPersistSlice(persisted);
}
