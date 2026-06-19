import SecureStoreService from '@/app/services/SecureStoreService';
import type { Note } from '@/app/data/NotesVault';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';

export const NOTES_VAULT_CHANGED = 'hami-notes-vault-changed';

export type NotesSyncMap = Record<string, string>;

const syncMapKey = (userId: string) => `hami_notes_sync_map_${userId}`;

export function loadSyncMap(userId: string): NotesSyncMap {
    try {
        const raw = SecureStoreService.getItemSync(syncMapKey(userId));
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return parsed as NotesSyncMap;
    } catch {
        return {};
    }
}

export function saveSyncMap(userId: string, map: NotesSyncMap): void {
    const serialized = JSON.stringify(map);
    if (serialized === '{}' || serialized === 'null') {
        try {
            const existing = SecureStoreService.getItemSync(syncMapKey(userId));
            if (existing && existing.trim() !== '' && existing !== '{}' && existing !== 'null') {
                return;
            }
        } catch {
            /* ignore */
        }
    }
    SecureStoreService.setItemSync(syncMapKey(userId), serialized);
}

export function emitVaultNotesChanged(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(NOTES_VAULT_CHANGED));
    }
}

function normalizeContent(s: string): string {
    return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function contentFingerprint(body: string, createdAtMs?: number): string {
    const ms = createdAtMs && !Number.isNaN(createdAtMs) ? createdAtMs : 0;
    return `${ms}|${normalizeContent(body)}`;
}

export function vaultToGlobal(v: Note, title = 'ملاحظة قانونية'): GlobalNote {
    return {
        id: v.id,
        title,
        body: v.content,
        isPinned: false,
        date: new Date(v.createdAt).toISOString(),
        type: v.type,
    };
}

export function globalToVault(g: GlobalNote): Note {
    const parsed = g.date ? Date.parse(g.date) : Date.now();
    return {
        id: `g_${String(g.id)}`,
        content: g.body || '',
        type: g.type === 'voice' ? 'voice' : 'text',
        createdAt: Number.isNaN(parsed) ? Date.now() : parsed,
        linkedCaseId: g.linkedFileId != null ? String(g.linkedFileId) : undefined,
    };
}

/** دمج رجعي ثنائي الاتجاه بين globalNotes و notesVault */
export function bidirectionalMerge(
    userId: string,
    globalNotes: GlobalNote[],
    vaultNotes: Note[],
): { mergedGlobal: GlobalNote[]; mergedVault: Note[]; syncMap: NotesSyncMap } {
    const map = { ...loadSyncMap(userId) };
    const vaultIds = new Set(vaultNotes.map((v) => v.id));
    const orphanedGlobalIds = new Set<string>();
    Object.entries(map).forEach(([gid, vid]) => {
        if (!vaultIds.has(vid)) orphanedGlobalIds.add(gid);
    });
    orphanedGlobalIds.forEach((gid) => delete map[gid]);

    let nextVault = [...vaultNotes];
    let nextGlobal = globalNotes.filter((g) => !orphanedGlobalIds.has(String(g.id)));

    const vaultById = new Map(nextVault.map((n) => [n.id, n]));
    const globalById = new Map(nextGlobal.map((n) => [String(n.id), n]));
    const vaultByFp = new Map<string, Note>();
    nextVault.forEach((v) => vaultByFp.set(contentFingerprint(v.content, v.createdAt), v));

    for (const g of nextGlobal) {
        const gid = String(g.id);
        const body = (g.body || '').trim();
        if (!body) continue;
        if (map[gid] && vaultById.has(map[gid])) continue;

        const fp = contentFingerprint(body, g.date ? Date.parse(g.date) : undefined);
        const existing = vaultByFp.get(fp);
        if (existing) {
            map[gid] = existing.id;
            continue;
        }

        const vaultNote = globalToVault(g);
        nextVault = [vaultNote, ...nextVault.filter((n) => n.id !== vaultNote.id)];
        map[gid] = vaultNote.id;
        vaultById.set(vaultNote.id, vaultNote);
        vaultByFp.set(fp, vaultNote);
    }

    for (const v of nextVault) {
        const linkedGid = Object.entries(map).find(([, vid]) => vid === v.id)?.[0];
        if (linkedGid && globalById.has(linkedGid)) continue;

        const fp = contentFingerprint(v.content, v.createdAt);
        const dup = nextGlobal.find(
            (g) =>
                contentFingerprint(g.body || '', g.date ? Date.parse(g.date) : undefined) === fp,
        );
        if (dup) {
            map[String(dup.id)] = v.id;
            continue;
        }

        const g = vaultToGlobal(v);
        if (!globalById.has(String(g.id))) {
            nextGlobal.push(g);
            globalById.set(String(g.id), g);
        }
        map[String(g.id)] = v.id;
    }

    nextGlobal.sort((a, b) => {
        const ta = a.date ? Date.parse(a.date) : 0;
        const tb = b.date ? Date.parse(b.date) : 0;
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });

    saveSyncMap(userId, map);
    return { mergedGlobal: nextGlobal, mergedVault: nextVault, syncMap: map };
}

export function linkGlobalToVault(userId: string, globalId: string | number, vaultId: string): void {
    const map = loadSyncMap(userId);
    map[String(globalId)] = vaultId;
    saveSyncMap(userId, map);
}

export function unlinkGlobal(userId: string, globalId: string | number): void {
    const map = loadSyncMap(userId);
    delete map[String(globalId)];
    saveSyncMap(userId, map);
}

export function vaultIdForGlobal(userId: string, globalId: string | number): string | undefined {
    return loadSyncMap(userId)[String(globalId)];
}
