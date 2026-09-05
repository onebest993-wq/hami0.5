export type CalendarOpenSourceDetail = {
    sourceModule: string;
    sourceEntityId: string;
    sourceEventId?: string;
};

const listeners = new Set<(detail: CalendarOpenSourceDetail) => void>();
let pending: CalendarOpenSourceDetail | null = null;

export function requestCalendarOpenSource(detail: CalendarOpenSourceDetail): void {
    const moduleId = detail.sourceModule.trim();
    const entityId = detail.sourceEntityId.trim();
    if (!moduleId || !entityId) return;
    const next: CalendarOpenSourceDetail = {
        sourceModule: moduleId,
        sourceEntityId: entityId,
        sourceEventId: detail.sourceEventId,
    };
    if (listeners.size === 0) {
        pending = next;
        return;
    }
    for (const listener of listeners) listener(next);
}

export function subscribeCalendarOpenSource(
    listener: (detail: CalendarOpenSourceDetail) => void,
): () => void {
    listeners.add(listener);
    if (pending) {
        const queued = pending;
        pending = null;
        listener(queued);
    }
    return () => {
        listeners.delete(listener);
    };
}

export function resetCalendarOpenSourceForTests(): void {
    listeners.clear();
    pending = null;
}
