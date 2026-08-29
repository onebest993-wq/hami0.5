import { useMemo } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { buildClusterScanIndex } from '@/app/workspace/buildClusterScanIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';
import type { ClusterScanRecord } from '@/app/workspace/types';

const EMPTY_SCAN_INDEX: ClusterScanRecord[] = [];

export function useSearchScanIndex(
    files: FileData[],
    executionFiles: (FileData & { executionTrashDeletedAt?: string | null })[] | undefined,
    criminalCases: unknown[],
    pinLookup: WorkspacePinLookupContext,
    enabled = true,
) {
    return useMemo(() => {
        if (!enabled) return EMPTY_SCAN_INDEX;
        return buildClusterScanIndex({
            lawsuitFiles: files,
            executionFiles: executionFiles ?? [],
            criminalCases,
            urgentCases: pinLookup.urgentCases,
            threadingTransactions: pinLookup.threadingTransactions ?? [],
            notes: pinLookup.notes,
            fieldTasks: pinLookup.tasks,
        });
    }, [enabled, files, executionFiles, criminalCases, pinLookup]);
}
