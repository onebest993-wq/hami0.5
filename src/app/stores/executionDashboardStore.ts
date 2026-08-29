import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSecureJSONStorage } from '@/app/services/securePersistStorage';
import {
    EXECUTION_DASHBOARD_PERSIST_VERSION,
    EXECUTION_DASHBOARD_STORE_KEY,
    migrateExecutionDashboardPersistState,
    normalizeExecutionDashboardPersistSlice,
} from '@/app/infrastructure/persistence/executionDashboardStorePersist';
import { createPersistRehydrateReporter } from '@/app/infrastructure/persistence/zustandPersistFoundation';
import {
    DOSSIER_SCOPE_INABA,
    DOSSIER_SCOPE_PARENT,
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    stampInabaTimelineEventMetadata,
    stampParentTimelineEventMetadata,
    timelineEventBelongsToInabaDossier,
    timelineEventBelongsToParentDossier,
} from '@/app/domain/execution/dossier/ExecutionDossierScope';
import {
    INABA_SUB_FILE_ID,
    INABA_SUB_FILE_PREFIX,
    inabaSubMetaStorageKey,
    isInabaSubFileId,
    makeInabaSubFileId,
    resolveParentDossierId,
} from './executionDashboardStore/inabaIds';
import {
    buildInabaDelegationViewFile,
    buildSubDossierOpenedTimelineEvent,
    ensureSubDossierOpenedTimelineEvent,
} from './executionDashboardStore/inabaView';
import {
    initialModalStates,
    initialNoteForm,
    initialUIState,
} from './executionDashboardStore/initialState';
import type {
    ExecutionDashboardState,
    ModalStates,
    SubExecutionFile,
} from './executionDashboardStore/types';
import {
    selectActiveBottomTab,
    selectCurrentFile,
    selectExpandedParties,
    selectIsHeaderExpanded,
    selectIsModalOpen,
    selectModals,
    selectNoteForm,
    selectUIState,
} from './executionDashboardStore/selectors';
import {
    buildDebtorEmploymentTogglePatch,
    debtorEmploymentToggleMenuLabel,
    isDebtorRowEmployee,
} from './executionDashboardStore/debtorEmployment';
import { buildDebtorEntityKindPatch } from './executionDashboardStore/debtorEntityKind';
import { resolveTotalRemainingBalance } from './executionDashboardStore/remainingBalance';
import { createFileActions } from './executionDashboardStore/fileActions';
import { createModalUiActions } from './executionDashboardStore/modalUiActions';
import { createSubFileActions } from './executionDashboardStore/subFileActions';
import { createUnificationActions } from './executionDashboardStore/unificationActions';
import { createLifecycleActions } from './executionDashboardStore/lifecycleActions';

const secureStateStorage = createSecureJSONStorage();

export {
    INABA_SUB_FILE_ID,
    INABA_SUB_FILE_PREFIX,
    makeInabaSubFileId,
    isInabaSubFileId,
    resolveParentDossierId,
    inabaSubMetaStorageKey,
};

/** Timeline dossier-scope helpers — canonical in domain; re-exported for store/index callers */
export {
    DOSSIER_SCOPE_INABA,
    DOSSIER_SCOPE_PARENT,
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    stampInabaTimelineEventMetadata,
    stampParentTimelineEventMetadata,
    timelineEventBelongsToInabaDossier,
    timelineEventBelongsToParentDossier,
};

export {
    buildSubDossierOpenedTimelineEvent,
    ensureSubDossierOpenedTimelineEvent,
    buildInabaDelegationViewFile,
};

export type { SubExecutionFile, ExecutionDashboardState, ModalStates };

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

            ...createFileActions(set, get),
            ...createModalUiActions(set, get),
            ...createSubFileActions(set, get),
            ...createUnificationActions(set, get),
            ...createLifecycleActions(set, get),
        }),
        {
            name: EXECUTION_DASHBOARD_STORE_KEY,
            version: EXECUTION_DASHBOARD_PERSIST_VERSION,
            storage: secureStateStorage,
            migrate: migrateExecutionDashboardPersistState,
            merge: (persisted, current): ExecutionDashboardState => {
                const slice = normalizeExecutionDashboardPersistSlice(persisted);
                return {
                ...current,
                    ui: slice.ui,
                    noteForm: slice.noteForm,
                    dossierLifecycleByFileId:
                        slice.dossierLifecycleByFileId as ExecutionDashboardState['dossierLifecycleByFileId'],
                    subFiles: slice.subFiles as ExecutionDashboardState['subFiles'],
                    linkedDossiers: slice.linkedDossiers as ExecutionDashboardState['linkedDossiers'],
                    delegationParentFileId: slice.delegationParentFileId,
                };
            },
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

export {
    selectCurrentFile,
    selectModals,
    selectNoteForm,
    selectUIState,
    selectIsModalOpen,
    selectActiveBottomTab,
    selectIsHeaderExpanded,
    selectExpandedParties,
};

export {
    isDebtorRowEmployee,
    debtorEmploymentToggleMenuLabel,
    buildDebtorEmploymentTogglePatch,
    buildDebtorEntityKindPatch,
    resolveTotalRemainingBalance,
};
