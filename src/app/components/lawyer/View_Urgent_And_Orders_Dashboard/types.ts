export type ViewMode = 'grid' | 'list';

export interface Props {
    onBack?: () => void;
    onCreateNew?: () => void;
    /** فتح إضبارة محددة عند الدخول من الربط العنقودي */
    focusCaseId?: string;
    /** عند الفتح من مساحة الدعاوى — إظهار أزرار الإضافة والتصفية دون معالج خارجي */
    embeddedInWorkspace?: boolean;
}
