/**
 * React 18 treats `inert={true}` as an unknown boolean DOM attribute and warns.
 * HTML boolean attributes should be present (empty string) or omitted.
 */
export function inertProps(when: boolean): { inert?: '' } {
    return when ? { inert: '' } : {};
}

/** يزيل التركيز من عنصر داخل الحاوية — يمنع تحذير aria-hidden + focus */
export function blurFocusWithin(container: HTMLElement | null | undefined): void {
    if (!container || typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && container.contains(active)) {
        active.blur();
    }
}
