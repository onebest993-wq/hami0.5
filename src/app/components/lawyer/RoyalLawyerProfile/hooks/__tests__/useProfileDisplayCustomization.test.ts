import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileDisplayCustomization } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileDisplayCustomization';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/services/profile/profileThemeRuntime', () => ({
    applyProfileRootTheme: vi.fn(),
    scheduleProfileRootTheme: vi.fn(),
    getLiveProfileAppearance: vi.fn(() => null),
    clearLiveProfileAppearance: vi.fn(),
}));

import { applyProfileRootTheme } from '@/app/services/profile/profileThemeRuntime';

describe('useProfileDisplayCustomization', () => {
    const saveCustomization = vi.fn(async () => true);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يعرض التخصيص المحفوظ خارج الاستوديو', () => {
        const base = defaultProfilePageCustomization();
        const customization = {
            ...base,
            appearance: { ...base.appearance, material: 'glass' as const },
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: false,
                saveCustomization,
            }),
        );

        expect(result.current.displayCustomization.appearance.material).toBe('glass');
    });

    it('يطبق ثيم المعاينة فوراً ويعيد مزامنة material في React (ornate)', () => {
        const customization = defaultProfilePageCustomization();
        const nextDraft = {
            ...customization,
            appearance: { ...customization.appearance, material: 'ornate' as const },
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: true,
                saveCustomization,
            }),
        );

        act(() => {
            result.current.handleSettingsDraftChange(nextDraft);
        });

        expect(applyProfileRootTheme).toHaveBeenCalledWith(nextDraft.appearance);
        expect(result.current.displayCustomization.appearance.material).toBe('ornate');
    });

    it('عند بدء التعديل يعرض التخصيص المحفوظ وليس معاينة قديمة', () => {
        const committed = {
            ...defaultProfilePageCustomization(),
            appearance: {
                ...defaultProfilePageCustomization().appearance,
                accentColor: 'emerald' as const,
                portraitFrame: 'classic' as const,
            },
        };
        const { result, rerender } = renderHook(
            ({ isEditing }: { isEditing: boolean }) =>
                useProfileDisplayCustomization({
                    customization: committed,
                    isEditing,
                    settingsOpen: false,
                    saveCustomization,
                }),
            { initialProps: { isEditing: false } },
        );

        expect(result.current.displayCustomization.appearance.accentColor).toBe('emerald');

        act(() => {
            rerender({ isEditing: true });
        });

        expect(result.current.displayCustomization.appearance.accentColor).toBe('emerald');
        expect(result.current.displayCustomization.appearance.portraitFrame).toBe('classic');
    });

    it('يزامن الخصوصية أثناء الاستوديو دون مزامنة نص الكتل الموجودة', () => {
        const baseBlock = {
            id: 'b1',
            kind: 'text' as const,
            title: 'نص',
            body: 'قديم',
            order: 0,
        };
        const customization = {
            ...defaultProfilePageCustomization(),
            customBlocks: [baseBlock],
        };
        const nextDraft = {
            ...customization,
            privacy: { ...customization.privacy, showGallery: false },
            customBlocks: [{ ...baseBlock, body: 'كتابة طويلة لا يجب أن تُرسم على الملف' }],
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: true,
                saveCustomization,
            }),
        );

        act(() => {
            result.current.handleSettingsDraftChange(nextDraft);
        });

        expect(result.current.displayCustomization.privacy.showGallery).toBe(false);
        expect(result.current.displayCustomization.customBlocks[0]?.body).toBe('قديم');
    });

    it('يزامن حذف/إضافة الكتل فوراً أثناء الاستوديو', () => {
        const customization = {
            ...defaultProfilePageCustomization(),
            customBlocks: [
                {
                    id: 'keep',
                    kind: 'text' as const,
                    title: 'نص',
                    body: 'يبقى',
                    order: 0,
                },
                {
                    id: 'gone',
                    kind: 'image' as const,
                    title: 'صورة',
                    order: 1,
                },
            ],
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: true,
                saveCustomization,
            }),
        );

        act(() => {
            result.current.handleSettingsDraftChange({
                ...customization,
                customBlocks: customization.customBlocks.filter((b) => b.id !== 'gone'),
            });
        });

        expect(result.current.displayCustomization.customBlocks.map((b) => b.id)).toEqual(['keep']);
    });

    it('يحفظ عبر handleSettingsSave', async () => {
        const customization = defaultProfilePageCustomization();
        const next = {
            ...customization,
            appearance: { ...customization.appearance, accentColor: 'emerald' as const },
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: true,
                saveCustomization,
            }),
        );

        await act(async () => {
            await result.current.handleSettingsSave(next);
        });

        expect(saveCustomization).toHaveBeenCalledWith(next, undefined);
        expect(result.current.displayCustomization.appearance.accentColor).toBe('emerald');
    });

    it('يمرّر silent إلى saveCustomization', async () => {
        const customization = defaultProfilePageCustomization();
        const next = {
            ...customization,
            appearance: { ...customization.appearance, accentColor: 'navy' as const },
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: true,
                saveCustomization,
            }),
        );

        await act(async () => {
            await result.current.handleSettingsSave(next, { silent: true });
        });

        expect(saveCustomization).toHaveBeenCalledWith(next, { silent: true });
    });
});
