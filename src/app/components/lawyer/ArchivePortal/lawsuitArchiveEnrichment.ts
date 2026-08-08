import type { ArchiveEnrichedRow, LooseArchiveFile } from './types';
import { computeLawsuitSmartStatus } from './lawsuitArchiveSmartStatus';

/** Enrichment خفيف لمسار الدعاوى — يستنتج الحالة من الملف والمرحلة النشطة. */
export function computeLawsuitArchiveEnrichedFiles(
    filesToEnrich: unknown[],
): ArchiveEnrichedRow[] {
    return filesToEnrich.map((file) => ({
        ...(file as LooseArchiveFile),
        smartStatus: computeLawsuitSmartStatus(file as LooseArchiveFile),
    }));
}
