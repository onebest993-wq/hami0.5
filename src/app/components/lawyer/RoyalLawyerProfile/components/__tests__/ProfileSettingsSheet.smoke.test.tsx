import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

vi.mock('motion/react', () => ({
    motion: {
        div: React.forwardRef<
            HTMLDivElement,
            React.PropsWithChildren<Record<string, unknown>>
        >(({ children, ...props }, ref) => (
            <div ref={ref} {...props}>{children}</div>
        )),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: () => undefined,
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { ProfileSettingsSheet } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet';

describe('ProfileSettingsSheet smoke', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض تبويبات الاستوديو عند الفتح', () => {
        render(
            <ProfileSettingsSheet
                open
                onClose={vi.fn()}
                customization={defaultProfilePageCustomization()}
                userId="lawyer-1"
                onSave={vi.fn(async () => true)}
            />,
        );

        expect(screen.getByTestId('profile-settings-sheet')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /المظهر/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /المحتويات/i })).toBeInTheDocument();
    });

    it('لا يعرض المحتوى عند الإغلاق', () => {
        render(
            <ProfileSettingsSheet
                open={false}
                onClose={vi.fn()}
                customization={defaultProfilePageCustomization()}
                userId="lawyer-1"
                onSave={vi.fn(async () => true)}
            />,
        );

        expect(screen.queryByTestId('profile-settings-sheet')).not.toBeInTheDocument();
    });
});
