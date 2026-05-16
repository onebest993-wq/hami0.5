import {
    formatClaimTypeArabic,
    inferEvictionPremisesUse,
} from '@/app/utils/executionModuleStrategies';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import SecureStoreService from '@/app/services/SecureStoreService';
import type { LooseArchiveFile } from './types';

export function parseLooseAmount(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v).replace(/,/g, '').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : 0;
}

export function executionArchiveLocalStorageKey(file: LooseArchiveFile): string | null {
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
        const raw = SecureStoreService.getItemSync(lsKey);
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

export function executionTotalDemandEstimate(file: LooseArchiveFile): number {
    const f = file as unknown as Record<string, unknown>;
    const principal = parseLooseAmount(f.totalAmount ?? f.amount ?? f.debtAmount);
    const lawyer = parseLooseAmount(f.lawyerFeesAmount);
    const court = parseLooseAmount(f.courtFees);
    const dir = parseLooseAmount(f.directorateFees);
    const evx = Array.isArray(f.eviction_case_expenses)
        ? (f.eviction_case_expenses as { amount?: unknown }[]).reduce(
              (s, x) => s + parseLooseAmount(x?.amount),
              0
          )
        : 0;
    return principal + lawyer + court + dir + evx;
}

export function executionClaimBadgeArabic(file: LooseArchiveFile): string {
    const raw = String(file.claimType || file.docType || '').trim();
    const premises = inferEvictionPremisesUse({
        explicit: (file as { eviction_premises_use?: 'commercial' | 'residential' }).eviction_premises_use ?? null,
        propertyTypeText: (file as { property_type?: string }).property_type,
    });
    const ar = formatClaimTypeArabic(raw, premises);
    return ar && ar !== '—' ? ar : raw || 'تنفيذ';
}
