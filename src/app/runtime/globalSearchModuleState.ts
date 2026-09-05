let overlayModuleResolved = false;

export function isGlobalSearchOverlayModuleResolved(): boolean {
    return overlayModuleResolved;
}

export function markGlobalSearchOverlayModuleResolved(): void {
    overlayModuleResolved = true;
}
