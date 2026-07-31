import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ZoomableContainer } from '../ZoomableContainer';

function dispatchWheel(
    el: Element,
    init: { deltaY: number; ctrlKey?: boolean },
) {
    act(() => {
        el.dispatchEvent(
            new WheelEvent('wheel', {
                bubbles: true,
                cancelable: true,
                deltaY: init.deltaY,
                ctrlKey: init.ctrlKey ?? false,
            }),
        );
    });
}

describe('ZoomableContainer', () => {
    it('renders children at 1x with panning disabled and touch-action none (image mode)', () => {
        render(
            <ZoomableContainer wheelZoom="plain">
                <img alt="doc" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
            </ZoomableContainer>,
        );

        const container = screen.getByTestId('zoomable-container');
        expect(screen.getByAltText('doc')).toBeTruthy();
        expect(container.getAttribute('data-zoomed')).toBe('false');
        expect(container.getAttribute('data-scale')).toBe('1.00');
        expect(container.style.touchAction).toBe('none');
    });

    it('keeps native vertical scroll at 1x for scrollable content (pdf mode)', () => {
        render(
            <ZoomableContainer wheelZoom="modifier" nativeVerticalScroll>
                <div>pages</div>
            </ZoomableContainer>,
        );

        expect(screen.getByTestId('zoomable-container').style.touchAction).toBe('pan-y');
    });

    it('zooms in with plain wheel and clamps at the 3x ceiling', () => {
        render(
            <ZoomableContainer wheelZoom="plain">
                <div>doc</div>
            </ZoomableContainer>,
        );
        const container = screen.getByTestId('zoomable-container');

        dispatchWheel(container, { deltaY: -400 });
        expect(container.getAttribute('data-zoomed')).toBe('true');
        expect(Number(container.getAttribute('data-scale'))).toBeGreaterThan(1);

        for (let i = 0; i < 20; i += 1) dispatchWheel(container, { deltaY: -600 });
        expect(container.getAttribute('data-scale')).toBe('3.00');
    });

    it('zooms back out and clamps at the 1x floor (panning disabled again)', () => {
        render(
            <ZoomableContainer wheelZoom="plain">
                <div>doc</div>
            </ZoomableContainer>,
        );
        const container = screen.getByTestId('zoomable-container');

        dispatchWheel(container, { deltaY: -600 });
        expect(container.getAttribute('data-zoomed')).toBe('true');

        for (let i = 0; i < 20; i += 1) dispatchWheel(container, { deltaY: 600 });
        expect(container.getAttribute('data-scale')).toBe('1.00');
        expect(container.getAttribute('data-zoomed')).toBe('false');
    });

    it('renders floating zoom controls that zoom in, out, and reset', () => {
        render(
            <ZoomableContainer wheelZoom="modifier" nativeVerticalScroll showControls>
                <div>pages</div>
            </ZoomableContainer>,
        );
        const container = screen.getByTestId('zoomable-container');
        const zoomIn = screen.getByRole('button', { name: 'تكبير' });
        const zoomOut = screen.getByRole('button', { name: 'تصغير' });
        const reset = screen.getByRole('button', { name: 'إعادة الضبط إلى الحجم الأصلي' });

        // عند 1x لا معنى للتصغير أو إعادة الضبط
        expect((zoomOut as HTMLButtonElement).disabled).toBe(true);
        expect((reset as HTMLButtonElement).disabled).toBe(true);

        act(() => zoomIn.click());
        expect(container.getAttribute('data-zoomed')).toBe('true');
        expect(Number(container.getAttribute('data-scale'))).toBeCloseTo(1.25, 2);

        act(() => zoomOut.click());
        expect(container.getAttribute('data-scale')).toBe('1.00');

        act(() => zoomIn.click());
        act(() => zoomIn.click());
        act(() => reset.click());
        expect(container.getAttribute('data-zoomed')).toBe('false');
        expect(container.getAttribute('data-scale')).toBe('1.00');
    });

    it('hides zoom controls by default', () => {
        render(
            <ZoomableContainer wheelZoom="plain">
                <div>doc</div>
            </ZoomableContainer>,
        );
        expect(screen.queryByTestId('zoomable-controls')).toBeNull();
    });

    it('ignores plain wheel in modifier mode but zooms with ctrl+wheel (pdf pages keep scrolling)', () => {
        render(
            <ZoomableContainer wheelZoom="modifier" nativeVerticalScroll>
                <div>pages</div>
            </ZoomableContainer>,
        );
        const container = screen.getByTestId('zoomable-container');

        dispatchWheel(container, { deltaY: -400 });
        expect(container.getAttribute('data-zoomed')).toBe('false');

        dispatchWheel(container, { deltaY: -400, ctrlKey: true });
        expect(container.getAttribute('data-zoomed')).toBe('true');
        // عند التقريب يُقفل التمرير الأصلي لصالح السحب الحر
        expect(container.style.touchAction).toBe('none');
    });
});
