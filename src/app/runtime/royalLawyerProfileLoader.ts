type RoyalLawyerProfileModule = typeof import('@/app/components/lawyer/RoyalLawyerProfile');

let profileModulePromise: Promise<RoyalLawyerProfileModule> | null = null;

export function prefetchRoyalLawyerProfile(): void {
    if (typeof window === 'undefined') return;
    if (!profileModulePromise) {
        profileModulePromise = import('@/app/components/lawyer/RoyalLawyerProfile');
    }
}

export function loadRoyalLawyerProfileModule(): Promise<RoyalLawyerProfileModule> {
    prefetchRoyalLawyerProfile();
    return profileModulePromise!;
}
