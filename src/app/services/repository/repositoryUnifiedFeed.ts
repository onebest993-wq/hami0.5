import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { docMatchesCategoryFilter, noteMatchesRepositoryActionCategory } from '@/app/services/vaultCustomCategories';
import { collectDossierNotes, type DossierNoteRef } from './repositoryDossierNotes';
import { resolveDossierNoteBody } from './repositoryDossierNoteSync';
import {
    itemMatchesRoomFilter,
    type RepositoryRoomFilter,
} from './repositoryRooms';
import { stripRepositoryHtml } from './stripRepositoryHtml';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';

export type RepositoryFeedFilter = 'all' | 'media' | 'drafts' | 'dossier';

export type RepositoryFeedItem =
    | { kind: 'global'; note: GlobalNote; sortKey: number }
    | { kind: 'dossier'; ref: DossierNoteRef; body: string; sortKey: number }
    | { kind: 'vault_doc'; doc: SmartVaultDoc; sortKey: number };

const FILTER_LABELS: Record<RepositoryFeedFilter, string> = {
    all: 'الكل',
    media: 'صور وملفات',
    drafts: 'مسودات حرة',
    dossier: 'ملاحظات الأضابير',
};

export const REPOSITORY_FEED_FILTERS: RepositoryFeedFilter[] = ['all', 'media', 'drafts', 'dossier'];

export function repositoryFeedFilterLabel(filter: RepositoryFeedFilter): string {
    return FILTER_LABELS[filter];
}

function parseSortKey(raw?: string): number {
    if (!raw) return Date.now();
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? Date.now() : ms;
}

function globalNoteSortKey(note: GlobalNote): number {
    return parseSortKey(note.createdAtIso ?? note.date);
}

function isGlobalInInbox(note: GlobalNote): boolean {
    if (note.repositoryInboxHidden) return false;
    if (note.linkedFileId != null) return false;
    return true;
}

function isMediaNote(note: GlobalNote): boolean {
    return Boolean(note.attachmentDocId) || note.type === 'media';
}

function isDraftNote(note: GlobalNote): boolean {
    return !isMediaNote(note);
}

export function buildRepositoryFeed(input: {
    globalNotes: GlobalNote[];
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    vaultDocs: SmartVaultDoc[];
}): RepositoryFeedItem[] {
    const items: RepositoryFeedItem[] = [];

    for (const note of input.globalNotes) {
        if (!isGlobalInInbox(note)) continue;
        items.push({ kind: 'global', note, sortKey: globalNoteSortKey(note) });
    }

    const dossierRefs = collectDossierNotes(input.lawsuitFiles, input.executionFiles);
    for (const ref of dossierRefs) {
        items.push({
            kind: 'dossier',
            ref,
            body: resolveDossierNoteBody(ref, input.lawsuitFiles, input.executionFiles),
            sortKey: parseSortKey(ref.date),
        });
    }

    for (const doc of input.vaultDocs) {
        if (doc.boundDossierId) continue;
        const attachedToNote = input.globalNotes.some((n) => n.attachmentDocId === doc.id);
        if (attachedToNote) continue;
        items.push({
            kind: 'vault_doc',
            doc,
            sortKey: parseSortKey(doc.createdAt ?? doc.updatedAt),
        });
    }

    return items.sort((a, b) => {
        const pinA = a.kind === 'global' ? a.note.isPinned : a.kind === 'dossier' ? a.ref.isPinned : false;
        const pinB = b.kind === 'global' ? b.note.isPinned : b.kind === 'dossier' ? b.ref.isPinned : false;
        if (pinA && !pinB) return -1;
        if (!pinA && pinB) return 1;
        return b.sortKey - a.sortKey;
    });
}

export function filterRepositoryFeed(
    items: RepositoryFeedItem[],
    filter: RepositoryFeedFilter,
): RepositoryFeedItem[] {
    if (filter === 'all') return items;
    if (filter === 'dossier') return items.filter((item) => item.kind === 'dossier');
    if (filter === 'media') {
        return items.filter(
            (item) =>
                item.kind === 'vault_doc' ||
                (item.kind === 'global' && isMediaNote(item.note)),
        );
    }
    return items.filter(
        (item) => item.kind === 'global' && isDraftNote(item.note),
    );
}

/**
 * نطاق الغرفة: ملاحظات عامة + وثائق حسب roomId.
 * ملاحظات الأضابير بلا roomId — تظهر في المستودع العام فقط.
 */
export function filterRepositoryFeedByRoom(
    items: RepositoryFeedItem[],
    filter: RepositoryRoomFilter,
): RepositoryFeedItem[] {
    return items.filter((item) => {
        if (item.kind === 'dossier') return filter === 'main';
        const roomId = item.kind === 'global' ? item.note.roomId : item.doc.roomId;
        return itemMatchesRoomFilter(roomId, filter);
    });
}

export function countRepositoryFeedByFilter(items: RepositoryFeedItem[]): Record<RepositoryFeedFilter, number> {
    let media = 0;
    let drafts = 0;
    let dossier = 0;
    for (const item of items) {
        if (item.kind === 'dossier') {
            dossier += 1;
            continue;
        }
        if (item.kind === 'vault_doc') {
            media += 1;
            continue;
        }
        if (isMediaNote(item.note)) media += 1;
        else drafts += 1;
    }
    return { all: items.length, media, drafts, dossier };
}

export function repositoryFeedItemKey(item: RepositoryFeedItem): string {
    if (item.kind === 'global') return `g-${item.note.id}`;
    if (item.kind === 'dossier') return item.ref.id;
    return `v-${item.doc.id}`;
}

/** قوائم جاهزة لكل تبويب — يُبدَّل العرض بـ hidden دون إعادة mount */
export function buildRepositoryVisibleFeedByMainFilter(
    feedItems: RepositoryFeedItem[],
    vaultCategory: string,
    searchQuery: string,
    vaultDocs: SmartVaultDoc[],
): Record<RepositoryFeedFilter, RepositoryFeedItem[]> {
    const result = {} as Record<RepositoryFeedFilter, RepositoryFeedItem[]>;
    for (const filter of REPOSITORY_FEED_FILTERS) {
        let slice = filterRepositoryFeed(feedItems, filter);
        slice = filterRepositoryFeedByCustomCategory(slice, vaultCategory, vaultDocs);
        slice = searchRepositoryFeed(slice, searchQuery, vaultDocs);
        result[filter] = slice;
    }
    return result;
}

function haystackForItem(item: RepositoryFeedItem, vaultDocs: SmartVaultDoc[]): string[] {
    if (item.kind === 'global') {
        const note = item.note;
        const parts = [note.title, stripRepositoryHtml(note.body || ''), ...(note.tags ?? []), ...(note.quickTaskLines ?? [])];
        if (note.attachmentDocId) {
            const doc = vaultDocs.find((d) => d.id === note.attachmentDocId);
            if (doc) {
                parts.push(doc.title, doc.lawyerNote ?? '', doc.customCategory ?? '', doc.fileName ?? '');
            }
        }
        return parts;
    }
    if (item.kind === 'dossier') {
        return [
            item.ref.title,
            item.ref.excerpt,
            item.ref.dossierLabel,
            stripRepositoryHtml(item.body),
            item.ref.dossierKind === 'lawsuit' ? 'دعوى' : 'تنفيذ',
        ];
    }
    const doc = item.doc;
    return [doc.title, doc.lawyerNote ?? '', doc.customCategory ?? '', doc.fileName ?? '', doc.type ?? ''];
}

export function searchRepositoryFeed(
    items: RepositoryFeedItem[],
    query: string,
    vaultDocs: SmartVaultDoc[] = [],
): RepositoryFeedItem[] {
    const q = clampGlobalSearchQuery(query);
    if (!q.trim()) return items;
    return items.filter((item) =>
        archiveTextMatchesQuery(haystackForItem(item, vaultDocs).join(' '), q),
    );
}

export function filterRepositoryFeedByCustomCategory(
    items: RepositoryFeedItem[],
    category: string,
    vaultDocs: SmartVaultDoc[],
): RepositoryFeedItem[] {
    if (!category || category === 'الكل') return items;
    return items.filter((item) => {
        if (item.kind === 'vault_doc') {
            return docMatchesCategoryFilter(item.doc, category);
        }
        if (item.kind === 'global') {
            if (noteMatchesRepositoryActionCategory(item.note, category)) return true;
            const tags = item.note.tags ?? [];
            if (tags.some((t) => t.trim() === category)) return true;
            const attId = item.note.attachmentDocId;
            if (attId) {
                const doc = vaultDocs.find((d) => d.id === attId);
                if (doc && docMatchesCategoryFilter(doc, category)) return true;
            }
            return false;
        }
        return false;
    });
}

export type RepositoryEntryLayoutMode = 'text-only' | 'image-dominant' | 'text-dominant';

export function resolveRepositoryEntryLayout(
    bodyHtml: string,
    attachment?: SmartVaultDoc | null,
): RepositoryEntryLayoutMode {
    const plainLen = stripRepositoryHtml(bodyHtml).length;
    const hasImage = Boolean(attachment?.signedUrl && attachment.type === 'image');
    if (!hasImage) return 'text-only';
    if (plainLen <= 100) return 'image-dominant';
    return 'text-dominant';
}

export function formatRepositoryTimestamp(raw?: string): string {
    const d = raw ? new Date(raw) : new Date();
    const target = Number.isNaN(d.getTime()) ? new Date() : d;
    return target.toLocaleString('ar-EG', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
}
