import { notesVault } from '@/app/data/NotesVault';
import { docsVault } from '@/app/data/DocsVault';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { STORAGE_KEYS } from '@/app/utils/constants';
import type { BuildGlobalSearchIndexInput, PreparedDocsVaultDoc, PreparedVaultNote } from '@/app/services/globalSearchIndex';

type GlobalNoteRow = { id: number | string; title?: string; body?: string; type?: string };

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

    const preparedDocsVault: PreparedDocsVaultDoc[] = docsVault.getDocuments().map((d) => ({
        id: d.id,
        name: d.name,
        caseId: d.caseId,
        tags: d.tags,
    }));

    const storedRaw = persistenceRepository.load<GlobalNoteRow[]>(STORAGE_KEYS.LAWYER_NOTES);
    const preparedStoredNotes = Array.isArray(storedRaw) ? storedRaw : [];

    return {
        ...source,
        preparedVaultNotes,
        preparedDocsVault,
        preparedStoredNotes,
    };
}

export function computeGlobalSearchIndexKey(input: BuildGlobalSearchIndexInput): string {
    const extras = input.extras;
    const extrasSig = extras
        ? [
              extras.quantumTasks.length,
              extras.calendarEvents.length,
              extras.urgentCases.length,
              extras.vaultDocs.length,
              extras.repositoryDocs.length,
              extras.threadingTransactions.length,
              extras.communityPosts.length,
          ].join('.')
        : '0';

    const sampleIds = (items: { id?: unknown }[], take = 4) =>
        items
            .slice(0, take)
            .map((x) => String(x.id ?? ''))
            .join(',');

    return [
        input.userId ?? '',
        input.cacheGeneration ?? 0,
        input.files.length,
        sampleIds(input.files),
        input.executionFiles?.length ?? 0,
        sampleIds(input.executionFiles ?? []),
        input.globalNotes.length,
        input.cases.length,
        input.criminalCases?.length ?? 0,
        input.profileLine ?? '',
        input.notifications?.length ?? 0,
        input.preparedVaultNotes?.length ?? -1,
        input.preparedDocsVault?.length ?? -1,
        input.preparedStoredNotes?.length ?? -1,
        extrasSig,
    ].join('|');
}
