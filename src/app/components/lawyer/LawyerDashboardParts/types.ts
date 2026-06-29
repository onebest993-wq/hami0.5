import type { FileData } from '../LawyerShared';

export type GlobalNote = {
    id: number | string;
    title: string;
    body: string;
    isPinned: boolean;
    color?: string;
    date?: string;
    apptDate?: string;
    reminder_at?: string;
    category?: 'دعاوى' | 'تنفيذ' | 'عام';
    tags?: string[];
    linkedFileId?: number;
    type?: string;
    transcript?: string;
    voiceDurationSec?: number;
    /** مرجع مستند Smart Vault مرفق بالبطاقة */
    attachmentDocId?: string;
    /** إخفاء من inbox المستودع بعد الربط بإضبارة */
    repositoryInboxHidden?: boolean;
    /** طابع إنشاء ISO للعرض */
    createdAtIso?: string;
    /** أسطر مهام سريعة مستخرجة من المحرر */
    quickTaskLines?: string[];
};

export type ExecutionFile = FileData & {
    fileNumber?: string;
    case_no?: string;
    executionTrashDeletedAt?: string | null;
    debtor_absence_badge_dismissed?: boolean;
    debtor_absence_badge_dismissed_by_debtor?: unknown;
    [key: string]: unknown;
};
