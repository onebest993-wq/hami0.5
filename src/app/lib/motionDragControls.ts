/**
 * motion@12 يصدّر useDragControls وقت التشغيل بينما تعريفات الحزمة ناقصة.
 * غلاف محلي — لا تغيير سلوكي.
 */
import * as MotionReact from 'motion/react';

export type DragControls = {
    // React.PointerEvent أو أحداث DOM — التوقيع الفعلي في motion أوسع من الأنواع الناقصة
    start: (event: unknown, options?: { snapToCursor?: boolean }) => void;
};

type MotionReactWithDrag = typeof MotionReact & {
    useDragControls: () => DragControls;
};

export function useDragControls(): DragControls {
    return (MotionReact as MotionReactWithDrag).useDragControls();
}
