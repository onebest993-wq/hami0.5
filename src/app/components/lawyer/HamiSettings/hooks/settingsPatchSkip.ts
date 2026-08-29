/** يتخطى setState/DOM إن لم يتغيّر أي مفتاح في الشريحة */
export function isUnchangedSlicePatch<T extends object>(current: T, partial: Partial<T>): boolean {
    const keys = Object.keys(partial) as Array<keyof T>;
    if (keys.length === 0) return true;
    return keys.every((key) => Object.is(current[key], partial[key]));
}
