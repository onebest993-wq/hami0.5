import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileHeroSection } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileHeroSection';

vi.mock('@/app/utils/lazyComponentsIntent', () => ({
    prefetchProfileSettingsSheet: vi.fn(),
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileFloatingPortrait', () => ({
    ProfileFloatingPortrait: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="floating-portrait">{children}</div>
    ),
}));

describe('ProfileHeroSection avatar fallback', () => {
    it('يظهر الحرف الأول عند فشل رابط الصورة', () => {
        render(
            <ProfileHeroSection
                isEditing={false}
                readOnly
                draft={null}
                setDraft={vi.fn()}
                header={{
                    name: 'سعد',
                    title: '',
                    coverImage: '',
                    profileImage: 'https://cdn.example/broken.jpg',
                }}
                initials="س"
                displayNamePublic="سعد"
                syndicateIdPublic=""
                showSyndicate={false}
                metaItems={[]}
                uploading={null}
                avatarRef={{ current: null }}
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
