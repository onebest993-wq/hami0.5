let overlayModuleResolved = false;

export function isGlobalSearchOverlayModuleResolved(): boolean {
    return overlayModuleResolved;
}

export function markGlobalSearchOverlayModuleResolved(): void {
    overlayModuleResolved = true;
}

export function resetGlobalSearchOverlayModuleStateForTests(): void {
    overlayModuleResolved = false;
}
