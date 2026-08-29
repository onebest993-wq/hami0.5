export function clampFocus(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampZoom(value: number) {
    return Math.max(50, Math.min(400, Math.round(value)));
}
