import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock(
    '@/app/components/lawyer/RoyalLawyerProfile/components/settings/ProfileCanvasBackgroundEditor',
    () => ({
        ProfileCanvasBackgroundEditor: () => null,
    }),
);

import {
    getCachedProfileCanvasBackgroundEditor,
    isProfileCanvasBgEditorResolved,
    loadProfileCanvasBgEditorModule,
    prefetchProfileCanvasBgEditorModule,
    resetProfileCanvasBgEditorLoaderForTests,
} from '@/app/runtime/profileCanvasBgEditorLoader';

describe('profileCanvasBgEditorLoader', () => {
    beforeEach(() => {
        resetProfileCanvasBgEditorLoaderForTests();
    });

    it('يحمّل المحرّر عند الطلب فقط', async () => {
        expect(isProfileCanvasBgEditorResolved()).toBe(false);
        await loadProfileCanvasBgEditorModule();
        expect(isProfileCanvasBgEditorResolved()).toBe(true);
        expect(getCachedProfileCanvasBackgroundEditor()).toBeTruthy();
    });

    it('prefetch لا يرمي', () => {
        expect(() => prefetchProfileCanvasBgEditorModule()).not.toThrow();
    });
});
