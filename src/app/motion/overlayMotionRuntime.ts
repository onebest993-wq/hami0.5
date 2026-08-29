/**
 * نقطة دخول واحدة لمكتبة الحركة.
 * - بعد الإقلاع: loadOverlayMotion (HamiMotionConfig / prefetch).
 * - الشاشات/الأوراق: استيراد ساكن من هنا فقط — ممنوع `motion/react` مباشرة.
 * ممنوع استيرادها من stem / first-tab / header.
 */
export {
    AnimatePresence,
    LayoutGroup,
    MotionConfig,
    animate,
    motion,
    useDragControls,
    useMotionValue,
} from 'motion/react';
