import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { AppearanceBlockCustomizePanel } from '@/app/components/lawyer/HamiSettings/appearance/AppearanceBlockCustomizePanel';
import type { AppearanceBlockCustomize } from '@/app/components/lawyer/HamiSettings/appearance/useAppearanceBlockCustomize';

function SelectionHarness() {
    const [selected, setSelected] = useState<Set<string>>(() => new Set());
    const customize = {
        blocks: ['alerts', 'forum'] as const,
        blockLabel: (id: string) => id,
        selectedCount: selected.size,
        isAllSelected: selected.size === 2,
        toggleSelectAll: () => {
            setSelected((prev) => (prev.size === 2 ? new Set() : new Set(['alerts', 'forum'])));
        },
        toggleBlock: (id: string) => {
            setSelected((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        },
        isSelected: (id: string) => selected.has(id),
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
    } as unknown as AppearanceBlockCustomize;

    return <AppearanceBlockCustomizePanel customize={customize} themePrimary="#E6C673" />;
}

describe('AppearanceBlockCustomizePanel selection', () => {
    it('يبقي القسم محدداً بعد pointerdown + click', () => {
        render(<SelectionHarness />);
        const forum = screen.getByTestId('appearance-block-pick-forum');
        fireEvent.pointerDown(forum);
        fireEvent.click(forum);
        expect(forum).toHaveAttribute('aria-selected', 'true');
    });

    it('صف إطار الحاويات يبدّل عند الضغط على النص لا المفتاح فقط', () => {
        const setContainerBorder = vi.fn();
        const customize = {
            blocks: ['alerts'] as const,
            blockLabel: (id: string) => id,
            selectedCount: 1,
            isAllSelected: false,
            toggleSelectAll: vi.fn(),
            toggleBlock: vi.fn(),
            isSelected: () => true,
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
            setContainerBorder,
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
        } as unknown as AppearanceBlockCustomize;

        render(<AppearanceBlockCustomizePanel customize={customize} themePrimary="#E6C673" />);
        fireEvent.pointerDown(screen.getByTestId('appearance-block-container-border-row'));
        expect(setContainerBorder).toHaveBeenCalledWith(false);

        setContainerBorder.mockClear();
        fireEvent.click(screen.getByTestId('settings-toggle-appearance-block-containerBorder'));
        expect(setContainerBorder).toHaveBeenCalledWith(false);
    });
});
