import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { resolveFileSearchLifecycle } from '@/app/services/searchLifecycle';
import type { GlobalSearchCategory, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import {
    blob,
    norm,
    noteTexts,
    partyNames,
    withLifecycle,
} from '@/app/services/search/globalSearchIndexPureHelpers';
import { fileTasksToEntries } from '@/app/services/search/globalSearchIndexFileTasks';
import { lawsuitStagesToEntries } from '@/app/services/search/globalSearchIndexLawsuitStages';

export function fileToEntry(f: FileData & { executionTrashDeletedAt?: string | null }): GlobalSearchEntry[] {
    const lifecycle = resolveFileSearchLifecycle(f);
    const cat: GlobalSearchCategory =
        f.type === 'execution' ? 'execution' : f.type === 'transaction' ? 'transaction' : 'lawsuit';
    const client = f.parties?.find((p) => p.isClient)?.name || f.parties?.[0]?.name || '';
    const jurisdictionHint =
        f.lawsuitJurisdiction === 'personal'
            ? 'أحوال شخصية قضاء أحوال personal status'
            : f.lawsuitJurisdiction === 'civil'
              ? 'قضاء مدني civil'
              : '';
    const applicableLaw = String(
        (f as { applicableLaw?: string }).applicableLaw ??
            (f as { personalApplicableLaw?: string }).personalApplicableLaw ??
            '',
    ).trim();
    const searchBlob = [
        f.caseNo,
        f.court,
        f.docType,
        f.judge,
        client,
        partyNames(f.parties),
        noteTexts(f.notes),
        jurisdictionHint,
        applicableLaw,
    ]
        .filter(Boolean)
        .join(' ');

    const jurisdictionSubtitle =
        f.lawsuitJurisdiction === 'personal'
            ? 'أحوال شخصية'
            : f.lawsuitJurisdiction === 'civil'
              ? 'قضاء مدني'
              : null;

    const main = withLifecycle(
        {
            id: `file-${f.id}`,
            category: cat,
            title:
                f.type === 'transaction'
                    ? client || f.caseNo || 'معاملة'
                    : f.parties?.find((p) => p.isClient)?.name || f.caseNo || 'ملف',
            subtitle:
                f.type === 'transaction'
                    ? f.caseNo
                    : jurisdictionSubtitle
                      ? `${jurisdictionSubtitle} • ${f.court} • ${f.caseNo}`
                      : `${f.court} • ${f.caseNo}`,
            _searchStr: norm(searchBlob),
            navigate: { type: 'file', fileId: f.id },
        },
        lifecycle,
    );

    const extras: GlobalSearchEntry[] = [main];

    for (const p of f.parties ?? []) {
        if (!p.name?.trim()) continue;
        extras.push(
            withLifecycle(
                {
                    id: `party-${f.id}-${p.id}`,
                    category: 'party',
                    title: p.name,
                    subtitle: `${p.role} — ${main.title}`,
                    _searchStr: blob([p.name, p.phone, p.role, searchBlob]),
                    navigate: { type: 'file', fileId: f.id },
                },
                lifecycle,
            ),
        );
    }

    for (const n of f.notes ?? []) {
        if (!n.text?.trim()) continue;
        extras.push(
            withLifecycle(
                {
                    id: `file-note-${f.id}-${n.id}`,
                    category: 'note',
                    title: n.text.slice(0, 80),
                    subtitle: `ملاحظة ملف — ${main.title}`,
                    snippet: n.text,
                    _searchStr: blob([n.text, searchBlob]),
                    navigate: { type: 'file', fileId: f.id },
                },
                lifecycle,
            ),
        );
    }

    extras.push(...fileTasksToEntries(f, main.title, lifecycle));
    if (f.type !== 'execution') {
        extras.push(...lawsuitStagesToEntries(f, main.title, lifecycle));
    }
    return extras;
}
