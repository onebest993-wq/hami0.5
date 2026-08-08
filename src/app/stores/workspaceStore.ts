import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSecureJSONStorage } from '@/app/services/securePersistStorage';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import {
    WORKSPACE_STORE_KEY,
    WORKSPACE_STORE_PERSIST_VERSION,
    migrateWorkspacePersistState,
    normalizeWorkspacePersistSlice,
} from '@/app/infrastructure/persistence/workspaceStorePersist';
import { createPersistRehydrateReporter } from '@/app/infrastructure/persistence/zustandPersistFoundation';
import { buildWorkspaceRoute } from '@/app/workspace/workspaceRoutes';
import {
    WORKSPACE_PIN_TYPES,
    isClusterPinEligibleType,
} from '@/app/workspace/types';

const MAX_PIN_TITLE = 200;

function sanitizePinnedItem(item: WorkspacePinnedItem): WorkspacePinnedItem | null {
    if (!WORKSPACE_PIN_TYPES.includes(item.type)) return null;
    if (!isClusterPinEligibleType(item.type)) return null;
    const id = String(item.id ?? '').trim().slice(0, 128);
    if (!id) return null;
    return {
        id,
        type: item.type,
        title: String(item.title ?? '—').trim().slice(0, MAX_PIN_TITLE) || '—',
        clientName: String(item.clientName ?? '').trim().slice(0, 120),
        caseNumber: String(item.caseNumber ?? '').trim().slice(0, 80),
        routePath: buildWorkspaceRoute(item.type, id),
    };
}

type WorkspaceStoreState = {
    pinnedItems: WorkspacePinnedItem[];
    pinItem: (item: WorkspacePinnedItem) => void;
    unpinItem: (id: string, type: WorkspacePinnedItem['type']) => void;
    togglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
    pruneMissingPins: (validKeys: ReadonlySet<string>) => void;
    clearPins: () => void;
    /** إزالة تثبيتات التنفيذ المحفوظة سابقاً */
    pruneIneligiblePins: () => void;
};

type WorkspacePersisted = Pick<WorkspaceStoreState, 'pinnedItems'>;

function pinKey(id: string, type: WorkspacePinnedItem['type']): string {
    return `${type}:${id}`;
}

export const useWorkspaceStore = create<WorkspaceStoreState>()(
    persist<WorkspaceStoreState, [], [], WorkspacePersisted>(
        (set, get) => ({
            pinnedItems: [],
            pinItem: (item) => {
                const safe = sanitizePinnedItem(item);
                if (!safe) return;
                const key = pinKey(safe.id, safe.type);
                set((s) => {
                    if (s.pinnedItems.some((p) => pinKey(p.id, p.type) === key)) return s;
                    return { pinnedItems: [safe, ...s.pinnedItems].slice(0, 24) };
                });
            },
            unpinItem: (id, type) => {
                const key = pinKey(id, type);
                set((s) => ({
                    pinnedItems: s.pinnedItems.filter((p) => pinKey(p.id, p.type) !== key),
                }));
            },
            togglePin: (item) => {
                if (get().isPinned(item.id, item.type)) {
                    get().unpinItem(item.id, item.type);
                } else {
                    get().pinItem(item);
                }
            },
            isPinned: (id, type) => get().pinnedItems.some((p) => pinKey(p.id, p.type) === pinKey(id, type)),
            pruneMissingPins: (validKeys) => {
                set((s) => {
                    const next = s.pinnedItems.filter((p) => validKeys.has(pinKey(p.id, p.type)));
                    return next.length === s.pinnedItems.length ? s : { pinnedItems: next };
                });
            },
            clearPins: () => set({ pinnedItems: [] }),
            pruneIneligiblePins: () =>
                set((s) => ({
                    pinnedItems: s.pinnedItems.filter((p) => isClusterPinEligibleType(p.type)),
                })),
        }),
        {
            name: WORKSPACE_STORE_KEY,
            version: WORKSPACE_STORE_PERSIST_VERSION,
            storage: createSecureJSONStorage<WorkspacePersisted>(),
            migrate: migrateWorkspacePersistState,
            partialize: (s) => ({ pinnedItems: s.pinnedItems }),
            merge: (persisted, current) => ({
                ...current,
                ...normalizeWorkspacePersistSlice(persisted),
            }),
            onRehydrateStorage: createPersistRehydrateReporter({
                area: 'workspace-store',
                storageKey: WORKSPACE_STORE_KEY,
                version: WORKSPACE_STORE_PERSIST_VERSION,
            }),
        },
    ),
);
