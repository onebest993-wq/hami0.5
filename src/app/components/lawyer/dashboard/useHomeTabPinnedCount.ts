import { useCallback, useEffect, useRef, useState } from 'react';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';

type UnpinFn = (id: string, type: string) => void;

/**
 * تثبيتات مساحة العمل — بعد dashboard-interactive فقط حتى لا يسحب app-workspace إلى stem.
 */
export function useHomeTabPinnedCount(): { pinnedCount: number; unpinItem: UnpinFn } {
    const [pinnedCount, setPinnedCount] = useState(0);
    const unpinRef = useRef<UnpinFn>(() => undefined);

    useEffect(() => {
        let unsubStore: (() => void) | undefined;
        let cancelled = false;

        const unbind = onDashboardInteractive(() => {
            void import('@/app/stores/workspaceStore').then(({ useWorkspaceStore }) => {
                if (cancelled) return;
                const sync = () => {
                    const items = useWorkspaceStore.getState().pinnedItems;
                    setPinnedCount(items.filter((p) => p.type !== 'hub').length);
                };
                sync();
                unsubStore = useWorkspaceStore.subscribe(sync);
                unpinRef.current = (id, type) => {
                    useWorkspaceStore.getState().unpinItem(
                        id,
                        type as Parameters<ReturnType<typeof useWorkspaceStore.getState>['unpinItem']>[1],
                    );
                };
            });
        });

        return () => {
            cancelled = true;
            unbind();
            unsubStore?.();
        };
    }, []);

    const unpinItem = useCallback<UnpinFn>((id, type) => {
        unpinRef.current(id, type);
    }, []);

    return { pinnedCount, unpinItem };
}
