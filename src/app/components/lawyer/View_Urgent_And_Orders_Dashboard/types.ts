export type ViewMode = 'grid' | 'list';
export type FilterStatus = 'all' | 'critical' | 'active' | 'completed';

export interface Props {
    onBack?: () => void;
    onCreateNew?: () => void;
    onViewDetails?: (caseId: string) => void;
    /** فتح إضبارة محددة عند الدخول من الربط العنقودي */
    focusCaseId?: string;
    /** عند الفتح من مساحة الدعاوى — إظهار أزرار الإضافة والتصفية دون معالج خارجي */
    embeddedInWorkspace?: boolean;
}
