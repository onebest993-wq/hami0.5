import { useEffect, useSyncExternalStore } from 'react';
import {
    getCommandHubTilesStoreSnapshot,
    loadCommandHubTiles,
    subscribeCommandHubTiles,
    type CommandHubTilesModule,
} from '@/app/runtime/commandHubTilesLoader';

/** بلاطات المركز من الكاش إن وُجدت، وإلا تُحمَّل مرة واحدة. */
export function useCommandHubTiles(): CommandHubTilesModule | null {
    const snap = useSyncExternalStore(
        subscribeCommandHubTiles,
        getCommandHubTilesStoreSnapshot,
        getCommandHubTilesStoreSnapshot,
    );

    useEffect(() => {
        if (!snap) void loadCommandHubTiles();
    }, [snap]);

    return snap?.mod ?? null;
}
