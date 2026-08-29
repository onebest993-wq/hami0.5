import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ProfileContactSection } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContactSection';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileAction } from '@/app/services/lawyer-cloud';

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContactChannel', () => ({
    ProfileContactChannel: ({ action }: { action: ProfileAction }) => (
        <div data-testid={`contact-channel-${action.id}`}>{action.label}</div>
    ),
}));

function ContactHarness({
    isEditing,
    readOnly = false,
    initialActions = [] as ProfileAction[],
}: {
    isEditing: boolean;
    readOnly?: boolean;
    initialActions?: ProfileAction[];
}) {
    const [draft, setDraft] = useState<EditDraft | null>(
        isEditing
            ? {
                  header: { name: 'احمد', title: '', coverImage: '', profileImage: '' },
                  actions: initialActions,
                  gallery: [],
              }
            : null,
    );
    const addContactChannel = vi.fn((type: ProfileAction['type']) => {
        setDraft((prev) =>
            prev
                ? {
                      ...prev,
                      actions: [
                          ...prev.actions,
                          { id: `new-${type}`, type, label: type, value: '' },
                      ],
                  }
                : prev,
        );
    });
    const actions = isEditing && draft ? draft.actions : initialActions;
    return (
        <>
            <ProfileContactSection
                isEditing={isEditing}
                readOnly={readOnly}
                draft={draft}
                setDraft={setDraft}
                actions={actions}
                visibleActions={initialActions}
                addContactChannel={addContactChannel}
            />
            <span data-testid="add-spy" data-count={String(addContactChannel.mock.calls.length)} />
        </>
    );
}

describe('ProfileContactSection', () => {
    it('المالك خارج التعديل بلا قنوات: يوجّه إلى تعديل', () => {
        render(<ContactHarness isEditing={false} />);
        expect(screen.getByRole('heading', { name: 'قنوات التواصل' })).toBeTruthy();
        expect(screen.getByText('أضف قنوات التواصل من «تعديل».')).toBeTruthy();
        expect(screen.queryByText('هاتف')).toBeNull();
    });

    it('أثناء التعديل الفارغ: أزرار الأنواع ورسالة الاختيار', () => {
        render(<ContactHarness isEditing />);
        expect(screen.getByText('اختر نوع القناة أعلاه لإضافتها.')).toBeTruthy();
        const call = screen.getByRole('button', { name: /هاتف/ });
        expect(call.getAttribute('data-testid')).toBe('profile-contact-add-call');
        expect(call.className).toMatch(/min-h-\[44px\]/);
        fireEvent.click(call);
        expect(screen.queryByText('اختر نوع القناة أعلاه لإضافتها.')).toBeNull();
    });

    it('الزائر يرى القنوات الظاهرة فقط', () => {
        render(
            <ContactHarness
                isEditing={false}
                readOnly
                initialActions={[
                    { id: 'c1', type: 'call', label: 'هاتف المكتب', value: '07701234567' },
                ]}
            />,
        );
        expect(screen.getByTestId('contact-channel-c1')).toHaveTextContent('هاتف المكتب');
        expect(screen.queryByText('أضف قنوات التواصل من «تعديل».')).toBeNull();
        expect(screen.queryByTestId('profile-contact-add-call')).toBeNull();
    });

    it('readOnly أثناء التعديل لا يُظهر أزرار الإضافة', () => {
        render(<ContactHarness isEditing readOnly />);
        expect(screen.queryByTestId('profile-contact-add-call')).toBeNull();
        expect(screen.getByText('أضف قنوات التواصل من «تعديل».')).toBeTruthy();
    });
});
