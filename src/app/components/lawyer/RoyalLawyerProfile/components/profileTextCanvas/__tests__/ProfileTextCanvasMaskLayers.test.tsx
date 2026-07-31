import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ProfileTextCanvasMaskLayers } from '../ProfileTextCanvasMaskLayers';

describe('ProfileTextCanvasMaskLayers reveal tap', () => {
    it('يكشف عند pointerdown ويملك هدف لمس كامل الحجم', () => {
        const onTapReveal = vi.fn();
        const leafRefs = { current: [] as (HTMLSpanElement | null)[] };

        const { getByTestId } = render(
            <div style={{ position: 'relative', width: 200, height: 120 }}>
                <ProfileTextCanvasMaskLayers
                    interaction="tapReveal"
                    canvas={{ enabled: true, interaction: 'tapReveal' }}
                    canInteract
                    showMaskLayers
                    hintText="لمسة للكشف"
                    showHint
                    leafRefs={leafRefs}
                    onTapReveal={onTapReveal}
                    onPetalPointerDown={vi.fn()}
                    onPetalPointerMove={vi.fn()}
                    onPetalPointerEnd={vi.fn()}
                    onMistCleared={vi.fn()}
                />
            </div>,
        );

        const tap = getByTestId('profile-text-reveal-tap');
        expect(tap.style.position).toBe('absolute');
        expect(tap.style.inset).toMatch(/^0(px)?$/);
        expect(tap.style.zIndex).toBe('14');

        fireEvent.pointerDown(tap, { button: 0 });
        expect(onTapReveal).toHaveBeenCalledTimes(1);
    });

    it('لا يركّب زر الكشف عندما canInteract=false رغم ظهور القناع', () => {
        const leafRefs = { current: [] as (HTMLSpanElement | null)[] };
        const { queryByTestId } = render(
            <ProfileTextCanvasMaskLayers
                interaction="tapReveal"
                canvas={{ enabled: true, interaction: 'tapReveal' }}
                canInteract={false}
                showMaskLayers
                hintText="لمسة للكشف"
                showHint={false}
                leafRefs={leafRefs}
                onTapReveal={vi.fn()}
                onPetalPointerDown={vi.fn()}
                onPetalPointerMove={vi.fn()}
                onPetalPointerEnd={vi.fn()}
                onMistCleared={vi.fn()}
            />,
        );
        expect(queryByTestId('profile-text-reveal-tap')).toBeNull();
    });
});
