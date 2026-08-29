import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isClusterPinEligibleType, type WorkspacePinnedItem } from '@/app/workspace/types';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import { ExecutionArchivePinMark } from '../executionArchiveMarks';

type WorkspaceStoreApi = typeof import('@/app/stores/workspaceStore').useWorkspaceStore;

let workspaceStorePromise: Promise<WorkspaceStoreApi> | null = null;
let workspaceStoreApi: WorkspaceStoreApi | null = null;

function loadWorkspaceStore(): Promise<WorkspaceStoreApi> {
    if (!workspaceStorePromise) {
        workspaceStorePromise = import('@/app/stores/workspaceStore').then((m) => {
            workspaceStoreApi = m.useWorkspaceStore;
            return m.useWorkspaceStore;
        });
    }
    return workspaceStorePromise;
}

function peekPinned(id: string, type: WorkspacePinnedItem['type']): boolean {
    try {
        return workspaceStoreApi?.getState().isPinned(id, type) ?? false;
    } catch {
        return false;
    }
}

/** يسخّن مخزن التثبيت دون سحب lucide Pin ولا زر الدعاوى. */
export function prefetchExecutionArchivePinStore(): void {
    void loadWorkspaceStore().catch(() => undefined);
}

/**
 * زر تثبيت حقيقي من أول إطار — نقرة واحدة تُتمّ العمل.
 * مخزن zustand يُحمَّل بعد الرسم (وأثناء النقر إن لزم) بلا زر وهمي يبتلع اللمسة الأولى.
 */
export function ExecutionArchiveCardPin({ item }: { item: WorkspacePinnedItem }) {
    const [pinned, setPinned] = useState(() =>
        isClusterPinEligibleType(item.type) ? peekPinned(item.id, item.type) : false,
    );
    const inFlightRef = useRef(false);

    useEffect(() => {
        if (!isClusterPinEligibleType(item.type)) return undefined;
        let cancelled = false;
        let unsubscribe: (() => void) | undefined;
        void loadWorkspaceStore()
            .then((store) => {
                if (cancelled) return;
                setPinned(store.getState().isPinned(item.id, item.type));
                unsubscribe = store.subscribe((state) => {
                    if (!cancelled) setPinned(state.isPinned(item.id, item.type));
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    }, [item.id, item.type]);

    const onClick = useCallback(
        async (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (inFlightRef.current) return;
            inFlightRef.current = true;
            try {
                const store = await loadWorkspaceStore();
                store.getState().togglePin(item);
                setPinned(store.getState().isPinned(item.id, item.type));
            } finally {
                inFlightRef.current = false;
            }
        },
        [item],
    );

    if (!isClusterPinEligibleType(item.type)) return null;

    const visual = workspacePinVisual(item.type);
    const pinTitle = pinned ? 'إلغاء التثبيت' : 'تثبيت الإضبارة في الواجهة';
    const typedClass = pinned
        ? `${visual.button} ${visual.accent}`
        : `${visual.button} opacity-80 text-white/60`;

    return (
        <button
            type="button"
            title={pinTitle}
            aria-label={pinned ? 'إلغاء تثبيت البطاقة' : 'تثبيت الإضبارة'}
            aria-pressed={pinned}
            data-testid={`workspace-pin-${item.type}-${item.id}`}
            onClick={onClick}
            className={`shrink-0 inline-flex h-11 min-h-[44px] min-w-[44px] w-11 items-center justify-center rounded-lg border touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/25 ${typedClass}`}
        >
            <ExecutionArchivePinMark size={15} filled={pinned} />
        </button>
    );
}
