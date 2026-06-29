let profileModuleResolved = false;

export function isRoyalLawyerProfileModuleResolved(): boolean {
    return profileModuleResolved;
}

export function markRoyalLawyerProfileModuleResolved(): void {
    profileModuleResolved = true;
}

export function resetRoyalLawyerProfileModuleStateForTests(): void {
    profileModuleResolved = false;
}
