const LITIGATION_ESCAPE_L0_MODAL_FIRST_RESPONDER = 0;
const LITIGATION_ESCAPE_L1_OVERLAY_DISMISS = 1;
const LITIGATION_ESCAPE_L2_FRAGMENT_BACK = 2;
const LITIGATION_ESCAPE_L3_DEEP_NAV_BACK = 3;

type LitigationEscapePriority = 0 | 1 | 2 | 3;

interface LitigationEscapeEntry {
    priority: LitigationEscapePriority;
    handler: () => void | boolean | Promise<void | boolean>;
    surface?: string;
    createdAt: number;
}

const escapeStack: LitigationEscapeEntry[] = [];

function pushLitigationEscapeHandler(
    handler: LitigationEscapeEntry['handler'],
    priority: LitigationEscapePriority = LITIGATION_ESCAPE_L1_OVERLAY_DISMISS,
    surface?: string,
): number {
    const entry: LitigationEscapeEntry = {
        priority,
        handler,
        surface,
        createdAt: Date.now(),
    };
    escapeStack.push(entry);
    escapeStack.sort((a, b) => a.priority - b.priority);
    return escapeStack.indexOf(entry);
}

function popLitigationEscapeHandler(token: number): boolean {
    if (token < 0 || token >= escapeStack.length) return false;
    const removed = escapeStack.splice(token, 1);
    return removed.length === 1;
}

function peekLitigationEscapeStack(): LitigationEscapeEntry | null {
    return escapeStack[0] ?? null;
}

export function unblockAllLitigationOverlayEscape(): void {
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

const litigationEscapeStackPublicApi = {
    push: pushLitigationEscapeHandler,
    pop: popLitigationEscapeHandler,
    peek: peekLitigationEscapeStack,
    unblockAll: unblockAllLitigationOverlayEscape,
    getSize: () => escapeStack.length,
    L0: LITIGATION_ESCAPE_L0_MODAL_FIRST_RESPONDER,
    L1: LITIGATION_ESCAPE_L1_OVERLAY_DISMISS,
    L2: LITIGATION_ESCAPE_L2_FRAGMENT_BACK,
    L3: LITIGATION_ESCAPE_L3_DEEP_NAV_BACK,
};

if (typeof window !== 'undefined') {
    try {
        const winAny = window as unknown as Record<string, unknown>;
        if (typeof winAny.__hamiLitEscapeStack === 'undefined') {
            winAny.__hamiLitEscapeStack = litigationEscapeStackPublicApi;
        }
    } catch {
        /* side-effect boot guard: SSR or frozen window never breaks */
    }
}
