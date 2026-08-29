import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SettingsSectionRouter } from '@/app/components/lawyer/HamiSettings/SettingsSectionRouter';

vi.mock('@/app/components/lawyer/HamiSettings/appearance/AppearanceSection', () => ({
    AppearanceSection: () => <div data-testid="settings-section-appearance">appearance</div>,
}));

vi.mock('@/app/components/lawyer/HamiSettings/security/SecuritySection', () => ({
    SecuritySection: () => <div data-testid="settings-section-security">security</div>,
}));

vi.mock('@/app/components/lawyer/HamiSettings/data/DataSection', () => ({
    DataSection: () => <div data-testid="settings-section-data">data</div>,
}));

vi.mock('@/app/components/lawyer/HamiSettings/account/AccountSection', () => ({
    AccountSection: () => <div data-testid="settings-section-account">account</div>,
}));

describe('SettingsSectionRouter keepAlive content', () => {
    it('يبقي محتوى القسم النشط حتى عندما open=false (قشرة keepAlive)', async () => {
        render(
            <SettingsSectionRouter
                activeSection="account"
                onClose={() => undefined}
                open={false}
                accountProps={{}}
            />,
        );

        const account = await screen.findByTestId('settings-section-account');
        expect(account).toBeInTheDocument();
        expect(account).toBeVisible();
    });

    it('يعرض المنظر عند open=true', async () => {
        render(
            <SettingsSectionRouter
                activeSection="appearance"
                onClose={() => undefined}
                open
                accountProps={{}}
            />,
        );

        const appearance = await screen.findByTestId('settings-section-appearance');
        expect(appearance).toBeInTheDocument();
    });
});
