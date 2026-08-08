export type SeizureInlineFocusSessionKind = 'property' | 'movable' | 'third_party';

export type SeizureInlineFocusSessionEntry = {
    executionId: string;
    decisionId: string;
    subject?: string;
};

const sessionByKey = new Map<string, SeizureInlineFocusSessionEntry>();

function sessionKey(kind: SeizureInlineFocusSessionKind, executionId: string): string {
    return `${kind}:${String(executionId || '').trim()}`;
}

export function writeSeizureInlineFocusSession(
    kind: SeizureInlineFocusSessionKind,
    executionId: string,
    decisionId: string,
    subject?: string,
): void {
    const exId = String(executionId || '').trim();
    const did = String(decisionId || '').trim();
    if (!exId || !did) return;
    sessionByKey.set(sessionKey(kind, exId), {
        executionId: exId,
        decisionId: did,
        subject: String(subject || '').trim() || undefined,
    });
}

export function readSeizureInlineFocusSession(
    kind: SeizureInlineFocusSessionKind,
    executionId: string,
): SeizureInlineFocusSessionEntry | null {
    const exId = String(executionId || '').trim();
    if (!exId) return null;
    const entry = sessionByKey.get(sessionKey(kind, exId));
    if (!entry?.decisionId) return null;
    return entry;
}

export function clearSeizureInlineFocusSession(
    kind: SeizureInlineFocusSessionKind,
    executionId: string,
): void {
    const exId = String(executionId || '').trim();
    if (!exId) return;
    sessionByKey.delete(sessionKey(kind, exId));
}

export function clearAllSeizureInlineFocusSessionsForTests(): void {
    sessionByKey.clear();
}
