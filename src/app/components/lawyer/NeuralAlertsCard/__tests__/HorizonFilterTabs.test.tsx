import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
    HorizonFilterTabs,
    HOME_HUB_ALERT_HORIZONS,
} from '@/app/components/lawyer/NeuralAlertsCard/HorizonFilterTabs';

describe('HorizonFilterTabs', () => {
    it('السهم ينقل التركيز إلى التبويب التالي', async () => {
        const onChange = vi.fn();
        render(
            <HorizonFilterTabs
                counts={{ urgent: 2, near: 0, upcoming: 1 }}
                activeFilter="urgent"
                onChange={onChange}
                horizons={HOME_HUB_ALERT_HORIZONS}
                compact
            />,
        );

        const urgent = screen.getByRole('tab', { name: /عاجل/ });
        const upcoming = screen.getByRole('tab', { name: /قادم/ });
        urgent.focus();
        fireEvent.keyDown(urgent, { key: 'ArrowLeft' });
        expect(onChange).toHaveBeenCalledWith('upcoming');
        await waitFor(() => {
            expect(document.activeElement).toBe(upcoming);
        });
    });

    it('Home وEnd يركّزان أول وآخر أفق', async () => {
        const onChange = vi.fn();
        render(
            <HorizonFilterTabs
                counts={{ urgent: 1, near: 0, upcoming: 1 }}
                activeFilter="upcoming"
                onChange={onChange}
                horizons={HOME_HUB_ALERT_HORIZONS}
                compact
            />,
        );

        const urgent = screen.getByRole('tab', { name: /عاجل/ });
        const upcoming = screen.getByRole('tab', { name: /قادم/ });
        upcoming.focus();
        fireEvent.keyDown(upcoming, { key: 'Home' });
        expect(onChange).toHaveBeenCalledWith('urgent');
        await waitFor(() => {
            expect(document.activeElement).toBe(urgent);
        });
        fireEvent.keyDown(urgent, { key: 'End' });
        expect(onChange).toHaveBeenCalledWith('upcoming');
    });

    it('لا يفرض معرفات الهاب إلا عند تمرير feedId و idPrefix', () => {
        const { rerender } = render(
            <HorizonFilterTabs
                counts={{ urgent: 1, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onChange={vi.fn()}
                horizons={HOME_HUB_ALERT_HORIZONS}
                compact
            />,
        );

        const urgent = screen.getByRole('tab', { name: /عاجل/ });
        expect(urgent).toHaveAttribute('id', 'horizon-urgent');
        expect(urgent).not.toHaveAttribute('aria-controls');

        rerender(
            <HorizonFilterTabs
                counts={{ urgent: 1, near: 0, upcoming: 0 }}
                activeFilter="urgent"
                onChange={vi.fn()}
                horizons={HOME_HUB_ALERT_HORIZONS}
                compact
                feedId="home-hub-alerts-feed"
                idPrefix="home-hub-horizon"
            />,
        );

        const hubUrgent = screen.getByRole('tab', { name: /عاجل/ });
        expect(hubUrgent).toHaveAttribute('id', 'home-hub-horizon-urgent');
        expect(hubUrgent).toHaveAttribute('aria-controls', 'home-hub-alerts-feed');
    });
});
