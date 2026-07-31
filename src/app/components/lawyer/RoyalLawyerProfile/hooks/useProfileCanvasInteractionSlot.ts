import { useEffect, useState } from 'react';
import {
    getActiveProfileCanvasSlot,
    releaseProfileCanvasSlot,
    subscribeProfileCanvasSlot,
    tryClaimProfileCanvasSlot,
} from '@/app/services/profile/profileCanvasInteractionGate';

/** يحجز slot تفاعل واحد للكتلة عندما تكون مرئية وتفاعلية */
export function useProfileCanvasInteractionSlot(blockId: string, wantsSlot: boolean): boolean {
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        if (!wantsSlot) {
            releaseProfileCanvasSlot(blockId);
            setAllowed(false);
            return;
        }

        const sync = () => {
            const active = getActiveProfileCanvasSlot();
            if (active === blockId) {
                setAllowed(true);
                return;
            }
            if (!active) {
                setAllowed(tryClaimProfileCanvasSlot(blockId));
                return;
            }
            setAllowed(false);
        };

        sync();
        return subscribeProfileCanvasSlot(sync);
    }, [blockId, wantsSlot]);

    useEffect(() => {
        return () => releaseProfileCanvasSlot(blockId);
    }, [blockId]);

    return allowed;
}
