import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubMoreOverlayShell } from '../HomeHubMoreOverlayShell';
import { resetHomeHubOverlayBackStackForTests } from '../../homeHub/homeHubOverlayBackStack';

vi.mock('@/app/utils/bodyScrollLock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/bodyScrollLock')>();
    return {
        ...actual,
        useBodyScrollLock: vi.fn(),
    };
});

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: () => () => undefined,
}));

vi.mock('@/app/runtime/overlaySnapClose', () => ({
    executeOverlaySnapClose: ({ commit }: { commit?: () => void }) => {
        commit?.();
    },
}));

function renderShell(onClose = vi.fn()) {
    render(
        <HomeHubMoreOverlayShell
            open
            overlayId="home-hub-urgent-more"
            onClose={onClose}
            testId="home-hub-urgent-more-overlay"
            panelTestId="home-hub-urgent-more-panel"
            ariaLabel="تنبيهات عاجلة — 1 عنصر"
            backdropAriaLabel="إغلاق قائمة التنبيهات العاجلة"
            title="عاجل"
            subtitle="اليوم وغداً · 1 عنصر"
            count={1}
        >
            <button type="button">عنصر داخل الورقة</button>
        </HomeHubMoreOverlayShell>,
    );
    return onClose;
}

describe('HomeHubMoreOverlayShell', () => {
    beforeEach(() => {
        resetHomeHubOverlayBackStackForTests();
    });

    afterEach(() => {
        resetHomeHubOverlayBackStackForTests();
    });

    it('لا يُرسم عند الإغلاق', () => {
        render(
            <HomeHubMoreOverlayShell
                open={false}
                overlayId="home-hub-urgent-more"
                onClose={vi.fn()}
                testId="home-hub-urgent-more-overlay"
                panelTestId="home-hub-urgent-more-panel"
                ariaLabel="عاجل"
                backdropAriaLabel="إغلاق"
                title="عاجل"
                subtitle=""
                count={0}
            >
                <span>مخفي</span>
            </HomeHubMoreOverlayShell>,
        );
        expect(screen.queryByTestId('home-hub-urgent-more-overlay')).not.toBeInTheDocument();
    });

    it('يربط aria-controls عبر id اللوحة وزر الإغلاق', () => {
        const onClose = renderShell();
        const overlay = screen.getByTestId('home-hub-urgent-more-overlay');
        expect(overlay).toHaveAttribute('role', 'dialog');
        expect(overlay).toHaveAttribute('aria-modal', 'true');
        expect(overlay).toHaveAttribute('data-hami-overlay-safe', '1');
        expect(screen.getByTestId('home-hub-urgent-more-panel')).toHaveAttribute(
            'id',
            'home-hub-urgent-more-panel',
        );
        const close = screen.getByTestId('home-hub-urgent-more-overlay-close');
        expect(close).toHaveAttribute('aria-label', 'إغلاق');
        fireEvent.click(close);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('الخلفية تغلق الورقة', () => {
        const onClose = renderShell();
        fireEvent.click(screen.getByRole('button', { name: 'إغلاق قائمة التنبيهات العاجلة' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Tab يدور التركيز داخل الورقة', () => {
        renderShell();
        const close = screen.getByTestId('home-hub-urgent-more-overlay-close');
        const inner = screen.getByRole('button', { name: 'عنصر داخل الورقة' });
        const sheet = screen.getByTestId('home-hub-urgent-more-panel');

        inner.focus();
        expect(document.activeElement).toBe(inner);
        fireEvent.keyDown(sheet, { key: 'Tab' });
        expect(document.activeElement).toBe(close);

        close.focus();
        fireEvent.keyDown(sheet, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(inner);
    });

    it('Escape يغلق مباشرة بعد التركيب', () => {
        const onClose = renderShell();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
