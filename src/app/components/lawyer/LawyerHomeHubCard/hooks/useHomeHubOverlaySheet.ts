import { useCallback, useEffect } from 'react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    pushHomeHubOverlayBack,
    requestCloseHomeHubOverlay,
    type HomeHubOverlayBackId,
} from '../homeHub/homeHubOverlayBackStack';

/** قفل التمرير + مكدس رجوع موحّد (Cap/Escape/سحب/خلفية) */
export function useHomeHubOverlaySheet(
    open: boolean,
    onClose: () => void,
    overlayId: HomeHubOverlayBackId,
): { requestBack: () => void } {
    useBodyScrollLock(open);

    useEffect(() => {
        if (!open) return undefined;
        return pushHomeHubOverlayBack(overlayId, onClose);
    }, [open, onClose, overlayId]);

    const requestBack = useCallback(() => {
        if (!open) return;
        requestCloseHomeHubOverlay(overlayId);
    }, [open, overlayId]);

    return { requestBack };
}
