export type ViewMode = 'grid' | 'list';
export type FilterStatus = 'all' | 'critical' | 'active' | 'completed';

export interface Props {
    onBack?: () => void;
    onCreateNew?: () => void;
    onViewDetails?: (caseId: string) => void;
    /** عند الفتح من مساحة الدعاوى — إظهار أزرار الإضافة والتصفية دون معالج خارجي */
    embeddedInWorkspace?: boolean;
}
