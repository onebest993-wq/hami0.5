import type { MutableRefObject } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { HeirDetailRow } from '../helpers/heirUtils';

export type HeirUtilsModule = typeof import('../helpers/heirUtils');

export type PartyEditDraftState = {
    name: string;
    phone: string;
    address: string;
    heirs: HeirDetailRow[];
    lockBaseInfo: boolean;
    includeHeirsInForm?: boolean;
    heirsOnlyEdit?: boolean;
};

export type HeirsQuickViewState = {
    title: string;
    rows: Array<{ name: string; phone: string; address: string; isClient?: boolean }>;
} | null;

export type ShowToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
) => void;

export interface UsePartyEditWorkflowParams {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null>;
    decisionsStorageExecutionId: string;
    isHistoricalMode: boolean;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: ShowToast;
}

export function schedulePersistWork(work: () => void): void {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(work);
        return;
    }
    setTimeout(work, 0);
}
