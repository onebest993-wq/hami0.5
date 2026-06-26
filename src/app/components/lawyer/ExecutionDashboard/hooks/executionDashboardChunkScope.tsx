import { createContext, useContext, type MutableRefObject, type ReactNode } from 'react';

export type ExecutionDashboardChunkScopeRef = MutableRefObject<Record<string, unknown>>;

const ExecutionDashboardChunkScopeContext =
    createContext<ExecutionDashboardChunkScopeRef | null>(null);

export function ExecutionDashboardChunkScopeProvider({
    scopeRef,
    children,
}: {
    scopeRef: ExecutionDashboardChunkScopeRef;
    children: ReactNode;
}) {
    return (
        <ExecutionDashboardChunkScopeContext.Provider value={scopeRef}>
            {children}
        </ExecutionDashboardChunkScopeContext.Provider>
    );
}

export function useExecutionDashboardChunkScopeRef(): ExecutionDashboardChunkScopeRef {
    const ref = useContext(ExecutionDashboardChunkScopeContext);
    if (!ref) {
        throw new Error('useExecutionDashboardChunkScopeRef outside ExecutionDashboardChunkScopeProvider');
    }
    return ref;
}

export function readExecutionDashboardChunkScope(
    scopeRef: ExecutionDashboardChunkScopeRef,
): Record<string, unknown> {
    return scopeRef.current;
}
