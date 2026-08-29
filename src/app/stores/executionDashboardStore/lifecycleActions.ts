import type { ExecutionFile } from '@/app/types/execution';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    initialModalStates,
    initialNoteForm,
    initialUIState,
} from './initialState';
import type { DossierLifecycleSlice, ExecutionDashboardState } from './types';

type SetFn = (
    partial:
        | Partial<ExecutionDashboardState>
        | ((state: ExecutionDashboardState) => Partial<ExecutionDashboardState> | ExecutionDashboardState),
) => void;
type GetFn = () => ExecutionDashboardState;

export function emptyDossierLifecycleSlice(): DossierLifecycleSlice {
    return {
        dossierStatus: '',
        lastActionDate: '',
        dossierStatusReason: '',
        dossierStatusDate: '',
    };
}

export function dossierLifecycleSliceFromFile(
    file?: ExecutionFile | null,
): DossierLifecycleSlice {
    const statusRaw = String(file?.dossier_lifecycle_status ?? '').trim();
    return {
        dossierStatus: statusRaw ? normalizeDossierLifecycleStatus(statusRaw) : '',
        lastActionDate: String(
            file?.dossier_last_action_date || file?.lastActionDate || '',
        ).trim(),
        dossierStatusReason: String(file?.dossier_status_reason || '').trim(),
        dossierStatusDate: String(file?.dossier_status_date || '').slice(0, 10),
    };
}

function patchLifecycle(
    state: ExecutionDashboardState,
    fileId: string,
    patch: Partial<DossierLifecycleSlice>,
): Partial<ExecutionDashboardState> | ExecutionDashboardState {
    const id = String(fileId || '').trim();
    if (!id || id === 'undefined') return state;
    const prev = state.dossierLifecycleByFileId[id] ?? emptyDossierLifecycleSlice();
    const next: DossierLifecycleSlice = { ...prev, ...patch };
    if (
        prev.dossierStatus === next.dossierStatus &&
        prev.lastActionDate === next.lastActionDate &&
        prev.dossierStatusReason === next.dossierStatusReason &&
        prev.dossierStatusDate === next.dossierStatusDate
    ) {
        return state;
    }
    return {
        dossierLifecycleByFileId: {
            ...state.dossierLifecycleByFileId,
            [id]: next,
        },
    };
}

export function createLifecycleActions(set: SetFn, get: GetFn) {
    return {
        reconcileDossierLifecycle: (fileId: string, file?: ExecutionFile | null) =>
            set((state) => patchLifecycle(state, fileId, dossierLifecycleSliceFromFile(file))),

        setDossierStatus: (fileId: string, dossierStatus: string) =>
            set((state) =>
                patchLifecycle(state, fileId, {
                    dossierStatus: normalizeDossierLifecycleStatus(dossierStatus),
                }),
            ),

        setDossierLastActionDate: (fileId: string, isoDate: string) =>
            set((state) =>
                patchLifecycle(state, fileId, {
                    lastActionDate: String(isoDate || '').trim(),
                }),
            ),

        touchDossierProceduralToday: (fileId: string) =>
            set((state) =>
                patchLifecycle(state, fileId, {
                    lastActionDate: getLocalTodayYmd(),
                }),
            ),

        getDossierLifecycleOrDefault: (fileId: string): DossierLifecycleSlice => {
            const id = String(fileId || '').trim();
            if (!id) return emptyDossierLifecycleSlice();
            return get().dossierLifecycleByFileId[id] ?? emptyDossierLifecycleSlice();
        },

        incorporateDossierMetaUpdate: (fileId: string, isoDate: string, reason: string) =>
            set((state) =>
                patchLifecycle(state, fileId, {
                    lastActionDate: String(isoDate || '').trim(),
                    dossierStatusReason: String(reason || '').trim(),
                }),
            ),

        purgeDossierScopedState: (dossierId: string) =>
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
                    linkedDossiers: state.linkedDossiers.filter((d) => {
                        const linkedId = String(d.linkedId || (d as { id?: string }).id || '').trim();
                        return linkedId !== pid;
                    }),
                    currentFile: currentMatches ? null : state.currentFile,
                    activeSubFileId: activeSubOrphaned ? null : state.activeSubFileId,
                    delegationParentFileId:
                        String(state.delegationParentFileId || '').trim() === pid
                            ? null
                            : state.delegationParentFileId,
                };
            }),

        resetStore: () =>
            set({
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
    };
}
