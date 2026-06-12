/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🗄️ STORES INDEX - فهرس المخازن
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Central export point for all Zustand stores
 * 
 * @version 2.0.0
 * @author Hami Legal System
 */

// ═══════════════════════════════════════════════════════════════════════════
// STORES
// ═══════════════════════════════════════════════════════════════════════════

export {
    useAppStore,
    selectIsAuthenticated,
    selectCurrentUser,
    selectCurrentScreen,
    selectExecutionFiles,
    selectSelectedExecution,
    selectIsLoading,
    selectSettings,
    selectToasts,
    selectIsSidebarOpen,
    selectExecutionFileById,
    selectExecutionFilesCount,
    selectUnpaidExecutions,
} from './appStore';

export {
    useExecutionDashboardStore,
    selectCurrentFile,
    selectModals,
    selectNoteForm,
    selectUIState,
    selectIsModalOpen,
    selectActiveBottomTab,
    selectIsHeaderExpanded,
    selectExpandedParties,
    isInabaSubFileId,
    resolveParentDossierId,
    buildInabaDelegationViewFile,
    inabaSubMetaStorageKey,
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    stampInabaTimelineEventMetadata,
    stampParentTimelineEventMetadata,
    buildSubDossierOpenedTimelineEvent,
    ensureSubDossierOpenedTimelineEvent,
    timelineEventBelongsToInabaDossier,
    timelineEventBelongsToParentDossier,
    isDebtorRowEmployee,
    debtorEmploymentToggleMenuLabel,
    buildDebtorEmploymentTogglePatch,
    buildDebtorEntityKindPatch,
    type ModalStates,
} from './executionDashboardStore';

export type { ExecutionDashboardState } from './executionDashboardStore';

export {
    useExecutionFormStore,
} from './executionFormStore';

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL STORES
// ═══════════════════════════════════════════════════════════════════════════

export {
    useGhostStore,
    type Insight,
    type InsightType,
} from './ghostStore';

export {
    useCaseStore,
    type LegalCase,
    type CaseType,
    type LinkedDocument,
    type Deadline,
    type Hearing,
    type ChecklistItem,
    type CaseNote,
    type ExecutionDetails,
} from './caseStore';

export {
    useNotificationStore,
} from './notificationStore';

export { useNeuralAlertsStore } from './neuralAlertsStore';

export {
    useRagStore,
} from './ragStore';

export { useWorkspaceStore } from './workspaceStore';

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
    ExecutionFile,
    AdditionalExecutionCreditor,
    AdditionalExecutionDebtor,
    PartyMultiplicityExtension,
} from '@/app/types/execution';

export { resolveTotalRemainingBalance } from './executionDashboardStore';
