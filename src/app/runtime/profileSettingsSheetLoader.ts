import type { ComponentProps, ComponentType } from 'react';
import { prefetchProfileSettingsStudioTabsModule } from '@/app/runtime/profileSettingsStudioTabsLoader';

type ProfileSettingsSheetModule =
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet');

type ProfileSettingsSheetProps = ComponentProps<ProfileSettingsSheetModule['ProfileSettingsSheet']>;

export type ProfileSettingsSheetComponent = ComponentType<ProfileSettingsSheetProps>;

let modulePromise: Promise<ProfileSettingsSheetModule> | null = null;
let cachedSheet: ProfileSettingsSheetComponent | null = null;

export function isProfileSettingsSheetResolved(): boolean {
    return cachedSheet !== null;
}

export function getCachedProfileSettingsSheet(): ProfileSettingsSheetComponent | null {
    return cachedSheet;
}

export function resetProfileSettingsSheetLoaderForTests(): void {
    modulePromise = null;
    cachedSheet = null;
}

function ensureModule(): Promise<ProfileSettingsSheetModule> {
    if (!modulePromise) {
        prefetchProfileSettingsStudioTabsModule();
        modulePromise = import(
            '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet'
        ).then((mod) => {
            if (mod?.ProfileSettingsSheet) cachedSheet = mod.ProfileSettingsSheet;
            return mod;
        });
    }
    return modulePromise;
}

export function loadProfileSettingsSheetModule(): Promise<ProfileSettingsSheetModule> {
    return ensureModule();
}

export function prefetchProfileSettingsSheetModule(): void {
    if (typeof window === 'undefined') return;
    void ensureModule().catch(() => undefined);
}
