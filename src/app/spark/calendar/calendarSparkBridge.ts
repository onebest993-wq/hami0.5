import type { UnifiedEvent, UnifiedEventBridge } from '@/app/components/lawyer/hooks/useCalendarData';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import type { SparkNudge, SparkNudgeAction } from '@/app/spark/types';
import { buildWorkspaceRoute } from '@/app/workspace/workspaceRoutes';
import type { WorkspacePinType } from '@/app/workspace/types';

export const SPARK_REPOSITORY_SESSION_ROUTE = 'repository:session';

function parseDossierTargetId(targetFileId: string): { module: string; entityId: string } | null {
    const raw = String(targetFileId ?? '').trim();
    const idx = raw.indexOf(':');
    if (idx <= 0) return null;
    const module = raw.slice(0, idx).trim();
    const entityId = raw.slice(idx + 1).trim();
    if (!module || !entityId) return null;
    return { module, entityId };
}

export function findCalendarSparkEvent(
    events: UnifiedEvent[],
    eventId: string,
): UnifiedEvent | undefined {
    const id = String(eventId ?? '').trim();
    if (!id) return undefined;
    return events.find((event) => event.id === id);
}

function mapCalendarModuleToWorkspaceType(
    module: CalendarSourceModule,
): WorkspacePinType | null {
    switch (module) {
        case 'lawsuit':
            return 'lawsuit';
        case 'execution':
            return 'execution';
        case 'criminal':
            return 'criminal';
        case 'urgent':
            return 'urgent';
        case 'transaction':
            return 'transaction';
        case 'threading':
            return 'threading';
        case 'task':
            return 'task';
        case 'note':
            return 'notepad';
        case 'manual':
            return null;
        default:
            return null;
    }
}

export function resolveCalendarBridgeWorkspaceRoute(
    bridge: UnifiedEventBridge | undefined,
): string | null {
    const module = bridge?.sourceModule;
    const entityId = String(bridge?.sourceEntityId ?? '').trim();
    if (!module || !entityId) return null;
    const workspaceType = mapCalendarModuleToWorkspaceType(module);
    if (!workspaceType) return null;
    return buildWorkspaceRoute(workspaceType, entityId);
}

export function isCalendarEventBridged(event: UnifiedEvent | undefined): boolean {
    return Boolean(
        event?.isBridged &&
            event.bridge?.sourceModule &&
            String(event.bridge.sourceEntityId ?? '').trim(),
    );
}

export function resolveCalendarEventFollowAction(
    events: UnifiedEvent[],
    eventId: string,
    fallback: SparkNudgeAction,
): SparkNudgeAction {
    const event = findCalendarSparkEvent(events, eventId);
    if (!isCalendarEventBridged(event)) return fallback;
    return { label: 'فتح الإضبارة', actionId: 'open_source' };
}

export type CalendarSparkFollowHandlers = {
    allEvents: UnifiedEvent[];
    onFocusEvent?: (eventId: string, date: string) => void;
    onFocusDay?: (dateYmd: string) => void;
    onOpenSource?: (sourceModule: string, sourceEntityId: string) => void;
    onOpenRepositoryNote?: (noteId: string) => void;
};

export function runCalendarSparkFollowAction(
    nudge: SparkNudge,
    handlers: CalendarSparkFollowHandlers,
): boolean {
    const actionId = nudge.action?.actionId;
    if (!actionId) return false;

    if (actionId === 'focus_day' && nudge.targetFileId) {
        handlers.onFocusDay?.(nudge.targetFileId);
        return true;
    }

    if (actionId === 'open_source' && nudge.targetFileId) {
        const event = findCalendarSparkEvent(handlers.allEvents, nudge.targetFileId);
        const module = event?.bridge?.sourceModule;
        const entityId = String(event?.bridge?.sourceEntityId ?? '').trim();
        if (module && entityId) {
            handlers.onOpenSource?.(module, entityId);
            return true;
        }
    }

    if (actionId === 'open_dossier' && nudge.targetFileId) {
        const parsed = parseDossierTargetId(nudge.targetFileId);
        if (parsed) {
            handlers.onOpenSource?.(parsed.module, parsed.entityId);
            return true;
        }
    }

    if (actionId === 'open_repository_note' && nudge.targetFileId) {
        handlers.onOpenRepositoryNote?.(nudge.targetFileId);
        return true;
    }

    if (actionId === 'focus_event' && nudge.targetFileId) {
        const event = findCalendarSparkEvent(handlers.allEvents, nudge.targetFileId);
        if (event) {
            handlers.onFocusEvent?.(event.id, event.date);
            return true;
        }
    }

    return false;
}

export function resolveCalendarHubFollowRoute(
    events: UnifiedEvent[],
    nudge: SparkNudge,
    calendarRoute: string,
): string {
    if (nudge.action?.actionId === 'open_repository_note') {
        return SPARK_REPOSITORY_SESSION_ROUTE;
    }
    if (nudge.action?.actionId === 'open_dossier' && nudge.targetFileId) {
        const parsed = parseDossierTargetId(nudge.targetFileId);
        if (parsed) {
            const route = resolveCalendarBridgeWorkspaceRoute({
                sourceModule: parsed.module as CalendarSourceModule,
                sourceEntityId: parsed.entityId,
                sourceEventId: 'unscheduled',
                calendarRecordId: '',
            });
            if (route) return route;
        }
    }
    if (nudge.action?.actionId === 'open_source' && nudge.targetFileId) {
        const event = findCalendarSparkEvent(events, nudge.targetFileId);
        const route = resolveCalendarBridgeWorkspaceRoute(event?.bridge);
        if (route) return route;
    }
    return calendarRoute;
}
