import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { LawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import { AppearanceSection } from '@/app/components/lawyer/HamiSettings/appearance/AppearanceSection';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        ensureBootShellReady: vi.fn(() => Promise.resolve()),
        ensurePersistedReady: vi.fn(() => Promise.resolve()),
        getItem: vi.fn(() => Promise.resolve(null)),
        getItemSync: vi.fn(() => null),
        listKeysSync: vi.fn(() => []),
    },
}));

describe('AppearanceSection remount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يُعاد تركيبه دون crash مع LawyerSettingsProvider', async () => {
        const { unmount } = render(
            <LawyerSettingsProvider>
                <AppearanceSection />
            </LawyerSettingsProvider>,
        );

        await waitFor(() => {
            expect(screen.getByTestId('settings-section-appearance')).toBeInTheDocument();
        });

        await act(async () => {
            unmount();
        });

        await act(async () => {
            render(
                <LawyerSettingsProvider>
                    <AppearanceSection />
                </LawyerSettingsProvider>,
            );
        });

        expect(screen.getByTestId('settings-section-appearance')).toBeInTheDocument();
        const wallpaper = screen.getByTestId('appearance-chapter-wallpaper');
        fireEvent.pointerDown(wallpaper);
        fireEvent.click(wallpaper);
        expect(
            await screen.findByTestId('settings-wallpaper-upload', {}, { timeout: 8_000 }),
        ).toBeInTheDocument();
    });
});
