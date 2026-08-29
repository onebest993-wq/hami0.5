import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';

/** نفس مرساة طبقة المنتدى — النوافذ يجب أن تُرسم هنا لا على document.body (z-index 100 < 229). */
export const FORUM_OVERLAY_PORTAL_ID = 'hami-overlay-portal';
export const FORUM_OVERLAY_PORTAL_Z = 229;

export function getForumOverlayPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({
        id: FORUM_OVERLAY_PORTAL_ID,
        zIndex: FORUM_OVERLAY_PORTAL_Z,
    });
}
