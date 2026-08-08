import {
    WORKSPACE_PIN_TYPES,
    isClusterPinEligibleType,
    type WorkspacePinnedItem,
} from '@/app/workspace/types';
import { buildWorkspaceRoute } from '@/app/workspace/workspaceRoutes';
import {
    FOUNDATION_STORE_PERSIST_V1,
    unwrapPersistedSlice,
} from '@/app/infrastructure/persistence/zustandPersistFoundation';

export const WORKSPACE_STORE_KEY = 'hami:workspace:pins:v1';export const WORKSPACE_STORE_PERSIST_VERSION = FOUNDATION_STORE_PERSIST_V1;

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

export type WorkspacePersistSlice = {
    pinnedItems: WorkspacePinnedItem[];
};

export function normalizeWorkspacePersistSlice(persisted: unknown): WorkspacePersistSlice {
    const slice = unwrapPersistedSlice<WorkspacePersistSlice>(persisted);
    const raw = Array.isArray(slice.pinnedItems) ? slice.pinnedItems : [];
    const pinnedItems = raw
        .map((item) => sanitizePinnedItem(item as WorkspacePinnedItem))
        .filter((item): item is WorkspacePinnedItem => Boolean(item))
        .slice(0, 24);
    return { pinnedItems };
}

export function migrateWorkspacePersistState(persisted: unknown, _version: number): WorkspacePersistSlice {
    void _version;
    return normalizeWorkspacePersistSlice(persisted);
}
