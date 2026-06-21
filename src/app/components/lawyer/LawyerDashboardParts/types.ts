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
};

export type ExecutionFile = FileData & {
    fileNumber?: string;
    case_no?: string;
    executionTrashDeletedAt?: string | null;
    debtor_absence_badge_dismissed?: boolean;
    debtor_absence_badge_dismissed_by_debtor?: unknown;
    [key: string]: unknown;
};
