import type { FileData, Task } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';
import { blob, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';

export function fileTasksToEntries(
    f: FileData,
    fileTitle: string,
    lifecycle: SearchLifecycle,
): GlobalSearchEntry[] {
    const out: GlobalSearchEntry[] = [];
    for (const t of f.tasks ?? []) {
        const title = (t as Task).title?.trim() || (t as { text?: string }).text?.trim();
        if (!title) continue;
        out.push(
            withLifecycle(
                {
                    id: `ftask-${f.id}-${t.id}`,
                    category: 'task',
                    title,
                    subtitle: `مهمة ملف — ${fileTitle}`,
                    _searchStr: blob([title, (t as Task).details, fileTitle, f.caseNo]),
                    navigate: { type: 'file', fileId: f.id },
                },
                lifecycle,
            ),
        );
    }
    return out;
}
