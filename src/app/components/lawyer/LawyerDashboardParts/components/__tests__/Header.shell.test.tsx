import { render, screen } from '@testing-library/react';
import React from 'react';
import { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';

describe('Header shell column', () => {
    it('يحصر شريط الأدوات داخل عمود اللوحة', () => {
        render(
            <Header
                shouldShow
                unreadCount={0}
                onSearchClick={() => undefined}
                onNotificationsClick={() => undefined}
                onSettingsClick={() => undefined}
            />,
        );
        const header = document.querySelector('.hami-lawyer-header');
        expect(header).not.toBeNull();
        expect(header?.querySelector(':scope > .hami-shell-container')).not.toBeNull();
        expect(
            header?.querySelector('.hami-shell-container [data-testid="header-toolbar-nav"]'),
        ).toBe(screen.getByTestId('header-toolbar-nav'));
    });
});
