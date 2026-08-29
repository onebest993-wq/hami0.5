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

describe('ProfileHeroSection edit click', () => {
    it('لا يبدأ التعديل من pointerdown حتى يبقى الزر تحت الإصبع', () => {
        const startEdit = vi.fn();
        render(
            <ProfileHeroSection
                isEditing={false}
                readOnly={false}
                draft={null}
                setDraft={vi.fn()}
                header={{ name: 'سعد', title: '', coverImage: '', profileImage: '' }}
                initials="س"
                displayNamePublic="سعد"
                syndicateIdPublic=""
                showSyndicate={false}
                metaItems={[]}
                uploading={null}
                avatarRef={{ current: null }}
                startEdit={startEdit}
                openSettings={vi.fn()}
            />,
        );

        const edit = screen.getByTestId('lawyer-profile-edit');
        fireEvent.pointerDown(edit, { button: 0 });
        expect(startEdit).not.toHaveBeenCalled();
        fireEvent.click(edit);
        expect(startEdit).toHaveBeenCalledTimes(1);
    });

    it('غطاء الفتح: pointerdown يصفّر التعديل قبل زوال الطبقة', () => {
        const startEdit = vi.fn();
        render(
            <ProfileHeroSection
                isEditing={false}
                readOnly={false}
                draft={null}
                setDraft={vi.fn()}
                header={{ name: 'سعد', title: '', coverImage: '', profileImage: '' }}
                initials="س"
                displayNamePublic="سعد"
                syndicateIdPublic=""
                showSyndicate={false}
                metaItems={[]}
                uploading={null}
                avatarRef={{ current: null }}
                startEdit={startEdit}
                openSettings={vi.fn()}
                armEditOnPointerDown
            />,
        );

        fireEvent.pointerDown(screen.getByTestId('lawyer-profile-edit'), { button: 0 });
        expect(startEdit).toHaveBeenCalledTimes(1);
    });

    it('الشجرة الحية: استوديو الصفحة لا يفتح من pointerdown', () => {
        const openSettings = vi.fn();
        render(
            <ProfileHeroSection
                isEditing={false}
                readOnly={false}
                draft={null}
                setDraft={vi.fn()}
                header={{ name: 'سعد', title: '', coverImage: '', profileImage: '' }}
                initials="س"
                displayNamePublic="سعد"
                syndicateIdPublic=""
                showSyndicate={false}
                metaItems={[]}
                uploading={null}
                avatarRef={{ current: null }}
                startEdit={vi.fn()}
                openSettings={openSettings}
            />,
        );

        fireEvent.pointerDown(screen.getByTestId('lawyer-profile-settings'), { button: 0 });
        expect(openSettings).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('lawyer-profile-settings'));
        expect(openSettings).toHaveBeenCalledTimes(1);
    });
});
