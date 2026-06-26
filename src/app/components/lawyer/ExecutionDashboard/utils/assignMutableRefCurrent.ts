import type { MutableRefObject, RefObject } from 'react';

/** يعيّن ref.current بأمان — يمنع crash عند غياب ref من scope */
export function assignMutableRefCurrent<T>(
    ref: RefObject<T> | MutableRefObject<T> | null | undefined,
    value: T,
): void {
    if (!ref || typeof ref !== 'object') return;
    if (!('current' in ref)) return;
    (ref as MutableRefObject<T>).current = value;
}
