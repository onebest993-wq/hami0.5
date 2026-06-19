import { useMemo } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { buildClusterScanIndex } from '@/app/workspace/buildClusterScanIndex';
import type { WorkspacePinLookupContext } from '@/app/workspace/buildPinFromSearchEntry';

export function useSearchScanIndex(
    files: FileData[],
    executionFiles: (FileData & { executionTrashDeletedAt?: string | null })[] | undefined,
    criminalCases: unknown[],
    pinLookup: WorkspacePinLookupContext,
) {
    return useMemo(
        () =>
            buildClusterScanIndex({
                lawsuitFiles: files,
                executionFiles: executionFiles ?? [],
                criminalCases,
                urgentCases: pinLookup.urgentCases,
                threadingTransactions: pinLookup.threadingTransactions ?? [],
                notes: pinLookup.notes,
                fieldTasks: pinLookup.tasks,
            }),
        [files, executionFiles, criminalCases, pinLookup],
    );
}
