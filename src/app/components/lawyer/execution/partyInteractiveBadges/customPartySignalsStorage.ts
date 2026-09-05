import {
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

export type CustomPartySignal = { id: string; label: string };

export const PARTY_CUSTOM_SIGNALS_CHANGED_EVENT = 'hami-party-custom-signals-changed';

function storageKey(executionId: string, party: string, scopeKey: string) {
    return `hami_party_custom_signals_${executionId}_${party}_${scopeKey || 'main'}`;
}

export function loadCustomPartySignals(
    executionId: string,
    party: string,
    scopeKey = '',
): CustomPartySignal[] {
    try {
        const raw = readSecureOrDrainLegacySync(storageKey(executionId, party, scopeKey));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((x) => x && typeof x.label === 'string' && String(x.label).trim())
            .map((x) => ({
                id: String(x.id || '').trim() || `custom_${Math.random().toString(36).slice(2, 9)}`,
                label: String(x.label).trim().slice(0, 32),
            }));
    } catch {
        return [];
    }
}

export function saveCustomPartySignals(
    executionId: string,
    party: string,
    scopeKey: string,
    signals: CustomPartySignal[],
) {
    try {
        writeSecureAndClearLegacySync(
            storageKey(executionId, party, scopeKey),
            JSON.stringify(signals.slice(0, 24)),
        );
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent(PARTY_CUSTOM_SIGNALS_CHANGED_EVENT, {
                    detail: { executionId, party, scopeKey },
                }),
            );
        }
    } catch {
        /* ignore */
    }
}

export function appendCustomPartySignal(
    executionId: string,
    party: string,
    scopeKey: string,
    label: string,
): CustomPartySignal | null {
    const trimmed = String(label || '').trim().slice(0, 32);
    if (!trimmed) return null;
    const next: CustomPartySignal = {
        id: `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        label: trimmed,
    };
    const prev = loadCustomPartySignals(executionId, party, scopeKey);
    if (prev.some((s) => s.label === trimmed)) return null;
    saveCustomPartySignals(executionId, party, scopeKey, [...prev, next]);
    return next;
}

export function removeCustomPartySignal(
    executionId: string,
    party: string,
    scopeKey: string,
    id: string,
) {
    const prev = loadCustomPartySignals(executionId, party, scopeKey);
    saveCustomPartySignals(
        executionId,
        party,
        scopeKey,
        prev.filter((s) => s.id !== id),
    );
}
