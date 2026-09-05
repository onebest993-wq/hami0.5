export function focPointerPrefetch(prefetch: () => void): (event: { button: number }) => void {
    return (event) => {
        if (event.button !== 0) return;
        prefetch();
    };
}

export function focPrepareOverlay(prefetch: () => void): {
    onPointerDown: (event: { button: number }) => void;
    onFocus: () => void;
} {
    return {
        onPointerDown: focPointerPrefetch(prefetch),
        onFocus: prefetch,
    };
}
