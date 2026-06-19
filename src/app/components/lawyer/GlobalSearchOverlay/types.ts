import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchNavigate } from '@/app/services/globalSearchIndex';

export interface GlobalSearchOverlayProps {
    onClose: () => void;
    onNavigate: (navigate: GlobalSearchNavigate) => void;
    files: FileData[];
    executionFiles?: (FileData & { executionTrashDeletedAt?: string | null })[];
    globalNotes: { id: number | string; title?: string; body?: string; type?: string }[];
    notifications?: { id: string; title: string; message: string; type: string }[];
    criminalCases?: unknown[];
    userId: string | null;
    initialQuery?: string;
    indexVersion?: number;
}

export type { GlobalSearchNavigate };
