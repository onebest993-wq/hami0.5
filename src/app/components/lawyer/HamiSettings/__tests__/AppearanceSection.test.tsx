import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppearanceSection } from '@/app/components/lawyer/HamiSettings/appearance/AppearanceSection';

const patchAppearance = vi.fn();
const patchPerformance = vi.fn();
const setBlockCustomizePanelOpen = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/appearance/useAppearanceSection', () => ({
    useAppearanceSection: () => ({
        appearance: {
            theme: 'gold',
            shape: 'rounded',
            fontSize: 16,
            fontPreset: 'medium',
            glassOpacity: 0.5,
            backgroundPatternOpacity: 0.3,
            homeContainerBorder: true,
            highContrast: false,
            reduceMotion: false,
            backgroundPreset: 'none',
        },
        performance: {
            litePerformance: 'auto',
            enableAnimations: true,
            prefetchScreens: true,
        },
        homeLayout: { dockVisible: true },
        wallpaperRef: { current: null },
        themesExpanded: false,
        setThemesExpanded: vi.fn(),
        wallpaperSrc: undefined,
        hasWallpaper: false,
        activeTheme: 'gold',
        activeThemeKey: 'gold',
        activeThemeToken: { name: 'ذهبي', primary: '#E6C673', bg: '#0A0F1C' },
        visibleThemeKeys: ['gold'],
        hiddenThemeCount: 19,
        selectTheme: vi.fn(),
        blockCustomize: {
            blocks: ['alerts', 'forum'],
            blockLabel: (id: string) => id,
            panelOpen: false,
            setPanelOpen: setBlockCustomizePanelOpen,
            selectedIds: [],
            selectedCount: 0,
            isAllSelected: false,
            toggleSelectAll: vi.fn(),
            toggleBlock: vi.fn(),
            isSelected: () => false,
            override: undefined,
            effective: {
                cardThemeKey: 'gold',
                patternThemeKey: 'gold',
                backgroundPreset: 'none',
                patternIntensity: 'medium',
                glassTransparency: 'medium',
                containerBorder: true,
                glassOpacity: 0.5,
                patternOpacity: 0.3,
                shapeKey: 'rounded',
            },
            hasCustomOverride: false,
            setCardTheme: vi.fn(),
            setPatternTheme: vi.fn(),
            setBackgroundPreset: vi.fn(),
            setPatternIntensity: vi.fn(),
            setGlassTransparency: vi.fn(),
            setContainerBorder: vi.fn(),
            setShape: vi.fn(),
            resetBlock: vi.fn(),
            appearance: {
                theme: 'gold',
                shape: 'rounded',
                glassOpacity: 0.5,
                backgroundPatternOpacity: 0.3,
                homeContainerBorder: true,
                backgroundPreset: 'none',
            },
        },
        beginWallpaperEdit: vi.fn(() => true),
        cancelWallpaperEdit: vi.fn(),
        applyWallpaperEdit: vi.fn(async () => true),
        editorDraft: null,
        editorBusy: false,
        removeWallpaper: vi.fn(),
        previewBaseColor: '#0A0F1C',
        patchAppearance,
        patchPerformance,
    }),
}));

describe('AppearanceSection', () => {
    beforeEach(() => vi.clearAllMocks());

    it('يعرض مفتاح تقليل الحركة داخل فصل الواجهة', () => {
        render(<AppearanceSection />);
        expect(screen.getByTestId('settings-toggle-appearance-reduceMotion')).toBeInTheDocument();
    });

    it('يعرض صفوف الخط والتباين والأداء الخفيف', () => {
        render(<AppearanceSection />);
        expect(screen.getByTestId('settings-font-preset-medium')).toBeInTheDocument();
        expect(screen.getByTestId('settings-toggle-appearance-highContrast')).toBeInTheDocument();
        expect(screen.getByTestId('settings-lite-auto')).toBeInTheDocument();
    });

    it('يُرقّع حجم الخط مع الـ preset معاً', () => {
        render(<AppearanceSection />);
        fireEvent.click(screen.getByTestId('settings-font-preset-large'));
        expect(patchAppearance).toHaveBeenCalledWith({ fontPreset: 'large', fontSize: 18 });
    });

    it('يُرقّع التباين العالي والأداء الخفيف', () => {
        render(<AppearanceSection />);
        fireEvent.click(screen.getByTestId('settings-toggle-appearance-highContrast'));
        expect(patchAppearance).toHaveBeenCalledWith({ highContrast: true });
        fireEvent.click(screen.getByTestId('settings-lite-on'));
        expect(patchPerformance).toHaveBeenCalledWith({ litePerformance: 'on' });
    });

    it('يفتح تخصيص القسم فوراً عند pointerDown', () => {
        render(<AppearanceSection />);
        const toggle = screen.getByTestId('appearance-block-customize-toggle');
        fireEvent.pointerDown(toggle);
        expect(setBlockCustomizePanelOpen).toHaveBeenCalledTimes(1);
        const arg = setBlockCustomizePanelOpen.mock.calls[0]?.[0];
        expect(typeof arg).toBe('function');
        expect(arg(false)).toBe(true);
    });

    it('لا يركّب صورة الخلفية حتى فتح الفصل', async () => {
        render(<AppearanceSection />);
        expect(screen.queryByTestId('settings-wallpaper-upload')).toBeNull();
        const wallpaper = screen.getByTestId('appearance-chapter-wallpaper');
        fireEvent.pointerDown(wallpaper);
        fireEvent.click(wallpaper);
        expect(
            await screen.findByTestId('settings-wallpaper-upload', {}, { timeout: 8_000 }),
        ).toBeInTheDocument();
    });
});
