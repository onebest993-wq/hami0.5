export const EXECUTION_ESCAPE_L0_SHELL_BACK = 0;
export const EXECUTION_ESCAPE_L1_FOLLOWUP_MODAL_DISMISS = 1;
export const EXECUTION_ESCAPE_L2_DOSSIER_COMPOSER_CLOSE = 2;
export const EXECUTION_ESCAPE_L3_POPOVER_DISMISS = 3;

export type ExecutionEscapePriority = 0 | 1 | 2 | 3;

export interface ExecutionEscapeEntry {
    priority: ExecutionEscapePriority;
    handler: () => void | boolean | Promise<void | boolean>;
    surface?: string;
    createdAt: number;
}

const escapeStack: ExecutionEscapeEntry[] = [];

export function pushExecutionEscapeLayer(
    handler: ExecutionEscapeEntry['handler'],
    priority: ExecutionEscapePriority = EXECUTION_ESCAPE_L1_FOLLOWUP_MODAL_DISMISS,
    surface?: string,
): number {
    const entry: ExecutionEscapeEntry = {
        priority,
        handler,
        surface,
        createdAt: Date.now(),
    };
    escapeStack.push(entry);
    escapeStack.sort((a, b) => a.priority - b.priority);
    return escapeStack.indexOf(entry);
}

export function popExecutionEscapeLayer(token: number): boolean {
    if (token < 0 || token >= escapeStack.length) return false;
    const removed = escapeStack.splice(token, 1);
    return removed.length === 1;
}

export function peekExecutionEscapeTopLayer(): ExecutionEscapeEntry | null {
    return escapeStack[0] ?? null;
}

export function unblockAllExecutionOverlayEscape(): void {
    if (typeof window === 'undefined') return;
    try {
        while (escapeStack.length > 0) {
            const entry = escapeStack.shift()!;
            try {
                const result = entry.handler();
                if (result === false) break;
            } catch {
                /* individual handler failure never bubbles to other handlers */
            }
        }
    } catch {
        /* stack manager guarantees no-throw unblock contract */
    }
}

export const executionEscapeStackPublicApi = {
    push: pushExecutionEscapeLayer,
    pop: popExecutionEscapeLayer,
    peek: peekExecutionEscapeTopLayer,
    unblockAll: unblockAllExecutionOverlayEscape,
    getSize: () => escapeStack.length,
    L0: EXECUTION_ESCAPE_L0_SHELL_BACK,
    L1: EXECUTION_ESCAPE_L1_FOLLOWUP_MODAL_DISMISS,
    L2: EXECUTION_ESCAPE_L2_DOSSIER_COMPOSER_CLOSE,
    L3: EXECUTION_ESCAPE_L3_POPOVER_DISMISS,
};

if (typeof window !== 'undefined') {
    try {
        const winAny = window as unknown as Record<string, unknown>;
        if (typeof winAny.__hamiExecEscapeStack === 'undefined') {
            winAny.__hamiExecEscapeStack = executionEscapeStackPublicApi;
        }
    } catch {
        /* side-effect boot guard: SSR or frozen window never breaks */
    }
}
