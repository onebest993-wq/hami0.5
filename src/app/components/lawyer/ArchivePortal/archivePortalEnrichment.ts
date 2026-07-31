import type { ArchiveEnrichedRow } from './types';
import { computeLawsuitArchiveEnrichedFiles } from './lawsuitArchiveEnrichment';
import { computeExecutionArchiveEnrichedFiles } from './executionArchiveEnrichment';

export function computeArchiveEnrichedFiles(
    type: string,
    files: unknown[],
    filteredExecutionFiles: unknown[],
    filteredLawsuitFiles: unknown[],
): ArchiveEnrichedRow[] {
    if (type === 'executions') {
        return computeExecutionArchiveEnrichedFiles(files, filteredExecutionFiles);
    }
    const filesToEnrich = type === 'lawsuits' ? filteredLawsuitFiles : files;
    return computeLawsuitArchiveEnrichedFiles(filesToEnrich);
}
