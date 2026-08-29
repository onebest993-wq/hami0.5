import type { Decision } from '../types';

export function resolveUnderlyingDecisionHub(row: Decision, all: Decision[]): Decision {
    const srcId = String(row.appealSourceDecisionId || '').trim();
    if (!srcId) return row;
    return all.find((d) => String(d.id || '').trim() === srcId) ?? row;
}

export function parseDecisionPayloadJson(hub: Decision): Record<string, unknown> | null {
    try {
        const raw = String((hub as Decision & { payloadJson?: unknown }).payloadJson || '').trim();
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}
