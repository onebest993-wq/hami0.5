/**
 * Phase 15 — Single source of truth for hearing dates (per lifecycle phase).
 */

export type HearingSessionLike = {
    sessionDate?: string;
    nextSessionDate?: string;
    createdAt?: string;
};

/**
 * Latest session by chronological order (createdAt, then sessionDate).
 * Uses nextSessionDate when present on that session; otherwise falls back to initialDate.
 */
export function getActiveDate(sessions: HearingSessionLike[] | null | undefined, initialDate: string): string {
    const initial = String(initialDate || '').trim();
    if (!sessions || sessions.length === 0) return initial;

    const sorted = [...sessions].sort((a, b) => {
        const ta = Date.parse(String(a.createdAt || '')) || 0;
        const tb = Date.parse(String(b.createdAt || '')) || 0;
        if (ta !== tb) return ta - tb;
        return String(a.sessionDate || '').localeCompare(String(b.sessionDate || ''));
    });

    const latestSession = sorted[sorted.length - 1];
    if (!latestSession) return initial;

    const next = String(latestSession.nextSessionDate || '').trim();
    return next ? next : initial;
}
