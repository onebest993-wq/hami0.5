const REPOSITORY_ESCAPE_L0_SHELL_BACK = 0;
const REPOSITORY_ESCAPE_L1_VAULTPDF_DISMISS = 1;
const REPOSITORY_ESCAPE_L2_DOSSIER_COMPOSER_CLOSE = 2;
const REPOSITORY_ESCAPE_L3_SMARTLAW_POPOVER_DISMISS = 3;

type RepositoryEscapePriority = 0 | 1 | 2 | 3;

interface RepositoryEscapeEntry {
    priority: RepositoryEscapePriority;
    handler: () => void | boolean | Promise<void | boolean>;
    surface?: string;
    createdAt: number;
}

const escapeStack: RepositoryEscapeEntry[] = [];

function pushRepositoryEscapeLayer(
    handler: RepositoryEscapeEntry['handler'],
    priority: RepositoryEscapePriority = REPOSITORY_ESCAPE_L1_VAULTPDF_DISMISS,
    surface?: string,
): number {
    const entry: RepositoryEscapeEntry = {
        priority,
        handler,
        surface,
        createdAt: Date.now(),
    };
    escapeStack.push(entry);
    escapeStack.sort((a, b) => a.priority - b.priority);
    return escapeStack.indexOf(entry);
}

function popRepositoryEscapeLayer(token: number): boolean {
    if (token < 0 || token >= escapeStack.length) return false;
    const removed = escapeStack.splice(token, 1);
    return removed.length === 1;
}

function peekRepositoryEscapeTopLayer(): RepositoryEscapeEntry | null {
    return escapeStack[0] ?? null;
}

export function unblockAllRepositoryOverlayEscape(): void {
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

const repositoryEscapeStackPublicApi = {
    push: pushRepositoryEscapeLayer,
    pop: popRepositoryEscapeLayer,
    peek: peekRepositoryEscapeTopLayer,
    unblockAll: unblockAllRepositoryOverlayEscape,
    getSize: () => escapeStack.length,
    L0: REPOSITORY_ESCAPE_L0_SHELL_BACK,
    L1: REPOSITORY_ESCAPE_L1_VAULTPDF_DISMISS,
    L2: REPOSITORY_ESCAPE_L2_DOSSIER_COMPOSER_CLOSE,
    L3: REPOSITORY_ESCAPE_L3_SMARTLAW_POPOVER_DISMISS,
};

if (typeof window !== 'undefined') {
    try {
        const winAny = window as unknown as Record<string, unknown>;
        if (typeof winAny.__hamiRepoEscapeStack === 'undefined') {
            winAny.__hamiRepoEscapeStack = repositoryEscapeStackPublicApi;
        }
    } catch {
        /* side-effect boot guard: SSR or frozen window never breaks */
    }
}
