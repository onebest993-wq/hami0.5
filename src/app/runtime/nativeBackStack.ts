export type NativeBackHandler = () => boolean;

/** مكدس LIFO — آخر مسجّل يُستهلك أولاً (تجنّب سباق الطبقات المتداخلة) */
const nativeBackHandlers: NativeBackHandler[] = [];

/** تسجيل معالج رجوع أندرويد — يُرجع true إذا استُوعب الحدث */
export function registerNativeBackHandler(handler: NativeBackHandler): () => void {
    nativeBackHandlers.push(handler);
    return () => {
        const idx = nativeBackHandlers.lastIndexOf(handler);
        if (idx >= 0) nativeBackHandlers.splice(idx, 1);
    };
}

export function dispatchNativeBack(): boolean {
    for (let i = nativeBackHandlers.length - 1; i >= 0; i -= 1) {
        const handler = nativeBackHandlers[i];
        if (handler?.()) return true;
    }
    return false;
}

/** للاختبارات — محاكاة زر الرجوع */
export function consumeNativeBackForTests(): boolean {
    return dispatchNativeBack();
}

/** للاختبارات — إفراغ المكدس */
export function resetNativeBackHandlersForTests(): void {
    nativeBackHandlers.length = 0;
}
