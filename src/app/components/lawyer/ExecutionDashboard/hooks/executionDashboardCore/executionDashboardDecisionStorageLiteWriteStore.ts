import SecureStoreService from '@/app/services/SecureStoreService';
import {
    EXECUTION_DECISIONS_RELOAD_EVENT,
    type ExecutionDecisionRowLite,
} from './executionDashboardDecisionStorageLiteCore';

export function writeDecisionRowsByKey(key: string, rows: ExecutionDecisionRowLite[]): void {
    SecureStoreService.setItemSync(key, JSON.stringify(rows));
}

export function dispatchExecutionDecisionsReload(): void {
    try {
        window.dispatchEvent(new CustomEvent(EXECUTION_DECISIONS_RELOAD_EVENT));
    } catch {
        /* ignore */
    }
}
