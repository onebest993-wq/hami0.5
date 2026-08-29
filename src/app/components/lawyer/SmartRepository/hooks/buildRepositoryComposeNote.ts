import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';
import { extractQuickTaskLines } from '../legalRichTextEditorUtils';

export function composeNoteTags(noteCategory: string, vaultActiveFilter: string): string[] {
    return Array.from(
        new Set([
            noteCategory,
            ...(vaultActiveFilter !== 'الكل' && vaultActiveFilter ? [vaultActiveFilter] : []),
        ]),
    );
}

export function buildRepositoryComposeNote(params: {
    title: string;
    safeBody: string;
    plain: string;
    isPinned: boolean;
    attachmentDocId?: string;
    activeRoomId: string | null;
    vaultActiveFilter: string;
    now?: Date;
}): GlobalNote {
    const now = params.now ?? new Date();
    const noteCategory = REPOSITORY_ACTION_CATEGORY.note;
    return {
        id: `note_${now.getTime()}`,
        title: params.title.trim() || 'ملاحظة بدون عنوان',
        body: params.safeBody || params.plain,
        isPinned: params.isPinned,
        date: now.toLocaleDateString('ar-EG'),
        createdAtIso: now.toISOString(),
        type: params.attachmentDocId ? 'media' : 'rich',
        attachmentDocId: params.attachmentDocId,
        quickTaskLines: extractQuickTaskLines(params.safeBody),
        roomId: params.activeRoomId,
        tags: composeNoteTags(noteCategory, params.vaultActiveFilter),
    };
}
