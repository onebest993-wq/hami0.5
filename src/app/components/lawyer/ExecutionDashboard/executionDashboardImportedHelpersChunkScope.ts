// @ts-nocheck
/** مرافق مستوردة ثابتة لـ chunk scope — دوال/تخزين لا تتغير بين renders */
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import {
    readUnifiedFundsLedger,
    filterUnifiedLawyerFeesHideFileDuplicate,
    filterUnifiedExpensesHideFileDuplicate,
} from '@/app/utils/unifiedFundsLedgerStorage';
import { buildDebtorNoticePatchForKey } from '@/app/utils/noticeDebtorScope';
import { buildInitialExecutorSeizureDetails } from './hooks/executionDashboardCore/executionDashboardCoerciveAction';
import { formatUnifiedLedgerDate } from './executionDashboardLazyShellUi';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';
import { EXEC_MODAL_Z } from './executionDashboardConstants';

export const EXECUTION_DASHBOARD_IMPORTED_HELPERS_CHUNK_SCOPE = {
    buildDebtorNoticePatchForKey,
    buildInitialExecutorSeizureDetails,
    executionStorageKey,
    filterUnifiedExpensesHideFileDuplicate,
    filterUnifiedLawyerFeesHideFileDuplicate,
    formatUnifiedLedgerDate,
    getLocalTodayYmd,
    mergeSimilarRecentTimelineEvent,
    heirsNotificationModalZIndex: EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification,
    nestedOverUnifiedZIndex: EXEC_MODAL_Z.nestedOverUnified,
    notificationModalZIndex: EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification,
    readUnifiedFundsLedger,
    storageCache,
} as const;

export function spreadExecutionDashboardImportedHelpersChunkScope(): Record<string, unknown> {
    return EXECUTION_DASHBOARD_IMPORTED_HELPERS_CHUNK_SCOPE as unknown as Record<string, unknown>;
}
