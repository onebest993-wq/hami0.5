/**
 * Archive portal props and enriched-file display types.
 */

import type { BaseFile } from './base';
import type { CaseFile, Stage } from './caseFile';
import type { ExecutionArchiveFile } from './executionArchive';
import type { ThemeConfig } from './theme';

export interface ArchivePortalProps {
    type: ArchiveType;
    files: (CaseFile | ExecutionArchiveFile)[];
    theme: ThemeConfig;
    shapeClass: string;
    onClose: () => void;
    onFileClick: (file: CaseFile | ExecutionArchiveFile) => void;
    onAddAction?: () => void;
    embedded?: boolean;
    hideHeader?: boolean;
    hideTopActionBar?: boolean;
    /** false عندما يملك MainView Escape/native-back */
    escapeEnabled?: boolean;
    /** دعاوى نشطة لاستخراج الربط العنقودي عند تثبيت إضبارة تنفيذ */
    lawsuitFilesForCluster?: unknown[];
    /** إضابير جزائية من المخزن */
    criminalCases?: unknown[];
    onOpenCriminalCase?: (caseId: string) => void;
    onDeleteCriminalCase?: (caseId: string) => boolean | void;
    /** تبويب اختصاص أولي في مخزن الدعاوى (القضاء المدني / الأحوال الشخصية) */
    initialLawsuitJurisdictionTab?: 'all' | 'civil' | 'personal' | 'criminal';
    /** مخزن التنفيذ: نقل إلى سلة المهملات (حذف ناعم) */
    onMoveExecutionToTrash?: (fileId: string | number) => void;
    /** استرجاع من السلة */
    onRestoreExecutionFromTrash?: (fileId: string | number) => void;
    /** أرشفة إضبارة تنفيذ (مخزن الأرشيف) */
    onArchiveExecution?: (fileId: string | number) => void;
    /** إعادة إضبارة مؤرشفة إلى النشطة */
    onRestoreArchivedExecution?: (fileId: string | number) => void;
    /** حذف نهائي من السلة (بعد العد التنازلي في الواجهة) */
    onPermanentlyDeleteExecutions?: (fileIds: Array<string | number>) => void;
    /** قائمة executionFiles ما زالت تُحمَّل من التخزين — تجنّب «لا توجد إضابير» الكاذبة */
    executionFilesHydrating?: boolean;
    /** الدعاوى المدنية: نقل إلى سلة المهملات */
    onMoveLawsuitToTrash?: (fileId: string | number) => void;
    /** استرجاع دعوى من السلة */
    onRestoreLawsuitFromTrash?: (fileId: string | number) => void;
    /** أرشفة دعوى (مخزن الأرشيف) */
    onArchiveLawsuit?: (fileId: string | number) => void;
    /** إعادة دعوى مؤرشفة إلى النشطة */
    onRestoreArchivedLawsuit?: (fileId: string | number) => void;
    /** حذف نهائي لدعاوى من السلة */
    onPermanentlyDeleteLawsuits?: (fileIds: Array<string | number>) => void;
    /** عدّادات O(1) من فهرس الدعاوى — بلا مسح المصفوفة الكاملة */
    lawsuitLifecycleCounts?: { active: number; archived: number; trash: number };
    /** مقاطع مخزن/مهملات — تُحمَّل عند الطلب */
    lawsuitArchivedFiles?: CaseFile[] | null;
    lawsuitTrashFiles?: CaseFile[] | null;
    onEnsureLawsuitArchivedLoaded?: () => void | Promise<void>;
    onEnsureLawsuitTrashLoaded?: () => void | Promise<void>;
    /** قائمة الدعاوى ما زالت تُحمَّل من التخزين — تجنّب «لا توجد ملفات» الكاذبة */
    lawsuitFilesHydrating?: boolean;
    /** دعاوى مضمّنة: شبكة فقط داخل InstantShell — بلا غلاف/رأس مكرر */
    gridOnly?: boolean;
    /** عنصر التمرير الأب (InstantShell / Chrome) لـ virtualizer */
    archiveScrollParent?: HTMLElement | null;
    /** شريط البحث/العرض — تتحكم به Host عند InstantShell */
    dossierSearchQuery?: string;
    onDossierSearchQueryChange?: (query: string) => void;
    dossierViewMode?: 'grid' | 'compact';
    onDossierViewModeChange?: (mode: 'grid' | 'compact') => void;
    /** رفع حالة شريط دورة حياة الدعاوى إلى InstantShell */
    onLawsuitShellChrome?: (chrome: {
        lawsuitViewMode: 'active' | 'trash' | 'archived';
        setLawsuitViewMode: (mode: 'active' | 'trash' | 'archived') => void;
        unifiedArchivedCount: number;
        lawsuitTrashedCount: number;
    } | null) => void;
}

export type ArchiveType = 'lawsuits' | 'executions' | 'criminal' | 'all' | 'transaction' | 'deleted';

export interface EnrichedFile extends BaseFile {
    smartStatus: FileSmartStatus;
    stages?: Stage[];
    lastActivity?: string;
    progress?: number;
}

export interface FileSmartStatus {
    label: string;
    color: string;
    icon: string;
}
