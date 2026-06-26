import { createContext, useContext, type ReactNode } from 'react';

/** Snapshot passed from ExecutionDashboard while محضر المتابعة is open. */
export type FollowupModalSnapshot = Record<string, any>;

const FollowupModalStoreContext = createContext<FollowupModalSnapshot | null>(null);

/** @deprecated Alias — scope wiring only; provider is FollowupModalStoreProvider */
export const FollowupModalContext = FollowupModalStoreContext;

export function FollowupModalStoreProvider({
    snapshot,
    children,
}: {
    snapshot: FollowupModalSnapshot;
    children: ReactNode;
}) {
    return (
        <FollowupModalStoreContext.Provider value={snapshot}>
            {children}
        </FollowupModalStoreContext.Provider>
    );
}

export function useFollowupModal(): FollowupModalSnapshot {
    const snapshot = useContext(FollowupModalStoreContext);
    if (!snapshot) {
        throw new Error('useFollowupModal must run inside FollowupModalStoreProvider');
    }
    return snapshot;
}
