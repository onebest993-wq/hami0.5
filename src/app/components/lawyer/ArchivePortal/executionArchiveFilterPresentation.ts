import type { DossierLifecycleStatus } from '@/app/types/execution/core';

/** أنواع ووسوم شريط مخزن التنفيذ — بلا قراءة blob أو SecureStore. */
export type ExecutionJurisdictionFilter = 'all' | 'civil' | 'sharia';
export type ExecutionPerspectiveFilter = 'all' | 'creditor_agent' | 'debtor_agent' | 'legal_entity';
export type ExecutionArchiveLifecycleMode = 'active' | 'archived' | 'trash';
export type ExecutionViewMode = ExecutionArchiveLifecycleMode;
export type ExecutionDossierStatusFilter = 'all' | DossierLifecycleStatus;

export const EXECUTION_JURISDICTION_LABELS: Record<ExecutionJurisdictionFilter, string> = {
    all: 'الكل',
    civil: 'مدني',
    sharia: 'شرعي',
};

export const EXECUTION_PERSPECTIVE_LABELS: Record<ExecutionPerspectiveFilter, string> = {
    all: 'الكل',
    creditor_agent: 'وكيل دائن',
    debtor_agent: 'وكيل مدين',
    legal_entity: 'شخص معنوي',
};

export const EXECUTION_DOSSIER_STATUS_LABELS: Record<ExecutionDossierStatusFilter, string> = {
    all: 'الكل',
    active: 'النشطة',
    paused: 'متوقفة',
    suspended: 'مستأخرة',
    finished: 'منتهية',
};

export const EXECUTION_DOSSIER_STATUS_CHIP_DEFS: {
    id: ExecutionDossierStatusFilter;
    label: string;
}[] = [
    { id: 'all', label: EXECUTION_DOSSIER_STATUS_LABELS.all },
    { id: 'active', label: EXECUTION_DOSSIER_STATUS_LABELS.active },
    { id: 'paused', label: EXECUTION_DOSSIER_STATUS_LABELS.paused },
    { id: 'suspended', label: EXECUTION_DOSSIER_STATUS_LABELS.suspended },
    { id: 'finished', label: EXECUTION_DOSSIER_STATUS_LABELS.finished },
];

export const EXECUTION_JURISDICTION_TAB_DEFS: { id: ExecutionJurisdictionFilter; label: string }[] = [
    { id: 'all', label: EXECUTION_JURISDICTION_LABELS.all },
    { id: 'civil', label: EXECUTION_JURISDICTION_LABELS.civil },
    { id: 'sharia', label: EXECUTION_JURISDICTION_LABELS.sharia },
];

export const EXECUTION_PERSPECTIVE_TAB_DEFS: { id: ExecutionPerspectiveFilter; label: string }[] = [
    { id: 'all', label: EXECUTION_PERSPECTIVE_LABELS.all },
    { id: 'creditor_agent', label: EXECUTION_PERSPECTIVE_LABELS.creditor_agent },
    { id: 'debtor_agent', label: EXECUTION_PERSPECTIVE_LABELS.debtor_agent },
];

/** نص الحالة الفارغة لشبكة مخزن التنفيذ — بلا JSX. */
export function resolveExecutionArchiveEmptyCopy(
    executionViewMode: ExecutionViewMode,
    hasNarrowFilters: boolean,
): { title: string; hint: string | null } {
    if (hasNarrowFilters) {
        return { title: 'لا توجد نتائج', hint: 'عدّل البحث أو التصنيفات.' };
    }
    if (executionViewMode === 'trash') {
        return { title: 'سلة المهملات فارغة', hint: null };
    }
    if (executionViewMode === 'archived') {
        return {
            title: 'مخزن الأرشيف فارغ',
            hint: 'الإضابير التي تؤرشفها تظهر هنا.',
        };
    }
    return { title: 'لا توجد إضابير نشطة', hint: null };
}
