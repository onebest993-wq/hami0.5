import type { RepositoryDocument, SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';
import type { GlobalSearchEntry, PreparedDocsVaultDoc } from '@/app/services/globalSearchIndex';
import { blob, norm, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';

const LIFECYCLE_ACTIVE: SearchLifecycle = 'active';

export type GlobalNoteRow = {
    id: number | string;
    title?: string;
    body?: string;
    type?: string;
    transcript?: string;
    voiceDurationSec?: number;
};

export function vaultToEntry(d: SmartVaultDoc): GlobalSearchEntry {
    const text = `${d.title} ${d.fileName} ${d.tags.join(' ')} ${d.aiSummary || ''}`;
    return withLifecycle(
        {
            id: `vault-${d.id}`,
            category: 'vault',
            title: d.title || d.fileName,
            subtitle: d.tags.length ? d.tags.join(' • ') : 'مخزن الملفات الذكي',
            snippet: d.aiSummary || undefined,
            _searchStr: norm(text),
            navigate: { type: 'vault' },
        },
        LIFECYCLE_ACTIVE,
    );
}

export function repositoryToEntry(d: RepositoryDocument): GlobalSearchEntry {
    const text = `${d.title} ${d.description} ${d.type} ${d.fileName} ${d.authorName}`;
    return withLifecycle(
        {
            id: `repo-${d.id}`,
            category: 'repository',
            title: d.title,
            subtitle: `${d.type} • ${d.authorName}`,
            snippet: d.description || undefined,
            _searchStr: norm(text),
            navigate: { type: 'repository' },
        },
        LIFECYCLE_ACTIVE,
    );
}

export function docsVaultEntriesFromPrepared(
    docs: PreparedDocsVaultDoc[],
    fileLifecycleById: Map<string, SearchLifecycle>,
): GlobalSearchEntry[] {
    return docs.map((d) => {
        const linkedLifecycle = d.caseId ? fileLifecycleById.get(String(d.caseId)) : undefined;
        return withLifecycle(
            {
                id: `docs-vault-${d.id}`,
                category: 'vault' as const,
                title: d.name,
                subtitle: d.caseId ? `مستند إضبارة #${d.caseId}` : 'مستندات الإضبارة',
                _searchStr: blob([d.name, d.tags?.join(' '), d.caseId]),
                navigate: d.caseId ? { type: 'file', fileId: d.caseId } : { type: 'vault' },
            },
            linkedLifecycle ?? LIFECYCLE_ACTIVE,
        );
    });
}

export function noteRowToEntry(n: GlobalNoteRow, source: string): GlobalSearchEntry {
    const title = n.title?.trim() || 'ملاحظة';
    const body = n.body?.trim() || '';
    const isVoice = n.type === 'voice' || body.startsWith('data:audio') || body.startsWith('hami-voice-ref:');
    const transcript = n.transcript?.trim();
    return withLifecycle(
        {
            id: `gnote-${n.id}-${source}`,
            category: isVoice ? 'voice' : 'note',
            title: isVoice ? title || 'تسجيل صوتي' : title,
            subtitle: isVoice ? (transcript ? source : 'مفكرة — صوت') : source,
            snippet: isVoice ? transcript || undefined : body,
            _searchStr: blob([title, body, transcript, isVoice ? 'صوت تسجيل' : '']),
            navigate: isVoice
                ? { type: 'voice', noteId: String(n.id) }
                : { type: 'note', noteId: String(n.id) },
        },
        LIFECYCLE_ACTIVE,
    );
}
