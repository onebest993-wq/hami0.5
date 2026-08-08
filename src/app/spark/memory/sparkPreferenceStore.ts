import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import type { SparkPreferenceEntry, SparkPreferenceMap } from '@/app/spark/types';
import { clearSparkAuditNudges } from '@/app/spark/audit/sparkAuditNudgeStore';

import { isSparkDevMode } from '@/app/spark/dev/sparkDevMode';

const STORAGE_KEY = 'spark_preferences_v1';
const SNOOZE_MS = 48 * 60 * 60 * 1000;
const HIDE_AFTER_DISMISSALS = 3;

function readMap(): SparkPreferenceMap {
    const raw = persistenceRepository.load(STORAGE_KEY);
    if (!raw || typeof raw !== 'object') return {};
    return raw as SparkPreferenceMap;
}

function writeMap(map: SparkPreferenceMap): void {
    persistenceRepository.save(STORAGE_KEY, map);
}

export function preferenceKeyForNudge(kind: string, dossierKey?: string): string {
    const scope = dossierKey?.trim() || 'global';
    return `${kind}::${scope}`;
}

export function isSparkNudgeSuppressed(kind: string, dossierKey?: string, now = Date.now()): boolean {
    if (isSparkDevMode()) return false;
    const key = preferenceKeyForNudge(kind, dossierKey);
    const entry = readMap()[key];
    if (!entry) return false;
    if (entry.hidden) return true;
    if (entry.snoozedUntil && entry.snoozedUntil > now) return true;
    if (entry.dismissCount >= HIDE_AFTER_DISMISSALS) return true;
    return false;
}

export function recordSparkDismiss(kind: string, dossierKey?: string, now = Date.now()): void {
    const key = preferenceKeyForNudge(kind, dossierKey);
    const map = readMap();
    const prev = map[key] ?? { dismissCount: 0, lastDismissedAt: 0 };
    const dismissCount = prev.dismissCount + 1;
    map[key] = {
        ...prev,
        dismissCount,
        lastDismissedAt: now,
        hidden: dismissCount >= HIDE_AFTER_DISMISSALS ? true : prev.hidden,
    };
    writeMap(map);
}

export function recordSparkSnooze(kind: string, dossierKey?: string, now = Date.now()): void {
    const key = preferenceKeyForNudge(kind, dossierKey);
    const map = readMap();
    const prev = map[key] ?? { dismissCount: 0, lastDismissedAt: 0 };
    map[key] = {
        ...prev,
        snoozedUntil: now + SNOOZE_MS,
        lastDismissedAt: now,
    };
    writeMap(map);
}

export function resetSparkPreferences(): void {
    persistenceRepository.save(STORAGE_KEY, {});
    clearSparkAuditNudges();
}

export function readSparkPreferencesForTests(): SparkPreferenceMap {
    return readMap();
}
