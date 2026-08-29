import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { resolveFileSearchLifecycle } from '@/app/services/searchLifecycle';
import type { GlobalSearchCategory, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import {
    clipSearchHaystack,
    norm,
    noteTexts,
    partyNames,
    withLifecycle,
} from '@/app/services/search/globalSearchIndexPureHelpers';
import { fileTasksSearchHaystack } from '@/app/services/search/globalSearchIndexFileTasks';
import { lawsuitStagesSearchHaystack } from '@/app/services/search/globalSearchIndexLawsuitStages';

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
    const searchBlob = clipSearchHaystack(
        [
            f.caseNo,
            f.court,
            f.docType,
            f.judge,
            client,
            partyNames(f.parties),
            noteTexts(f.notes),
            fileTasksSearchHaystack(f),
            f.type === 'execution' ? '' : lawsuitStagesSearchHaystack(f),
            jurisdictionHint,
            applicableLaw,
        ]
            .filter(Boolean)
            .join(' '),
    );

    const jurisdictionSubtitle =
        f.lawsuitJurisdiction === 'personal'
            ? 'أحوال شخصية'
            : f.lawsuitJurisdiction === 'civil'
              ? 'قضاء مدني'
              : null;

    return [
        withLifecycle(
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
                            ? `إضبارة · ${f.caseNo}`
                            : 'إضبارة'
                        : jurisdictionSubtitle
                          ? `${jurisdictionSubtitle} • ${f.court} • ${f.caseNo}`
                          : `${f.court} • ${f.caseNo}`,
                _searchStr: norm(searchBlob),
                navigate: { type: 'file', fileId: f.id },
            },
            lifecycle,
        ),
    ];
}
