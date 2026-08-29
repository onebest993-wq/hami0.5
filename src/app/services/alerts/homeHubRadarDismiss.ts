import { readSecureJsonRawSync, writeSecureJsonValue } from '@/app/services/storage/syncSecureJson';

/** إخفاء مواعيد رادار 48 ساعة من البطاقة العامة فقط — لا يحذف الموعد من التقويم */

export const HOME_HUB_RADAR_DISMISSED_KEY_PREFIX = 'hami:home-hub-radar-dismissed:v1';
export const HOME_HUB_RADAR_DISMISSED_EVENT = 'hami:home-hub-radar-dismissed';

const MAX_DISMISSED = 200;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type DismissEntry = { id: string; at: number };

function storageKey(lawyerId: string): string {
    return `${HOME_HUB_RADAR_DISMISSED_KEY_PREFIX}:${lawyerId.slice(0, 128)}`;
}

function readEntries(lawyerId: string): DismissEntry[] {
    const safeLawyer = String(lawyerId ?? '').trim();
    if (!safeLawyer) return [];
    try {
        const raw = readSecureJsonRawSync(storageKey(safeLawyer));
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return (parsed as DismissEntry[]).filter(
            (e) => e && typeof e.id === 'string' && typeof e.at === 'number',
        );
    } catch {
        return [];
    }
}

function writeEntries(lawyerId: string, entries: DismissEntry[]): void {
    const safeLawyer = String(lawyerId ?? '').trim();
    if (!safeLawyer) return;
    writeSecureJsonValue(storageKey(safeLawyer), entries.slice(-MAX_DISMISSED));
}

export function getDismissedHomeHubRadarIds(lawyerId: string | null | undefined): string[] {
    const safeLawyer = String(lawyerId ?? '').trim();
    if (!safeLawyer) return [];
    const cutoff = Date.now() - RETENTION_MS;
    return readEntries(safeLawyer)
        .filter((e) => e.at >= cutoff)
        .map((e) => e.id);
}

export function dismissHomeHubRadarId(lawyerId: string | null | undefined, eventId: string): void {
    const safeLawyer = String(lawyerId ?? '').trim().slice(0, 128);
    const safeId = String(eventId ?? '').trim().slice(0, 240);
    if (!safeLawyer || !safeId) return;
    const entries = readEntries(safeLawyer).filter((e) => e.id !== safeId);
    entries.push({ id: safeId, at: Date.now() });
    writeEntries(safeLawyer, entries);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent(HOME_HUB_RADAR_DISMISSED_EVENT, { detail: { lawyerId: safeLawyer, id: safeId } }),
        );
    }
}

export function filterVisibleHomeHubRadarEvents<T extends { id: string }>(
    events: T[],
    dismissedIds: Iterable<string>,
): T[] {
    const set = dismissedIds instanceof Set ? dismissedIds : new Set(dismissedIds);
    if (set.size === 0) return events;
    return events.filter((ev) => {
        const id = String(ev.id ?? '').trim();
        return id.length > 0 && !set.has(id);
    });
}
