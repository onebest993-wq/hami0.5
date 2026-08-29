import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ProfileHeroIdentityZone } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileHeroIdentityZone';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import { LAWYER_PROFILE_NAME_INPUT_ID } from '@/app/components/lawyer/RoyalLawyerProfile/profileHeroDomIds';

function IdentityHarness({
    isEditing,
    readOnly = false,
}: {
    isEditing: boolean;
    readOnly?: boolean;
}) {
    const [draft, setDraft] = useState<EditDraft | null>(
        isEditing
            ? {
                  header: { name: 'سعد', title: '', coverImage: '', profileImage: '' },
                  actions: [],
                  gallery: [],
              }
            : null,
    );
    return (
        <ProfileHeroIdentityZone
            isEditing={isEditing}
            readOnly={readOnly}
            draft={draft}
            setDraft={setDraft}
            displayNamePublic="سعد العلوي"
            syndicateIdPublic="12345"
            showSyndicate
        />
    );
}

describe('ProfileHeroIdentityZone', () => {
    it('العرض: اسم عام وشارة النقابة بلا حقل', () => {
        render(<IdentityHarness isEditing={false} />);
        expect(screen.getByText('سعد العلوي')).toBeTruthy();
        expect(screen.getByText(/نقابة المحامين/)).toBeTruthy();
        expect(screen.queryByTestId(LAWYER_PROFILE_NAME_INPUT_ID)).toBeNull();
    });

    it('التعديل: يحدّث المسودة من الحقل', () => {
        render(<IdentityHarness isEditing />);
        const input = screen.getByTestId(LAWYER_PROFILE_NAME_INPUT_ID) as HTMLInputElement;
        expect(input.value).toBe('سعد');
        fireEvent.change(input, { target: { value: 'سعد محمد' } });
        expect(input.value).toBe('سعد محمد');
        expect(screen.getByTestId('lawyer-profile-name-correction-note').textContent).toMatch(/مرة واحدة/);
    });

    it('readOnly أثناء التعديل لا يفتح الحقل', () => {
        render(<IdentityHarness isEditing readOnly />);
        expect(screen.queryByTestId(LAWYER_PROFILE_NAME_INPUT_ID)).toBeNull();
        expect(screen.getByText('سعد العلوي')).toBeTruthy();
    });
});
