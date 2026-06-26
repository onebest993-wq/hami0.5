import {
    createContext,
    useContext,
    useRef,
    useSyncExternalStore,
    type ReactNode,
} from 'react';

/** Snapshot passed from ExecutionDashboard while محضر المتابعة is open. */
export type FollowupModalSnapshot = Record<string, any>;

type FollowupModalStore = {
    subscribe: (onStoreChange: () => void) => () => void;
    getSnapshot: () => FollowupModalSnapshot;
};

const FollowupModalStoreContext = createContext<FollowupModalStore | null>(null);

/** @deprecated Alias — scope wiring only; provider is FollowupModalStoreProvider */
export const FollowupModalContext = FollowupModalStoreContext;

export function FollowupModalStoreProvider({
    snapshot,
    children,
}: {
    snapshot: FollowupModalSnapshot;
    children: ReactNode;
}) {
    const snapshotRef = useRef(snapshot);
    snapshotRef.current = snapshot;
    const listenersRef = useRef(new Set<() => void>());

    const storeRef = useRef<FollowupModalStore | null>(null);
    if (!storeRef.current) {
        storeRef.current = {
            getSnapshot: () => snapshotRef.current,
            subscribe: (listener) => {
                listenersRef.current.add(listener);
                return () => {
                    listenersRef.current.delete(listener);
                };
            },
        };
    }

    return (
        <FollowupModalStoreContext.Provider value={storeRef.current}>
            {children}
        </FollowupModalStoreContext.Provider>
    );
}

export function useFollowupModal(): FollowupModalSnapshot {
    const store = useContext(FollowupModalStoreContext);
    if (!store) {
        throw new Error('useFollowupModal must run inside FollowupModalStoreProvider');
    }
    return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
