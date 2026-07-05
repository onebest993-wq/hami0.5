const blockers = new Set<string>();

export function blockTasksOverlayEscape(key: string): void {
    blockers.add(key);
}

export function unblockTasksOverlayEscape(key: string): void {
    blockers.delete(key);
}

export function isTasksOverlayEscapeBlocked(): boolean {
    return blockers.size > 0;
}

/** للاختبارات */
export function resetTasksOverlayEscapeForTests(): void {
    blockers.clear();
}
