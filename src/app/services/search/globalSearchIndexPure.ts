import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SearchLifecycle } from '@/app/services/searchLifecycle';
import type { BuildGlobalSearchIndexInput, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import {
    getCachedFileSearchEntries,
    rememberFileSearchEntries,
} from '@/app/services/search/globalSearchFileSliceCache';
import { caseToEntry } from '@/app/services/search/globalSearchIndexCaseEntries';
import { criminalToEntry } from '@/app/services/search/globalSearchIndexCriminalEntries';
import {
    calendarToEntry,
    communityPostToEntries,
    notificationToEntry,
    quantumTaskToEntry,
    threadingTaskToEntry,
    threadingTxToEntry,
    urgentToEntry,
} from '@/app/services/search/globalSearchIndexExtrasEntries';
import { fileToEntry } from '@/app/services/search/globalSearchIndexFileEntries';
import { lawsuitLifecycleIndexToSearchEntries } from '@/app/services/search/globalSearchIndexLawsuitLifecycleEntries';
import { blob, isSearchEntryVisible, norm, withLifecycle } from '@/app/services/search/globalSearchIndexPureHelpers';
import {
    docsVaultEntriesFromPrepared,
    noteRowToEntry,
    repositoryToEntry,
    vaultToEntry,
} from '@/app/services/search/globalSearchIndexVaultEntries';

const LIFECYCLE_ACTIVE: SearchLifecycle = 'active';

/** فهرس موحّد — Worker-safe (بيانات JSON جاهزة من الخيط الرئيسي) */
export function buildGlobalSearchIndex(input: BuildGlobalSearchIndexInput): GlobalSearchEntry[] {
    const seen = new Set<string>();
    const list: GlobalSearchEntry[] = [];
    const fileLifecycleById = new Map<string, SearchLifecycle>();

    const push = (e: GlobalSearchEntry) => {
        if (!isSearchEntryVisible(e)) return;
        if (seen.has(e.id)) return;
        seen.add(e.id);
        list.push(e);
    };

    /** metadata من lifecycleIndex — يُسمح بـ deleted للوصول إلى المهملات غير المحمّلة */
    const pushLifecycleIndexEntry = (e: GlobalSearchEntry) => {
        if (seen.has(e.id)) return;
        seen.add(e.id);
        list.push(e);
    };

    const indexFile = (f: FileData & { executionTrashDeletedAt?: string | null }) => {
        const cached = getCachedFileSearchEntries(f);
        const entries = cached ?? fileToEntry(f);
        if (!cached) rememberFileSearchEntries(f, entries);
        if (entries.length > 0) {
            fileLifecycleById.set(String(f.id), entries[0].lifecycle);
        }
        for (const entry of entries) {
            push(entry);
        }
    };

    for (const f of input.files) {
        indexFile(f);
    }

    const indexedLawsuitIds = new Set<string>();
    for (const f of input.files) indexedLawsuitIds.add(String(f.id));
    for (const entry of lawsuitLifecycleIndexToSearchEntries(
        input.lawsuitLifecycleIndex,
        indexedLawsuitIds,
    )) {
        pushLifecycleIndexEntry(entry);
    }

    for (const f of input.executionFiles ?? []) {
        indexFile({ ...f, type: 'execution' });
    }

    for (const entry of input.preparedExecutionDeepEntries ?? []) {
        push(entry);
    }

    const fileIds = new Set<string>();
    for (const f of input.files) fileIds.add(String(f.id));
    for (const f of input.executionFiles ?? []) fileIds.add(String(f.id));

    for (const c of input.cases) {
        if (!fileIds.has(c.id)) caseToEntry(c).forEach(push);
    }

    for (const c of input.criminalCases ?? []) {
        criminalToEntry(c).forEach(push);
    }

    const seenNoteIds = new Set<string>();
    const preparedVaultNotes = input.preparedVaultNotes ?? [];
    const preparedStoredNotes = input.preparedStoredNotes ?? [];
    const preparedDocsVault = input.preparedDocsVault ?? [];

    for (const n of preparedVaultNotes) {
        seenNoteIds.add(String(n.id));
        const isVoice = n.type === 'voice';
        push(
            withLifecycle(
                {
                    id: `nv-${n.id}`,
                    category: isVoice ? 'voice' : 'note',
                    title: isVoice ? 'تسجيل صوتي' : n.content.slice(0, 80) || 'ملاحظة',
                    subtitle: isVoice ? 'مفكرة — صوت' : 'مفكرة الملاحظات',
                    snippet: isVoice ? undefined : n.content,
                    _searchStr: blob([n.content, isVoice ? 'صوت' : '']),
                    navigate: isVoice
                        ? { type: 'voice', noteId: String(n.id) }
                        : { type: 'note', noteId: String(n.id) },
                },
                LIFECYCLE_ACTIVE,
            ),
        );
    }

    for (const n of input.globalNotes) {
        if (seenNoteIds.has(String(n.id))) continue;
        seenNoteIds.add(String(n.id));
        push(noteRowToEntry(n, 'المفكرة العامة'));
    }

    for (const n of preparedStoredNotes) {
        if (seenNoteIds.has(String(n.id))) continue;
        seenNoteIds.add(String(n.id));
        push(noteRowToEntry(n, 'ملاحظات المحامي'));
    }

    docsVaultEntriesFromPrepared(preparedDocsVault, fileLifecycleById).forEach(push);

    for (const n of input.notifications ?? []) {
        if (n.title?.trim() || n.message?.trim()) push(notificationToEntry(n));
    }

    const extras = input.extras;
    if (extras) {
        extras.vaultDocs.forEach((d) => push(vaultToEntry(d)));
        extras.repositoryDocs.forEach((d) => push(repositoryToEntry(d)));
        extras.quantumTasks.forEach((t) => push(quantumTaskToEntry(t, fileLifecycleById)));
        extras.calendarEvents.forEach((e) => push(calendarToEntry(e, fileLifecycleById)));
        extras.urgentCases.forEach((c, i) => urgentToEntry(c, i).forEach(push));

        const txById = new Map(extras.threadingTransactions.map((t) => [t.id, t]));
        extras.threadingTransactions.forEach((tx) => push(threadingTxToEntry(tx)));
        for (const t of extras.threadingTasks) {
            const tx = txById.get(t.transactionId);
            push(threadingTaskToEntry(t, tx?.clientName || tx?.title || 'معاملة', t.transactionId));
        }
        extras.communityPosts.forEach((p) => communityPostToEntries(p).forEach(push));
    }

    if (input.profileLine?.trim()) {
        push(
            withLifecycle(
                {
                    id: 'profile-self',
                    category: 'profile',
                    title: 'الملف الشخصي',
                    subtitle: input.profileLine.trim(),
                    _searchStr: norm(input.profileLine),
                    navigate: { type: 'profile' },
                },
                LIFECYCLE_ACTIVE,
            ),
        );
    }

    return list;
}
