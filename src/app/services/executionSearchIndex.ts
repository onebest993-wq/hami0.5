import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { resolveFileSearchLifecycle, type SearchLifecycle } from '@/app/services/searchLifecycle';
import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';
import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import {
    executionDocumentsStorageKey,
    executionStorageKey,
} from '@/app/utils/executionStorageKeys';

function norm(text: string): string {
    return normalizeArabic(text).toLowerCase();
}

function blob(parts: (string | undefined | null)[]): string {
    return norm(parts.filter(Boolean).join(' '));
}

function readStorageJson(key: string): unknown {
    try {
        const cached = storageCache.get(key);
        if (cached != null) return cached;
        const raw = SecureStoreService.getItemSync(key);
        if (!raw) return null;
        return JSON.parse(raw) as unknown;
    } catch {
        return null;
    }
}

type EntryDraft = Omit<GlobalSearchEntry, 'lifecycle'>;

/** أحداث السجل الزمني ومستندات مخزن كل إضبارة تنفيذ */
export function buildExecutionDeepSearchEntries(
    executionFiles: (FileData & { executionTrashDeletedAt?: string | null })[],
    stamp: (draft: EntryDraft, lifecycle: SearchLifecycle) => GlobalSearchEntry,
): GlobalSearchEntry[] {
    const out: GlobalSearchEntry[] = [];

    for (const f of executionFiles) {
        const id = String(f.id);
        const lifecycle = resolveFileSearchLifecycle(f);
        const fileLabel = f.caseNo || f.parties?.[0]?.name || id;

        const payload = readStorageJson(executionStorageKey(id));
        if (payload && typeof payload === 'object') {
            const rec = payload as Record<string, unknown>;
            const events = Array.isArray(rec.timelineEvents) ? rec.timelineEvents : [];
            for (const rawEv of events) {
                if (!rawEv || typeof rawEv !== 'object') continue;
                const ev = rawEv as Record<string, unknown>;
                if (ev.trashedAt) continue;
                const title = String(ev.title ?? '').trim();
                if (!title) continue;
                const desc = String(ev.description ?? ev.details ?? '').trim();
                out.push(
                    stamp(
                        {
                            id: `ex-timeline-${id}-${ev.id ?? title}`,
                            category: 'execution',
                            title,
                            subtitle: `سجل زمني — ${fileLabel}`,
                            snippet: desc || undefined,
                            _searchStr: blob([title, desc, String(ev.type ?? ''), fileLabel]),
                            navigate: { type: 'file', fileId: f.id },
                        },
                        lifecycle,
                    ),
                );
            }

            const notesLog = Array.isArray(rec.caseNotesLog) ? rec.caseNotesLog : [];
            for (const rawNote of notesLog) {
                if (!rawNote || typeof rawNote !== 'object') continue;
                const n = rawNote as Record<string, unknown>;
                if (n.isDeleted || n.trashedAt) continue;
                const text = String(n.text ?? n.content ?? '').trim();
                if (!text) continue;
                out.push(
                    stamp(
                        {
                            id: `ex-note-${id}-${n.id ?? text.slice(0, 20)}`,
                            category: 'note',
                            title: text.slice(0, 80),
                            subtitle: `ملاحظة تنفيذ — ${fileLabel}`,
                            snippet: text,
                            _searchStr: blob([text, fileLabel]),
                            navigate: { type: 'file', fileId: f.id },
                        },
                        lifecycle,
                    ),
                );
            }
        }

        const docsRaw = readStorageJson(executionDocumentsStorageKey(id));
        if (Array.isArray(docsRaw)) {
            for (const rawDoc of docsRaw) {
                if (!rawDoc || typeof rawDoc !== 'object') continue;
                const d = rawDoc as Record<string, unknown>;
                if (d.trashedAt) continue;
                const name = String(d.name ?? d.originalFileName ?? '').trim();
                if (!name) continue;
                out.push(
                    stamp(
                        {
                            id: `ex-doc-${id}-${d.id ?? name}`,
                            category: 'vault',
                            title: name,
                            subtitle: `مستند إضبارة تنفيذ — ${fileLabel}`,
                            _searchStr: blob([name, String(d.folderId ?? ''), fileLabel]),
                            navigate: { type: 'file', fileId: f.id },
                        },
                        lifecycle,
                    ),
                );
            }
        }
    }

    return out;
}
