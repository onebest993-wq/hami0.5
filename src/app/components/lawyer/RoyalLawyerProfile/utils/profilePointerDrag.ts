/** مؤشرات السحب على أندرويد: الزر قد يكون -1، وcapture قد يُرفض دون أن يُلغى السحب. */

export function isCoarsePointerType(pointerType: string | undefined): boolean {
    return pointerType === 'touch' || pointerType === 'pen';
}

export function isPrimaryDragPointer(event: {
    button: number;
    pointerType?: string;
}): boolean {
    if (isCoarsePointerType(event.pointerType)) return true;
    return event.button === 0 || event.button === -1;
}

export function preventDefaultIfCancelable(event: {
    cancelable: boolean;
    preventDefault: () => void;
}): void {
    if (event.cancelable) event.preventDefault();
}

export function capturePointerSafe(target: EventTarget | null | undefined, pointerId: number): boolean {
    if (!target || typeof (target as Element).setPointerCapture !== 'function') return false;
    try {
        (target as Element).setPointerCapture(pointerId);
        return true;
    } catch {
        return false;
    }
}

export function releasePointerSafe(target: EventTarget | null | undefined, pointerId: number): void {
    if (!target || typeof (target as Element).hasPointerCapture !== 'function') return;
    try {
        const el = target as Element;
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
        /* WebView قد يرفض الإطلاق بعد pointercancel */
    }
}
