import type { TimelineEvent } from '@/app/types/execution';

export const INABA_SUB_FILE_ID = '__inaba__';
export const INABA_SUB_FILE_PREFIX = INABA_SUB_FILE_ID;
export const DOSSIER_SCOPE_INABA = 'inaba';
export const DOSSIER_SCOPE_PARENT = 'parent';

export function makeInabaSubFileId(parentFileId: string): string {
    const parentId = String(parentFileId || '').trim();
    return parentId ? `${INABA_SUB_FILE_PREFIX}:${parentId}` : INABA_SUB_FILE_PREFIX;
}

export function isInabaSubFileId(id: string | null | undefined): boolean {
    const value = String(id || '').trim();
    if (!value) return false;
    return value === INABA_SUB_FILE_PREFIX || value.startsWith(`${INABA_SUB_FILE_PREFIX}:`);
}

export type ResolveParentDossierState = {
    currentFile?: { id?: string | number | null; parentId?: string | number | null } | null;
    delegationParentFileId?: string | null;
    activeSubFileId?: string | null;
};

export function resolveParentDossierId(
    state: ResolveParentDossierState,
    fallbackId?: string | null,
): string {
    const fromDelegation = String(state.delegationParentFileId || '').trim();
    if (fromDelegation && !isInabaSubFileId(fromDelegation)) return fromDelegation;

    const currentId = String(state.currentFile?.id || '').trim();
    if (currentId && !isInabaSubFileId(currentId)) return currentId;

    const parentLink = String(state.currentFile?.parentId || '').trim();
    if (parentLink && !isInabaSubFileId(parentLink)) return parentLink;

    const fallback = String(fallbackId || '').trim();
    if (fallback && !isInabaSubFileId(fallback)) return fallback;

    return '';
}

export function timelineEventBelongsToInabaDossier(
    event: TimelineEvent | null | undefined,
    subFileId: string,
): boolean {
    if (!event || (event as { trashedAt?: string }).trashedAt) return false;
    const subId = String(subFileId || '').trim();
    if (!subId) return false;
    const metadata = ((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>;
    const scope = String(metadata.dossierScope || '');
    const taggedSub = String(metadata.inabaSubFileId || metadata.executionDossierId || '').trim();

    if (scope === DOSSIER_SCOPE_PARENT) return false;
    if (scope === DOSSIER_SCOPE_INABA) {
        return !taggedSub || taggedSub === subId;
    }
    if (taggedSub) return taggedSub === subId;
    return true;
}

export function timelineEventBelongsToParentDossier(
    event: TimelineEvent | null | undefined,
    parentId: string,
): boolean {
    if (!event || (event as { trashedAt?: string }).trashedAt) return false;
    const metadata = ((event as { metadata?: Record<string, unknown> }).metadata || {}) as Record<string, unknown>;
    if (String(metadata.dossierScope || '') === DOSSIER_SCOPE_INABA) return false;
    if (String(metadata.inabaSubFileId || '').trim()) return false;
    const resolvedParentId = String(parentId || '').trim();
    const taggedParent = String(metadata.parentExecutionId || '').trim();
    if (taggedParent && resolvedParentId && taggedParent !== resolvedParentId) return false;
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
    return { ...event, metadata } as TimelineEvent;
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
    return { ...event, metadata } as TimelineEvent;
}
