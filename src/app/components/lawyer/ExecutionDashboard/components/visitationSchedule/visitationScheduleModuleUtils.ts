import type { ExecutionFile } from '@/app/types/execution';
import type { VisitationScheduleBundle, VisitationSession } from '@/app/types/visitationSchedule';

export function partyDisplayName(row: { name?: string; fullName?: string } | undefined): string {
    return String(row?.name || row?.fullName || '').trim();
}

export function readBundle(data: ExecutionFile | null | undefined): VisitationScheduleBundle | null {
    const raw = (data as { visitationSchedule?: VisitationScheduleBundle } | undefined)?.visitationSchedule;
    if (!raw?.config) return null;
    return {
        config: raw.config,
        sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    };
}

export function bundleIsReady(bundle: VisitationScheduleBundle | null): bundle is VisitationScheduleBundle {
    return Boolean(bundle?.config && bundle.sessions.length > 0);
}

export function sessionsSignature(list: VisitationSession[]): string {
    return list.map((s) => `${s.id}:${s.status}:${s.documentedAt ?? ''}`).join('|');
}
