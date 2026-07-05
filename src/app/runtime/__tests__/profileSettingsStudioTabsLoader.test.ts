import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock(
    '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsPrivacyTab',
    () => ({
        ProfileSettingsPrivacyTab: () => null,
    }),
);
vi.mock(
    '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsAppearanceTab',
    () => ({
        ProfileSettingsAppearanceTab: () => null,
    }),
);
vi.mock(
    '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileSettingsContainersTab',
    () => ({
        ProfileSettingsContainersTab: () => null,
    }),
);
vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/TextBlockStudioEditor', () => ({
    TextBlockStudioEditor: () => null,
}));
vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ImageBlockStudioEditor', () => ({
    ImageBlockStudioEditor: () => null,
}));

import {
    getCachedProfileSettingsPrivacyTab,
    isProfileSettingsStudioTabsResolved,
    loadProfileSettingsStudioTabs,
    resetProfileSettingsStudioTabsLoaderForTests,
} from '@/app/runtime/profileSettingsStudioTabsLoader';

describe('profileSettingsStudioTabsLoader', () => {
    beforeEach(() => {
        resetProfileSettingsStudioTabsLoaderForTests();
    });

    it('يحمّل التبويبات الثلاثة والمحرّرين معاً', async () => {
        expect(isProfileSettingsStudioTabsResolved()).toBe(false);
        await loadProfileSettingsStudioTabs();
        expect(isProfileSettingsStudioTabsResolved()).toBe(true);
        expect(getCachedProfileSettingsPrivacyTab()).toBeTruthy();
    });
});
