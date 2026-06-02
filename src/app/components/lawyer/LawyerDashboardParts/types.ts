import type { CaseType, FileData, Party } from '../LawyerShared';

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
};

export type WizardNoteSeed = { id: number; text: string; date: string };

export type WizardInitialData =
    | {
          type: CaseType;
          notes?: WizardNoteSeed[];
      }
    | {
          mainCategory: CaseType;
          details: Record<string, unknown>;
          parties1: Array<Record<string, unknown>>;
          parties2: Array<Record<string, unknown>>;
          notes?: Array<Record<string, unknown>>;
      };

export type ExecutionFile = FileData & {
    fileNumber?: string;
    case_no?: string;
    executionTrashDeletedAt?: string | null;
    debtor_absence_badge_dismissed?: boolean;
    debtor_absence_badge_dismissed_by_debtor?: unknown;
    [key: string]: unknown;
};
