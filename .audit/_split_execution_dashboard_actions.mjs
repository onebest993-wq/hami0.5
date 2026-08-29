/**
 * Split executionDashboardStore action bodies into domain action modules.
 * Run from repo root: node .audit/_split_execution_dashboard_actions.mjs
 */
import fs from 'fs';

const storePath = 'src/app/stores/executionDashboardStore.ts';
const src = fs.readFileSync(storePath, 'utf8');
const lines = src.split(/\r?\n/);
const outDir = 'src/app/stores/executionDashboardStore';

function sliceProps(start, end) {
  // Store props are indented with 12 spaces; keep as-is inside return { }.
  return lines.slice(start - 1, end).join('\n');
}

function writeAction(file, exportName, imports, propsText) {
  const final = `// @ts-nocheck
${imports.trim()}

export function ${exportName}(set, get) {
    return {
${propsText}
    };
}
`;
  fs.writeFileSync(`${outDir}/${file}`, final);
  console.log('wrote', file, final.split(/\r?\n/).length);
}

writeAction(
  'fileActions.ts',
  'createFileActions',
  `
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import {
    filterTimelineEventsForInabaDossier,
    stampInabaTimelineEventMetadata,
} from '@/app/domain/execution/dossier/ExecutionDossierScope';
import { inabaSubMetaStorageKey, isInabaSubFileId } from './inabaIds';
`,
  sliceProps(122, 224),
);

writeAction(
  'modalUiActions.ts',
  'createModalUiActions',
  `
import {
    EXECUTION_EXCLUSIVE_MAIN_MODALS,
    initialModalStates,
    initialNoteForm,
    initialUIState,
} from './initialState';
`,
  `${sliceProps(226, 263)}

            resetUIPanelsForExecutionContext: () =>
                set({ ui: { ...initialUIState } }),`,
);

writeAction(
  'subFileActions.ts',
  'createSubFileActions',
  `
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { filterTimelineEventsForParentDossier } from '@/app/domain/execution/dossier/ExecutionDossierScope';
import {
    inabaSubMetaStorageKey,
    isInabaSubFileId,
    resolveParentDossierId,
} from './inabaIds';
import {
    buildInabaDelegationViewFile,
    persistParentExecutionFile,
} from './inabaView';
import type { SubExecutionFile } from './types';
`,
  sliceProps(265, 430),
);

writeAction(
  'unificationActions.ts',
  'createUnificationActions',
  `
import type { ExecutionFile } from '@/app/types/execution';
import { loadExecutionFilesRaw, saveExecutionFilesRaw, EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import { storageCache } from '@/app/utils/storageCache';
import { isInabaSubFileId } from './inabaIds';
`,
  sliceProps(432, 507),
);

writeAction(
  'lifecycleActions.ts',
  'createLifecycleActions',
  `
import {
    initialModalStates,
    initialNoteForm,
    initialUIState,
} from './initialState';
`,
  sliceProps(512, 574),
);

const thin = `// @ts-nocheck
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
`;

fs.writeFileSync(storePath, thin);
console.log('thin store', thin.split(/\r?\n/).length);
