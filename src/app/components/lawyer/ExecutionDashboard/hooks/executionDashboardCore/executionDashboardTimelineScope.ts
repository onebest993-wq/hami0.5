import type { TimelineEvent } from '@/app/types/execution';

const INABA_SUB_FILE_PREFIX = 'inaba-sub';
const DOSSIER_SCOPE_INABA = 'inaba';
const DOSSIER_SCOPE_PARENT = 'parent';

export function isInabaSubFileId(id: string | null | undefined): boolean {
    const value = String(id || '').trim();
    if (!value) return false;
    return value === INABA_SUB_FILE_PREFIX || value.startsWith(`${INABA_SUB_FILE_PREFIX}:`);
}

function timelineEventBelongsToInabaDossier(
    event: TimelineEvent | null | undefined,
    subFileId: string,
): boolean {
    if (!event || (event as { trashedAt?: string }).trashedAt) return false;
    const subId = String(subFileId || '').trim();
    if (!subId) return false;
    const meta = ((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>;
    const scope = String(meta.dossierScope || '');
    const taggedSub = String(meta.inabaSubFileId || meta.executionDossierId || '').trim();
    return scope === DOSSIER_SCOPE_INABA && taggedSub === subId;
}

function timelineEventBelongsToParentDossier(
    event: TimelineEvent | null | undefined,
    parentId: string,
): boolean {
    if (!event || (event as { trashedAt?: string }).trashedAt) return false;
    const meta = ((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>;
    if (String(meta.dossierScope || '') === DOSSIER_SCOPE_INABA) return false;
    if (String(meta.inabaSubFileId || '').trim()) return false;
    const pid = String(parentId || '').trim();
    const taggedParent = String(meta.parentExecutionId || '').trim();
    if (taggedParent && pid && taggedParent !== pid) return false;
    return true;
}

export function filterTimelineEventsForInabaDossier(
    events: TimelineEvent[],
    subFileId: string,
): TimelineEvent[] {
    return (events || []).filter((event) => timelineEventBelongsToInabaDossier(event, subFileId));
}

export function filterTimelineEventsForParentDossier(
    events: TimelineEvent[],
    parentId: string,
): TimelineEvent[] {
    return (events || []).filter((event) => timelineEventBelongsToParentDossier(event, parentId));
}

export function stampInabaTimelineEventMetadata(
    event: TimelineEvent,
    subFileId: string,
    parentId: string,
): TimelineEvent {
    const metadata = {
        ...(((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>),
        dossierScope: DOSSIER_SCOPE_INABA,
        inabaSubFileId: subFileId,
        parentExecutionId: parentId,
    };

    return { ...event, metadata };
}

export function stampParentTimelineEventMetadata(
    event: TimelineEvent,
    parentId: string,
): TimelineEvent {
    const resolvedParentId = String(parentId || '').trim();
    const metadata = {
        ...(((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>),
        dossierScope: DOSSIER_SCOPE_PARENT,
        ...(resolvedParentId ? { parentExecutionId: resolvedParentId } : {}),
    };

    return { ...event, metadata };
}
