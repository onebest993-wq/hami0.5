import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/unifiedSeizureLogEntryTypes';
import type { SeizedAsset, ThirdPartySeizure } from '@/app/types/execution';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

export function list<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

export function mergeThirdPartySeizureSources(
    ui: ThirdPartySeizure[],
    fromFile: ThirdPartySeizure[] | undefined | null,
): ThirdPartySeizure[] {
    const map = new Map<string, ThirdPartySeizure>();
    for (const s of fromFile || []) {
        const id = String(s?.id || '').trim();
        if (id) map.set(id, s);
    }
    for (const s of ui) {
        const id = String(s?.id || '').trim();
        if (id) map.set(id, s);
    }
    return Array.from(map.values());
}

export function readSalaryDecisionRowId(asset: SeizedAsset): string {
    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : null;
    return String(det?.decisionRowId || '').trim();
}

export function sortEntries(entries: UnifiedSeizureLogEntry[]): UnifiedSeizureLogEntry[] {
    return entries.slice().sort((a, b) => {
        const aa = a.dateYmd || '';
        const bb = b.dateYmd || '';
        return bb.localeCompare(aa, undefined, { numeric: true });
    });
}

export function seizureDecisionMatchesLogKind(
    subtype: string,
    kind: UnifiedSeizureLogEntry['kind']
): boolean {
    const s = String(subtype || '').trim();
    if (kind === 'movable') return s === 'movable' || s === 'movable_auction';
    if (kind === 'property') return s === 'property';
    if (kind === 'salary') return s === 'salary';
    if (kind === 'third_party') return s === 'third_party';
    return false;
}

export function guarantorSeizureSubtypeToLogKind(subtype: string): UnifiedSeizureLogEntry['kind'] | null {
    const s = String(subtype || '').trim();
    if (s === 'property') return 'property';
    if (s === 'salary') return 'salary';
    if (s === 'movable' || s === 'movable_auction') return 'movable';
    return null;
}

export function inferGuarantorSeizureSubtype(row: Record<string, unknown>): string {
    let rowSubtype = String(row?.seizureSubtype || '').trim();
    if (rowSubtype) return rowSubtype;
    const text = `${String(row?.title || '')}\n${String(row?.body || '')}`;
    if (/عقار/i.test(text)) return 'property';
    if (/راتب|مكافآت|حوافز|مخصصات/i.test(text)) return 'salary';
    if (/منقول|مركبة/i.test(text)) return 'movable';
    return '';
}

export function readAssetSeizureTarget(details: Record<string, unknown> | null): string {
    return String(details?.seizureTarget || '').trim();
}

export function isExecutorRowPending(row: Record<string, unknown>): boolean {
    const outcome = String(row?.executorOutcome ?? 'pending').trim();
    return !outcome || outcome === 'pending';
}

export function shouldIncludeExecutorSeizureDecisionRow(row: Record<string, unknown>): boolean {
    if (isExecutorRowRejectedAndFinal(row as never)) return false;
    if (isExecutorRowEffectivelyApproved(row as never)) return true;
    return isExecutorRowPending(row);
}

export function executorSeizureDecisionStatusLabel(row: Record<string, unknown>): string {
    if (String(row?.seizureRequestSavedAt || '').trim()) return 'مسجّل في السجل';
    if (isExecutorRowPending(row)) return 'قيد البت لدى المنفذ';
    return 'موافقة المنفذ — أكمل البيانات';
}
