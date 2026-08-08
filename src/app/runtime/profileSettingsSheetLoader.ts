import type { ComponentProps, ComponentType } from 'react';
import { ensureRejectClearingPromise } from '@/app/runtime/ensureRejectClearingPromise';
import { prefetchProfileStudioChunk } from '@/app/runtime/profileSettingsStudioTabsLoader';

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
    return ensureRejectClearingPromise(modulePromise, (next) => {
        modulePromise = next;
    }, () => {
        prefetchProfileStudioChunk('appearance');
        return import(
            '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet'
        ).then((mod) => {
            if (mod?.ProfileSettingsSheet) cachedSheet = mod.ProfileSettingsSheet;
            return mod;
        });
    });
}

export function loadProfileSettingsSheetModule(): Promise<ProfileSettingsSheetModule> {
    return ensureModule();
}

export function prefetchProfileSettingsSheetModule(): void {
    if (typeof window === 'undefined') return;
    void ensureModule().catch(() => undefined);
}
