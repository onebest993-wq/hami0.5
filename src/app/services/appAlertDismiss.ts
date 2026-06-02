import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

export const APP_ALERTS_DISMISSED_KEY = 'hami:app-alerts-dismissed:v1';
const LEGACY_DISMISSED_KEY = 'neural-alerts-dismissed';
const MAX_DISMISSED = 300;

type DismissEntry = { id: string; at: number };

function readEntries(): DismissEntry[] {
    try {
        for (const key of [APP_ALERTS_DISMISSED_KEY, LEGACY_DISMISSED_KEY]) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                if (parsed.length > 0 && typeof parsed[0] === 'string') {
                    return parsed
                        .filter((id): id is string => typeof id === 'string')
                        .map((id) => ({ id, at: Date.now() }));
                }
                if (parsed.length > 0 && parsed[0] && typeof parsed[0] === 'object') {
                    return (parsed as DismissEntry[]).filter(
                        (e) => e && typeof e.id === 'string' && typeof e.at === 'number',
                    );
                }
            }
        }
    } catch {
        /* ignore */
    }
    return [];
}

function writeEntries(entries: DismissEntry[]): void {
    try {
        const capped = entries.slice(-MAX_DISMISSED);
        localStorage.setItem(APP_ALERTS_DISMISSED_KEY, JSON.stringify(capped));
    } catch {
        /* ignore */
    }
}

/** معرّفات التنبيهات المخفاة (مقروءة/مُهمَلة من المستخدم) */
export function getDismissedAlertIds(): string[] {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return readEntries()
        .filter((e) => e.at >= cutoff)
        .map((e) => e.id);
}

export function dismissAlertId(id: string): void {
    const safe = String(id ?? '').trim().slice(0, 200);
    if (!safe) return;
    const entries = readEntries().filter((e) => e.id !== safe);
    entries.push({ id: safe, at: Date.now() });
    writeEntries(entries);
    window.dispatchEvent(new CustomEvent('hami:alerts-dismissed'));
}

export function filterVisibleAlerts(alerts: SecretaryAlert[], dismissedIds?: string[]): SecretaryAlert[] {
    const dismissed = dismissedIds ?? getDismissedAlertIds();
    if (dismissed.length === 0) return alerts;
    const set = new Set(dismissed);
    return alerts.filter((a) => !set.has(a.id));
}
