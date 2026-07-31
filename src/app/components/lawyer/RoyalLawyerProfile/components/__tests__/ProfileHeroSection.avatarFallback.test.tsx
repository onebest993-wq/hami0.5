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
    it('يعرض الحرف الأول عند فشل رابط الصورة', () => {
        render(
            <ProfileHeroSection
                isEditing={false}
                readOnly
                draft={null}
                setDraft={vi.fn()}
                header={{
                    name: 'سارة',
                    title: '',
                    coverImage: '',
                    profileImage: 'https://cdn.example/broken.jpg',
                }}
                initials="س"
                displayNamePublic="سارة"
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
        expect(screen.getByText('س')).toBeTruthy();
    });
});
