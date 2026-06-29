import React, { lazy, Suspense, useEffect } from 'react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    loadProfileSettingsSheetModule,
    prefetchProfileSettingsSheet,
    prefetchProfileSettingsStudioTabs,
} from '@/app/utils/lazyComponents';
import { ProfileSettingsSheetLoadingFallback } from './ProfileSettingsSheetLoadingFallback';

const LazyProfileSettingsSheet = lazy(() =>
    import('./ProfileSettingsSheet').then((m) => ({ default: m.ProfileSettingsSheet })),
);

export type ProfileSettingsSheetHostProps = {
    open: boolean;
    onClose: () => void;
    customization: ProfilePageCustomization;
    actions: ProfileAction[];
    userId: string;
    onSave: (next: ProfilePageCustomization) => Promise<boolean>;
    onDraftChange?: (draft: ProfilePageCustomization) => void;
    saving?: boolean;
};

/** يُبقى الاستوديو mounted مع الملف — يُحمَّل chunk عند دخول الصفحة لا عند النقر */
export function ProfileSettingsSheetHost({
    open,
    onClose,
    customization,
    actions,
    userId,
    onSave,
    onDraftChange,
    saving = false,
}: ProfileSettingsSheetHostProps) {
    useEffect(() => {
        prefetchProfileSettingsSheet();
        prefetchProfileSettingsStudioTabs();
        void loadProfileSettingsSheetModule().catch(() => undefined);
    }, []);

    return (
        <Suspense fallback={open ? <ProfileSettingsSheetLoadingFallback /> : null}>
            <LazyProfileSettingsSheet
                open={open}
                onClose={onClose}
                customization={customization}
                actions={actions}
                userId={userId}
                onSave={onSave}
                onDraftChange={onDraftChange}
                saving={saving}
            />
        </Suspense>
    );
}
