import { createContext, useContext } from 'react';

/** Snapshot passed from ExecutionDashboard while محضر المتابعة is open. */
export type FollowupModalSnapshot = Record<string, unknown>;

export const FollowupModalContext = createContext<FollowupModalSnapshot | null>(null);

export function useFollowupModal(): FollowupModalSnapshot {
    const ctx = useContext(FollowupModalContext);
    if (!ctx) {
        throw new Error('useFollowupModal must run inside FollowupModalContext.Provider');
    }
    return ctx;
}
