import { executionStorageKey } from '@/app/utils/executionStorageKeysLite';
import { readScopedSecureOrDrainLegacySync } from '@/app/utils/readScopedSecureOrDrainLegacySync';
import type { LooseArchiveFile } from './types';

function executionArchiveLocalStorageKey(file: LooseArchiveFile): string | null {
    const id = (file as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) return executionStorageKey(id.trim());
    if (typeof id === 'number' && Number.isFinite(id)) return executionStorageKey(String(id));
    return null;
}

export function mergedPreviewTimelineEvents(
    file: LooseArchiveFile | null
): NonNullable<LooseArchiveFile['timelineEvents']> {
    if (!file) return [];
    const fromFile = Array.isArray(file.timelineEvents) ? file.timelineEvents : [];
    if (typeof window === 'undefined') return fromFile;

    const lsKey = executionArchiveLocalStorageKey(file);
    if (!lsKey) return fromFile;

    let fromLs: NonNullable<LooseArchiveFile['timelineEvents']> = [];
    try {
        const raw = readScopedSecureOrDrainLegacySync(lsKey);
        if (raw) {
            const parsed = JSON.parse(raw) as { timelineEvents?: unknown };
            if (Array.isArray(parsed?.timelineEvents)) {
                fromLs = parsed.timelineEvents as NonNullable<LooseArchiveFile['timelineEvents']>;
            }
        }
    } catch {
        return fromFile.length > 0 ? fromFile : [];
    }

    if (fromLs.length === 0) return fromFile;
    if (fromFile.length === 0) return fromLs;

    const seen = new Set<string>();
    const out: NonNullable<LooseArchiveFile['timelineEvents']> = [];
    const keyOf = (ev: { id?: string; title?: string; date?: string; timestamp?: string }, i: number) =>
        String(ev.id ?? `${ev.title ?? ''}|${ev.date ?? ''}|${ev.timestamp ?? ''}|${i}`);

    for (const ev of [...fromFile, ...fromLs]) {
        const k = keyOf(ev, out.length);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(ev);
    }
    out.sort((a, b) => {
        const ta = Date.parse(String(a.timestamp ?? a.date ?? '')) || 0;
        const tb = Date.parse(String(b.timestamp ?? b.date ?? '')) || 0;
        return tb - ta;
    });
    return out;
}
