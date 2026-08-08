import type { LawsuitLifecycleIndex } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';
import { blob, norm, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';

function lifecycleFromIndexStatus(status: 'active' | 'archived' | 'deleted'): SearchLifecycle {
    if (status === 'deleted') return 'deleted';
    if (status === 'archived') return 'archived';
    return 'active';
}

/** إدخالات خفيفة من فهرس lifecycle — للمخزن/المهملات غير المحمّلة في الذاكرة */
export function lawsuitLifecycleIndexToSearchEntries(
    index: LawsuitLifecycleIndex | undefined,
    indexedFileIds: Set<string>,
): GlobalSearchEntry[] {
    if (!index) return [];
    const entries: GlobalSearchEntry[] = [];
    for (const entry of Object.values(index.entries)) {
        if (entry.status === 'active') continue;
        if (indexedFileIds.has(entry.id)) continue;
        const lifecycle = lifecycleFromIndexStatus(entry.status);
        const displayTitle = entry.clientName || entry.title || entry.caseNo || 'ملف دعوى';
        const baseSubtitle = [
            entry.status === 'deleted' ? 'سلة المهملات' : null,
            entry.court,
            entry.caseNo ? `إضبارة • ${entry.caseNo}` : 'دعوى قضائية',
        ]
            .filter(Boolean)
            .join(' • ');
        entries.push(
            withLifecycle(
                {
                    id: `file-${entry.id}`,
                    category: 'lawsuit',
                    title: displayTitle,
                    subtitle: baseSubtitle,
                    _searchStr: norm(
                        blob([
                            entry.searchHaystack,
                            entry.caseNo,
                            entry.title,
                            entry.clientName,
                            entry.court,
                            entry.type,
                        ]),
                    ),
                    navigate: { type: 'file', fileId: entry.id },
                },
                lifecycle,
            ),
        );
    }
    return entries;
}

export function lawsuitLifecycleIndexSignature(index: LawsuitLifecycleIndex | undefined): string {
    if (!index) return '0';
    const parts: string[] = [
        String(index.counts.active),
        String(index.counts.archived),
        String(index.counts.trash),
    ];
    for (const entry of Object.values(index.entries)) {
        if (entry.status === 'active') continue;
        parts.push(
            `${entry.id}:${entry.status}:${entry.caseNo ?? ''}:${entry.title ?? ''}:${entry.type ?? ''}:${entry.court ?? ''}:${entry.clientName ?? ''}:${entry.searchHaystack ?? ''}`,
        );
    }
    return parts.join('~');
}
