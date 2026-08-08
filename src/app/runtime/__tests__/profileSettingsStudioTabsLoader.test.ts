import { describe, expect, it, beforeEach, vi } from 'vitest';

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
    getCachedProfileSettingsAppearanceTab,
    getCachedProfileSettingsContainersTab,
    getCachedTextBlockStudioEditor,
    isProfileSettingsStudioTabsResolved,
    isProfileStudioChunkResolved,
    isProfileStudioMainTabResolved,
    loadProfileSettingsStudioTabs,
    loadProfileStudioChunk,
    loadProfileStudioMainTab,
    resetProfileSettingsStudioTabsLoaderForTests,
} from '@/app/runtime/profileSettingsStudioTabsLoader';

describe('profileSettingsStudioTabsLoader', () => {
    beforeEach(() => {
        resetProfileSettingsStudioTabsLoaderForTests();
    });

    it('يحمّل تبويب المظهر وحده دون المحرّرين', async () => {
        expect(isProfileStudioMainTabResolved('appearance')).toBe(false);
        await loadProfileStudioMainTab('appearance');
        expect(isProfileStudioMainTabResolved('appearance')).toBe(true);
        expect(getCachedProfileSettingsAppearanceTab()).toBeTruthy();
        expect(isProfileStudioChunkResolved('textEditor')).toBe(false);
        expect(isProfileStudioChunkResolved('imageEditor')).toBe(false);
    });

    it('يحمّل تبويب المحتويات والمحرّرين بشكل منفصل', async () => {
        await loadProfileStudioMainTab('containers');
        expect(getCachedProfileSettingsContainersTab()).toBeTruthy();
        expect(isProfileStudioChunkResolved('textEditor')).toBe(false);

        await loadProfileStudioChunk('textEditor');
        expect(getCachedTextBlockStudioEditor()).toBeTruthy();
        expect(isProfileSettingsStudioTabsResolved()).toBe(false);
    });

    it('loadProfileSettingsStudioTabs يحمّل كل الأقسام للاختبارات', async () => {
        expect(isProfileSettingsStudioTabsResolved()).toBe(false);
        await loadProfileSettingsStudioTabs();
        expect(isProfileSettingsStudioTabsResolved()).toBe(true);
    });
});
