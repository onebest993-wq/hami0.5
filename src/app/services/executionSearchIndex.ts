import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { resolveFileSearchLifecycle, type SearchLifecycle } from '@/app/services/searchLifecycle';
import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';
import { storageCache } from '@/app/utils/storageCache';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    executionDocumentsStorageKey,
    executionStorageKey,
} from '@/app/utils/executionStorageKeys';
import { readExecutionDossierBlobScanningScopes } from '@/app/utils/executionDossierBlobPersistence';

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
        const raw = readSecureOrDrainLegacySync(key);
        if (!raw) return null;
        return JSON.parse(raw) as unknown;
    } catch {
        return null;
    }
}

/**
 * بلوب الإضبارة للفهرسة — عبر القارئ المدرك لنطاق المستخدم.
 *
 * الكتابة تُقيّد مفتاح البلوب الرئيسي بـ`:u:<uid>`، والقراءة هنا كانت بالمفتاح
 * الحرّ `execution_<id>`. فما دامت الجلسة قائمة تُغطّي الذاكرة المؤقتة الفرق،
 * لكنها تخلو بعد أول إعادة تحميل: فيعود `getItemSync` فارغاً، ويصمت البحث
 * العميق عن كل أحداث السجل الزمني رغم وجودها على القرص. القارئ المقيّد يجرّب
 * مفتاح المستخدم أولاً ثم يمسح النطاقات المرئية له.
 */
function readDossierPayload(id: string): Record<string, unknown> | null {
    const cached = storageCache.get(executionStorageKey(id));
    if (cached && typeof cached === 'object') return cached as Record<string, unknown>;
    return readExecutionDossierBlobScanningScopes(id);
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

        const payload = readDossierPayload(id);
        const haystackParts: string[] = [];
        let firstTitle = '';
        let firstSnippet = '';

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
                haystackParts.push(title, desc, String(ev.type ?? ''));
                if (!firstTitle) {
                    firstTitle = title;
                    firstSnippet = desc;
                }
            }

            const notesLog = Array.isArray(rec.caseNotesLog) ? rec.caseNotesLog : [];
            for (const rawNote of notesLog) {
                if (!rawNote || typeof rawNote !== 'object') continue;
                const n = rawNote as Record<string, unknown>;
                if (n.isDeleted || n.trashedAt) continue;
                const text = String(n.text ?? n.content ?? '').trim();
                if (!text) continue;
                haystackParts.push(text);
                if (!firstTitle) {
                    firstTitle = text.slice(0, 80);
                    firstSnippet = text;
                }
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
                haystackParts.push(name, String(d.folderId ?? ''));
                if (!firstTitle) firstTitle = name;
            }
        }

        if (haystackParts.length === 0) continue;

        const haystack = haystackParts.join(' ');
        out.push(
            stamp(
                {
                    id: `ex-deep-${id}`,
                    category: 'execution',
                    title: firstTitle || fileLabel,
                    subtitle: `إضبارة تنفيذ — ${fileLabel}`,
                    snippet: firstSnippet || undefined,
                    _searchStr: blob([haystack.slice(0, 8_000), fileLabel]),
                    navigate: { type: 'file', fileId: f.id },
                },
                lifecycle,
            ),
        );
    }

    return out;
}
