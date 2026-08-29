/** حافة الشاشة — إيماءة رجوع النظام (iOS/Android) لا تُسرق كسحب أقسام */
export const FORUM_SYSTEM_GESTURE_EDGE_PX = 32;

export function isForumSwipeFromSystemGestureEdge(
    clientX: number,
    viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0,
): boolean {
    if (viewportWidth <= 0) return false;
    return clientX < FORUM_SYSTEM_GESTURE_EDGE_PX || clientX > viewportWidth - FORUM_SYSTEM_GESTURE_EDGE_PX;
}
