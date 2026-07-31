import type { ArchiveEnrichedRow, ComputedSmartStatus, LooseArchiveFile } from './types';

const DEFAULT_ARCHIVE_SMART_STATUS: ComputedSmartStatus = {
    type: 'active',
    label: 'مستمرة',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    timers: null,
};

/** Enrichment خفيف لمسار الدعاوى — بلا utils/SecureStore/تنفيذ. */
export function computeLawsuitArchiveEnrichedFiles(
    filesToEnrich: unknown[],
): ArchiveEnrichedRow[] {
    return filesToEnrich.map(
        (file): ArchiveEnrichedRow => ({
            ...(file as LooseArchiveFile),
            smartStatus: DEFAULT_ARCHIVE_SMART_STATUS,
        }),
    );
}
