import type { ArchiveEnrichedRow, LooseArchiveFile } from './types';
import { isExecutionArchived, isExecutionInTrash } from '@/app/utils/executionTrash';
import { executionTotalDemandEstimate } from './archivePortalAmountUtils';

const EXECUTION_ARCHIVE_LIST_SMART_STATUS = {
    type: 'active',
    label: 'مستمرة',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    timers: null,
} as const;

/** تجميع صفوف موحّدة من الفهرس — بلا حالات دعاوى/مراحل على مسار التنفيذ. */
export function computeExecutionArchiveEnrichedFiles(
    files: unknown[],
    filteredExecutionFiles: unknown[],
): ArchiveEnrichedRow[] {
    const allFiles = files as LooseArchiveFile[];
    const unifiedChildCountByParent = new Map<string, number>();
    const unifiedDemandByParent = new Map<string, number>();

    for (const row of allFiles) {
        if (isExecutionInTrash(row) || isExecutionArchived(row)) continue;
        const parentId = String((row as { parentId?: unknown }).parentId || '').trim();
        if (!parentId) continue;
        unifiedChildCountByParent.set(parentId, (unifiedChildCountByParent.get(parentId) ?? 0) + 1);
        unifiedDemandByParent.set(
            parentId,
            (unifiedDemandByParent.get(parentId) ?? 0) + executionTotalDemandEstimate(row),
        );
    }

    return filteredExecutionFiles.map((file): ArchiveEnrichedRow => {
        const loose = file as LooseArchiveFile;
        const baseId = String((loose as { id?: unknown })?.id || '').trim();
        const unifiedCount = baseId ? unifiedChildCountByParent.get(baseId) ?? 0 : 0;
        const baseDemand = executionTotalDemandEstimate(loose);
        const unifiedDemand = baseId ? unifiedDemandByParent.get(baseId) ?? 0 : 0;
        return {
            ...loose,
            smartStatus: EXECUTION_ARCHIVE_LIST_SMART_STATUS,
            unifiedCount,
            unifiedTotalDemand: unifiedCount > 0 ? baseDemand + unifiedDemand : undefined,
        };
    });
}
