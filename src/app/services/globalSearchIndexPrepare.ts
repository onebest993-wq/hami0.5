import { notesVault } from '@/app/data/NotesVault';
import { docsVault } from '@/app/data/DocsVault';
import type { BuildGlobalSearchIndexInput, PreparedDocsVaultDoc, PreparedVaultNote } from '@/app/services/globalSearchIndex';
import { buildExecutionDeepSearchEntries } from '@/app/services/executionSearchIndex';
import {
    composeGlobalSearchIndexCacheKey,
    globalSearchExtrasSignature,
} from '@/app/services/globalSearchExtrasSignature';
import { fileSearchIndexSignature } from '@/app/services/search/globalSearchFileSliceCache';
import { lawsuitLifecycleIndexSignature } from '@/app/services/search/globalSearchIndexLawsuitLifecycleEntries';
import { djb2Hash } from '@/app/utils/djb2';

export type GlobalSearchIndexSource = Omit<
    BuildGlobalSearchIndexInput,
    'preparedVaultNotes' | 'preparedDocsVault' | 'preparedStoredNotes'
>;

/** يجمع بيانات vault/localStorage على الخيط الرئيسي — جاهزة للـ Worker أو idle build. */
export function prepareGlobalSearchIndexInput(source: GlobalSearchIndexSource): BuildGlobalSearchIndexInput {
    const preparedVaultNotes: PreparedVaultNote[] = [];
    if (source.userId) {
        notesVault.setUserScope(source.userId);
        for (const n of notesVault.getNotes()) {
            preparedVaultNotes.push({
                id: n.id,
                content: n.content,
                type: n.type,
            });
        }
    }

    const preparedDocsVault: PreparedDocsVaultDoc[] = [];
    if (source.userId) {
        docsVault.setUserScope(source.userId);
        for (const d of docsVault.getDocuments()) {
            preparedDocsVault.push({
                id: d.id,
                name: d.name,
                caseId: d.caseId,
                tags: d.tags,
            });
        }
    }

    const preparedExecutionDeepEntries =
        source.executionFiles?.length ?
            buildExecutionDeepSearchEntries(source.executionFiles, (draft, lifecycle) => ({
                ...draft,
                lifecycle,
            }))
        :   [];

    return {
        ...source,
        preparedVaultNotes,
        preparedDocsVault,
        preparedExecutionDeepEntries,
    };
}

export function computeGlobalSearchIndexKey(input: BuildGlobalSearchIndexInput): string {
    const extrasSig = globalSearchExtrasSignature(input.extras);

    // توقيع واعٍ بالمحتوى — يلتقط تعديل العنوان/الأطراف/الملاحظات/المراحل دون انتظار تغيّر العدد
    const filesSig = djb2Hash(input.files.map(fileSearchIndexSignature).join('~'));
    const executionFilesSig = djb2Hash(
        (input.executionFiles ?? []).map((f) => fileSearchIndexSignature({ ...f, type: 'execution' })).join('~'),
    );
    const notesSig = djb2Hash(
        input.globalNotes
            .map((n) => `${String(n.id ?? '')}:${n.type ?? ''}:${n.title ?? ''}:${n.body ?? ''}`)
            .join('~'),
    );

    const lawsuitIndexSig = djb2Hash(lawsuitLifecycleIndexSignature(input.lawsuitLifecycleIndex));

    const core = [
        input.userId ?? '',
        input.cacheGeneration ?? 0,
        input.files.length,
        filesSig,
        lawsuitIndexSig,
        input.executionFiles?.length ?? 0,
        executionFilesSig,
        input.globalNotes.length,
        notesSig,
        input.cases.length,
        input.criminalCases?.length ?? 0,
        input.profileLine ?? '',
        input.notifications?.length ?? 0,
        input.preparedVaultNotes?.length ?? -1,
        input.preparedDocsVault?.length ?? -1,
        input.preparedStoredNotes?.length ?? -1,
        input.preparedExecutionDeepEntries?.length ?? -1,
    ].join('|');
    return composeGlobalSearchIndexCacheKey(core, extrasSig);
}
