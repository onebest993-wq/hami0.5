import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileScreenEscape } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileScreenEscape';

let nativeBackHandler: (() => boolean) | null = null;

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeBackHandler = handler;
        return () => {
            if (nativeBackHandler === handler) nativeBackHandler = null;
        };
    },
}));

describe('useProfileScreenEscape', () => {
    beforeEach(() => {
        nativeBackHandler = null;
    });

    it('يستدعي onLeaveProfile عند Escape بدون استوديو', () => {
        const onLeaveProfile = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: false,
                isEditing: false,
                onCloseSettings: vi.fn(),
                onLeaveProfile,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onLeaveProfile).toHaveBeenCalledTimes(1);
    });

    it('Escape أثناء التحرير يمرّ عبر onLeaveProfile (حفظ+مغادرة) لا إلغاء صامت', () => {
        const onLeaveProfile = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: false,
                isEditing: true,
                onCloseSettings: vi.fn(),
                onLeaveProfile,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onLeaveProfile).toHaveBeenCalledTimes(1);
    });

    it('يتجاهل Escape عند فتح استوديو الصفحة', () => {
        const onLeaveProfile = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: true,
                isEditing: false,
                onCloseSettings: vi.fn(),
                onLeaveProfile,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onLeaveProfile).not.toHaveBeenCalled();
    });

    it('يتجاهل Escape عند هيكل تحميل الاستوديو حتى لو settingsOpen=false', () => {
        const onLeaveProfile = vi.fn();
        const loading = document.createElement('div');
        loading.setAttribute('data-testid', 'profile-settings-sheet-loading');
        document.body.appendChild(loading);
        try {
            renderHook(() =>
                useProfileScreenEscape({
                    enabled: true,
                    settingsOpen: false,
                    isEditing: false,
                    onCloseSettings: vi.fn(),
                    onLeaveProfile,
                }),
            );

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

            expect(onLeaveProfile).not.toHaveBeenCalled();
        } finally {
            loading.remove();
        }
    });

    it('يغلق الاستوديو من Escape إن بقيت النية على html بلا ورقة', () => {
        document.documentElement.setAttribute('data-hami-profile-studio-open', '1');
        const onCloseSettings = vi.fn();
        const onLeaveProfile = vi.fn();
        try {
            renderHook(() =>
                useProfileScreenEscape({
                    enabled: true,
                    settingsOpen: false,
                    isEditing: false,
                    onCloseSettings,
                    onLeaveProfile,
                }),
            );

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

            expect(onCloseSettings).toHaveBeenCalledTimes(1);
            expect(onLeaveProfile).not.toHaveBeenCalled();
        } finally {
            document.documentElement.removeAttribute('data-hami-profile-studio-open');
        }
    });

    it('لا يستدعي onLeaveProfile عند enabled=false (keep-alive مخفي)', () => {
        const onLeaveProfile = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: false,
                settingsOpen: false,
                isEditing: false,
                onCloseSettings: vi.fn(),
                onLeaveProfile,
            }),
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

        expect(onLeaveProfile).not.toHaveBeenCalled();
        expect(nativeBackHandler).toBeNull();
    });

    it('Cap native back يغلق الاستوديو أولاً', () => {
        const onCloseSettings = vi.fn();
        const onLeaveProfile = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: true,
                isEditing: false,
                onCloseSettings,
                onLeaveProfile,
            }),
        );

        expect(nativeBackHandler?.()).toBe(true);
        expect(onCloseSettings).toHaveBeenCalledTimes(1);
        expect(onLeaveProfile).not.toHaveBeenCalled();
    });

    it('Cap native back يغلق المعرض قبل مغادرة الملف', () => {
        const onCloseGallery = vi.fn();
        const onLeaveProfile = vi.fn();
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: false,
                galleryOpen: true,
                isEditing: false,
                onCloseSettings: vi.fn(),
                onCloseGallery,
                onLeaveProfile,
            }),
        );

        expect(nativeBackHandler?.()).toBe(true);
        expect(onCloseGallery).toHaveBeenCalledTimes(1);
        expect(onLeaveProfile).not.toHaveBeenCalled();
    });

    it('Cap native back يغلق المعرض عبر ref حتى قبل تحديث state', () => {
        const onCloseGallery = vi.fn();
        const onLeaveProfile = vi.fn();
        const galleryOpenRef = { current: true };
        renderHook(() =>
            useProfileScreenEscape({
                enabled: true,
                settingsOpen: false,
                galleryOpen: false,
                galleryOpenRef,
                isEditing: false,
                onCloseSettings: vi.fn(),
                onCloseGallery,
                onLeaveProfile,
            }),
        );

        expect(nativeBackHandler?.()).toBe(true);
        expect(onCloseGallery).toHaveBeenCalledTimes(1);
        expect(onLeaveProfile).not.toHaveBeenCalled();
    });

    it('ورقة استوديو مخفية في الـ DOM لا تبتلع Escape', () => {
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'profile-settings-sheet');
        sheet.setAttribute('aria-hidden', 'true');
        sheet.style.display = 'none';
        document.body.appendChild(sheet);
        const onLeaveProfile = vi.fn();
        try {
            renderHook(() =>
                useProfileScreenEscape({
                    enabled: true,
                    settingsOpen: false,
                    isEditing: false,
                    onCloseSettings: vi.fn(),
                    onLeaveProfile,
                }),
            );

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

            expect(onLeaveProfile).toHaveBeenCalledTimes(1);
        } finally {
            sheet.remove();
        }
    });
});
