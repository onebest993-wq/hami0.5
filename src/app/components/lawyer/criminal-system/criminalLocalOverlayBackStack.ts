/**
 * مكدس LIFO لطبقات محلية داخل الإضبارة الجنائية (canvas / موعد محاكمة).
 * يُستهلك أولاً من `handleDashboardBack` (زر الهيدر) قبل تبويب/خروج.
 */
type CriminalLocalOverlayBackCloser = () => boolean;

const stack: CriminalLocalOverlayBackCloser[] = [];

/** تسجيل closer أثناء نشاط الطبقة — يُرجع إلغاء التسجيل. */
export function pushCriminalLocalOverlayBack(
    closer: CriminalLocalOverlayBackCloser,
): () => void {
    stack.push(closer);
    return () => {
        const idx = stack.lastIndexOf(closer);
        if (idx >= 0) stack.splice(idx, 1);
    };
}

/** يستدعي أعلى closer؛ true إن أُغلقت طبقة محلية. */
export function tryPopCriminalLocalOverlayBack(): boolean {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i]?.()) return true;
    }
    return false;
}

/** للاختبارات */
export function resetCriminalLocalOverlayBackStackForTests(): void {
    stack.length = 0;
}

/** للاختبارات */
export function criminalLocalOverlayBackStackDepthForTests(): number {
    return stack.length;
}
