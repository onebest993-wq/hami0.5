import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClusterPinView, WorkspacePinnedItem } from '@/app/workspace/types';

type UnpinFn = (id: string, type: ClusterPinView['pin']['type']) => void;
type TogglePinFn = (item: WorkspacePinnedItem) => void;
type IsPinnedFn = (id: string, type: WorkspacePinnedItem['type']) => boolean;

/**
 * دبابيس مساحة العمل — تحميل ديناميكي حتى لا يسحب SecureStore مع صدفة الهاب تحت الغطاء.
 */
export function useHomeHubWorkspacePins(): {
    pinnedItems: WorkspacePinnedItem[];
    isPinned: IsPinnedFn;
    unpinItem: UnpinFn;
    togglePin: TogglePinFn;
} {
    const [pinnedItems, setPinnedItems] = useState<WorkspacePinnedItem[]>([]);
    const unpinRef = useRef<UnpinFn>(() => undefined);
    const toggleRef = useRef<TogglePinFn>(() => undefined);

    useEffect(() => {
        let cancelled = false;
        let unsub = () => {};
        void import('@/app/stores/workspaceStore')
            .then(({ useWorkspaceStore }) => {
                if (cancelled) return;
                const sync = () => {
                    setPinnedItems(useWorkspaceStore.getState().pinnedItems);
                };
                unpinRef.current = (id, type) => {
                    useWorkspaceStore.getState().unpinItem(id, type);
                };
                toggleRef.current = (item) => {
                    useWorkspaceStore.getState().togglePin(item);
                };
                sync();
                unsub = useWorkspaceStore.subscribe(sync);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            unsub();
        };
    }, []);

    const isPinned = useCallback<IsPinnedFn>(
        (id, type) => pinnedItems.some((p) => p.id === id && p.type === type),
        [pinnedItems],
    );
    const unpinItem = useCallback<UnpinFn>((id, type) => {
        unpinRef.current(id, type);
    }, []);
    const togglePin = useCallback<TogglePinFn>((item) => {
        toggleRef.current(item);
    }, []);

    return { pinnedItems, isPinned, unpinItem, togglePin };
}
