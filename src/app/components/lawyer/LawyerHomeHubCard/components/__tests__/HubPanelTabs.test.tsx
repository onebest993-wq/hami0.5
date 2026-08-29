import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { prefetchHomeHubPinsPanel } from '../../homeHub/homeHubPanelPrefetch';
import { HubPanelTabs } from '../HubPanelTabs';

vi.mock('../../homeHub/homeHubPanelPrefetch', () => ({
    prefetchHomeHubPinsPanel: vi.fn(),
}));

describe('HubPanelTabs', () => {
    beforeEach(() => {
        vi.mocked(prefetchHomeHubPinsPanel).mockClear();
    });
    it('ينقل التركيز إلى التبويب التالي عند السهم', async () => {
        const onChange = vi.fn();
        render(
            <HubPanelTabs hubPanel="alerts" onChange={onChange} alertsCount={1} pinsCount={2} />,
        );

        const alerts = screen.getByTestId('home-hub-tab-alerts');
        const pins = screen.getByTestId('home-hub-tab-pins');
        alerts.focus();
        expect(document.activeElement).toBe(alerts);

        fireEvent.keyDown(alerts, { key: 'ArrowLeft' });
        expect(onChange).toHaveBeenCalledWith('pins');
        await waitFor(() => {
            expect(document.activeElement).toBe(pins);
        });
    });

    it('Home يركّز التنبيهات وEnd يركّز التثبيت', async () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <HubPanelTabs hubPanel="pins" onChange={onChange} alertsCount={1} pinsCount={2} />,
        );

        const alerts = screen.getByTestId('home-hub-tab-alerts');
        const pins = screen.getByTestId('home-hub-tab-pins');
        pins.focus();

        fireEvent.keyDown(pins, { key: 'Home' });
        expect(onChange).toHaveBeenCalledWith('alerts');
        rerender(
            <HubPanelTabs hubPanel="alerts" onChange={onChange} alertsCount={1} pinsCount={2} />,
        );
        await waitFor(() => {
            expect(document.activeElement).toBe(alerts);
        });

        fireEvent.keyDown(screen.getByTestId('home-hub-tab-alerts'), { key: 'End' });
        expect(onChange).toHaveBeenCalledWith('pins');
        await waitFor(() => {
            expect(document.activeElement).toBe(screen.getByTestId('home-hub-tab-pins'));
        });
    });

    it('ArrowRight يُبدّل أيضاً بين التبويبين', () => {
        const onChange = vi.fn();
        render(
            <HubPanelTabs hubPanel="alerts" onChange={onChange} alertsCount={0} pinsCount={0} />,
        );
        fireEvent.keyDown(screen.getByTestId('home-hub-tab-alerts'), { key: 'ArrowRight' });
        expect(onChange).toHaveBeenCalledWith('pins');
    });

    it('النقر يختار التثبيت ولا يعيد النداء على التبويب النشط', () => {
        const onChange = vi.fn();
        render(
            <HubPanelTabs hubPanel="alerts" onChange={onChange} alertsCount={0} pinsCount={0} />,
        );
        fireEvent.click(screen.getByTestId('home-hub-tab-alerts'));
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('home-hub-tab-pins'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('pins');
    });

    it('شارات العدّ في التسمية والتخطيط المحجوز أثناء التسوية', () => {
        const { rerender } = render(
            <HubPanelTabs hubPanel="alerts" onChange={vi.fn()} alertsCount={4} pinsCount={12} />,
        );
        const alerts = screen.getByTestId('home-hub-tab-alerts');
        const pins = screen.getByTestId('home-hub-tab-pins');
        expect(alerts).toHaveAttribute('aria-label', 'التنبيهات، 4');
        expect(pins).toHaveAttribute('aria-label', 'التثبيت، 9+');
        expect(alerts).toHaveAttribute('aria-selected', 'true');
        expect(alerts).toHaveAttribute('tabIndex', '0');
        expect(pins).toHaveAttribute('aria-selected', 'false');
        expect(pins).toHaveAttribute('tabIndex', '-1');
        expect(alerts.querySelector('.hami-hub-tab__pill')).not.toBeNull();
        expect(pins.querySelector('.hami-hub-tab__pill')).toBeNull();
        expect(alerts.querySelector('.hami-hub-tab__badge--reserved')).toBeNull();

        rerender(
            <HubPanelTabs
                hubPanel="alerts"
                onChange={vi.fn()}
                alertsCount={4}
                pinsCount={12}
                bootSettling
            />,
        );
        expect(screen.getByTestId('home-hub-tab-alerts')).toHaveAttribute('aria-label', 'التنبيهات');
        expect(screen.getByTestId('home-hub-tab-pins')).toHaveAttribute('aria-label', 'التثبيت');
        expect(screen.getByTestId('home-hub-tab-alerts').querySelector('.hami-hub-tab__badge--reserved')).not.toBeNull();
    });

    it('ارتباط التبويب باللوحة عبر aria-controls', () => {
        render(
            <HubPanelTabs hubPanel="alerts" onChange={vi.fn()} alertsCount={0} pinsCount={0} />,
        );
        expect(screen.getByRole('tablist', { name: 'تبويبات البطاقة' })).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-tab-alerts')).toHaveAttribute(
            'aria-controls',
            'home-hub-panel-alerts',
        );
        expect(screen.getByTestId('home-hub-tab-pins')).toHaveAttribute(
            'aria-controls',
            'home-hub-panel-pins',
        );
    });

    it('يلمس تبويب التثبيت يسخّن المقطع قبل النقرة', () => {
        render(
            <HubPanelTabs
                hubPanel="alerts"
                onChange={vi.fn()}
                alertsCount={0}
                pinsCount={1}
            />,
        );
        fireEvent.pointerDown(screen.getByTestId('home-hub-tab-alerts'));
        expect(prefetchHomeHubPinsPanel).not.toHaveBeenCalled();
        fireEvent.pointerDown(screen.getByTestId('home-hub-tab-pins'));
        expect(prefetchHomeHubPinsPanel).toHaveBeenCalledTimes(1);
    });
});
