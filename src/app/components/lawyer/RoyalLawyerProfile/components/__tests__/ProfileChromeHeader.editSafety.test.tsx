import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileChromeHeader } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileChromeHeader';

describe('ProfileChromeHeader — فصل الرجوع عن التحرير', () => {
    it('يعرض الرجوع في طرف النهاية خارج وضع التحرير', () => {
        render(<ProfileChromeHeader showBack onBack={vi.fn()} />);
        const end = screen.getByTestId('lawyer-profile-chrome-end');
        expect(end).toContainElement(screen.getByTestId('lawyer-profile-back'));
        expect(screen.queryByTestId('lawyer-profile-edit-bar')).not.toBeInTheDocument();
    });

    it('يخفي الرجوع أثناء التحرير ويبقي إلغاء/حفظ فقط', () => {
        render(
            <ProfileChromeHeader
                showBack
                onBack={vi.fn()}
                isEditing
                screenActive
                onCancelEdit={vi.fn()}
                onSaveEdit={vi.fn()}
            />,
        );
        expect(screen.getByTestId('lawyer-profile-edit-bar')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-edit-cancel')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-edit-save')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-profile-back')).not.toBeInTheDocument();
    });
});
