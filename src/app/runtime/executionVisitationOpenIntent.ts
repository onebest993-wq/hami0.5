/** نية فتح مساحة جدول المشاهدة بعد الخروج من رادار التقويم (`visit_next`). */

export const HAMI_OPEN_EXECUTION_VISITATION_WORKSPACE = 'hami-open-execution-visitation-workspace';
export const EXECUTION_VISITATION_OPEN_INTENT_SESSION_KEY = 'hami:open-execution-visitation-workspace';

export function requestOpenExecutionVisitationWorkspace(fileId: string): void {
    const id = fileId.trim();
    if (!id || typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(EXECUTION_VISITATION_OPEN_INTENT_SESSION_KEY, id);
    } catch {
        /* private mode / quota */
    }
    window.dispatchEvent(
        new CustomEvent(HAMI_OPEN_EXECUTION_VISITATION_WORKSPACE, { detail: { fileId: id } }),
    );
}

export function consumeOpenExecutionVisitationWorkspaceRequest(fileId: string): boolean {
    const id = fileId.trim();
    if (!id || typeof window === 'undefined') return false;
    try {
        const pending = sessionStorage.getItem(EXECUTION_VISITATION_OPEN_INTENT_SESSION_KEY);
        if (pending !== id) return false;
        sessionStorage.removeItem(EXECUTION_VISITATION_OPEN_INTENT_SESSION_KEY);
        return true;
    } catch {
        return false;
    }
}
