import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LegalCase } from '@/app/stores/caseStore';
import { isExecutionInTrash } from '@/app/utils/executionTrash';
import { isLawsuitInTrash } from '@/app/utils/lawsuitTrash';

/** حالة العنصر في نتائج البحث الشامل */
export type SearchLifecycle = 'active' | 'archived' | 'deleted';

export const SEARCH_LIFECYCLE_LABELS: Record<SearchLifecycle, string> = {
    active: 'نشط',
    archived: 'مؤرشف',
    deleted: 'محذوف',
};

export function resolveFileSearchLifecycle(
    file: FileData & { executionTrashDeletedAt?: string | null },
): SearchLifecycle {
    if (file.status === 'deleted' || isLawsuitInTrash(file)) return 'deleted';
    if (isExecutionInTrash(file)) return 'deleted';
    if (file.status === 'archived' || file.status === 'archived_stage') return 'archived';
    return 'active';
}

export function resolveCaseSearchLifecycle(status: LegalCase['status']): SearchLifecycle {
    if (status === 'deleted') return 'deleted';
    if (status === 'archived') return 'archived';
    return 'active';
}
