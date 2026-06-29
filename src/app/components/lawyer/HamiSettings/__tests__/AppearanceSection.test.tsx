import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppearanceSection } from '@/app/components/lawyer/HamiSettings/appearance/AppearanceSection';

const patchAppearance = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/appearance/useAppearanceSection', () => ({
    useAppearanceSection: () => ({
        appearance: {
            theme: 'gold',
            shape: 'rounded',
            fontSize: 16,
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
        patternsExpanded: false,
        setPatternsExpanded: vi.fn(),
        wallpaperSrc: undefined,
        hasWallpaper: false,
        activePreset: 'none',
        activeTheme: 'gold',
        themeToken: { name: 'ذهبي', primary: '#E6C673', bg: '#0A0F1C' },
        previewBaseColor: '#0A0F1C',
        previewAccent: '#E6C673',
        patternControlsDisabled: true,
        visibleThemeKeys: ['gold'],
        hiddenThemeCount: 19,
        visiblePresets: [{ id: 'none', label: 'بدون' }],
        hiddenPatternCount: 0,
        selectTheme: vi.fn(),
        selectBackgroundPreset: vi.fn(),
        selectShape: vi.fn(),
        uploadWallpaper: vi.fn(),
        removeWallpaper: vi.fn(),
        toggleDockVisible: vi.fn(),
        patchAppearance,
        patchPerformance: vi.fn(),
    }),
}));

vi.mock('@/app/components/lawyer/HamiSettings/appearance/AppearanceHomeLayoutCard', () => ({
    AppearanceHomeLayoutCard: ({ onEnterHomeLayoutEdit }: { onEnterHomeLayoutEdit?: () => void }) => (
        <button type="button" data-testid="settings-enter-home-layout-edit" onClick={onEnterHomeLayoutEdit}>
            تخصيص الواجهة
        </button>
    ),
}));

describe('AppearanceSection', () => {
    beforeEach(() => vi.clearAllMocks());

    it('يعرض عنوان تخصيص المنظر', () => {
        render(<AppearanceSection />);
        expect(screen.getByText('تخصيص المنظر')).toBeInTheDocument();
    });

    it('يمرّر onEnterHomeLayoutEdit لبطاقة التخطيط', () => {
        const onEnter = vi.fn();
        render(<AppearanceSection onEnterHomeLayoutEdit={onEnter} />);
        fireEvent.click(screen.getByTestId('settings-enter-home-layout-edit'));
        expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('يعرض مفتاح تقليل الحركة المربوط', () => {
        render(<AppearanceSection />);
        const toggle = screen.getByTestId('settings-toggle-appearance-reduceMotion');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(toggle);
        expect(patchAppearance).toHaveBeenCalledWith({ reduceMotion: true });
    });
});
