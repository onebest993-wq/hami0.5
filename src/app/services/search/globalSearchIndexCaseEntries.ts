import type { LegalCase } from '@/app/stores/caseStore';
import { resolveCaseSearchLifecycle } from '@/app/services/searchLifecycle';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { blob, norm, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';

export function caseToEntry(c: LegalCase): GlobalSearchEntry[] {
    const lifecycle = resolveCaseSearchLifecycle(c.status);
    const searchBlob = `${c.title} ${c.caseNo} ${c.court || ''} ${c.clientName} ${c.opponentName}`;
    const entries: GlobalSearchEntry[] = [
        withLifecycle(
            {
                id: `case-${c.id}`,
                category: 'case',
                title: c.title,
                subtitle: `${c.caseNo} • ${c.court || ''}`,
                _searchStr: norm(searchBlob),
                navigate: { type: 'case', caseId: c.id },
            },
            lifecycle,
        ),
    ];
    if (c.clientName) {
        entries.push(
            withLifecycle(
                {
                    id: `case-client-${c.id}`,
                    category: 'party',
                    title: c.clientName,
                    subtitle: `موكل — ${c.title}`,
                    _searchStr: blob([c.clientName, searchBlob]),
                    navigate: { type: 'case', caseId: c.id },
                },
                lifecycle,
            ),
        );
    }
    if (c.opponentName) {
        entries.push(
            withLifecycle(
                {
                    id: `case-opponent-${c.id}`,
                    category: 'party',
                    title: c.opponentName,
                    subtitle: `خصم — ${c.title}`,
                    _searchStr: blob([c.opponentName, searchBlob]),
                    navigate: { type: 'case', caseId: c.id },
                },
                lifecycle,
            ),
        );
    }
    for (const n of c.notes ?? []) {
        if (n.isDeleted || !n.content?.trim()) continue;
        entries.push(
            withLifecycle(
                {
                    id: `case-note-${c.id}-${n.id}`,
                    category: 'note',
                    title: n.content.slice(0, 80),
                    subtitle: `ملاحظة — ${c.title}`,
                    snippet: n.content,
                    _searchStr: blob([n.content, searchBlob]),
                    navigate: { type: 'case', caseId: c.id },
                },
                lifecycle,
            ),
        );
    }
    return entries;
}
