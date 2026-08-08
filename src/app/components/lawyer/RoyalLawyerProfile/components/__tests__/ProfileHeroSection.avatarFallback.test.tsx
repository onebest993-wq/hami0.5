import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileHeroSection } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileHeroSection';

vi.mock('@/app/runtime/profileSettingsSheetLoader', () => ({
    prefetchProfileSettingsSheet: vi.fn(),
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileFloatingPortrait', () => ({
    ProfileFloatingPortrait: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="floating-portrait">{children}</div>
    ),
}));

vi.mock('@/app/components/shared/MoroccanGlassOverlay', () => ({
    MoroccanGlassFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ProfileHeroSection avatar fallback', () => {
    it('┘è╪╣╪▒╪╢ ╪د┘╪ص╪▒┘ ╪د┘╪ث┘ê┘ ╪╣┘╪» ┘╪┤┘ ╪▒╪د╪ذ╪╖ ╪د┘╪╡┘ê╪▒╪ر', () => {
        render(
            <ProfileHeroSection
                isEditing={false}
                readOnly
                draft={null}
                setDraft={vi.fn()}
                header={{
                    name: '╪│╪د╪▒╪ر',
                    title: '',
                    coverImage: '',
                    profileImage: 'https://cdn.example/broken.jpg',
                }}
                initials="╪│"
                displayNamePublic="╪│╪د╪▒╪ر"
                syndicateIdPublic=""
                showSyndicate={false}
                metaItems={[]}
                uploading={null}
                avatarRef={{ current: null }}
                ornatePattern={false}
                forumFollow={null}
                startEdit={vi.fn()}
                openSettings={vi.fn()}
            />,
        );

        const img = document.querySelector('img');
        expect(img).toBeTruthy();
        fireEvent.error(img!);
        expect(screen.getByText('╪│')).toBeTruthy();
    });
});
