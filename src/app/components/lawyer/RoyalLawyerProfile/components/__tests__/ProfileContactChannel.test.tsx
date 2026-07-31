import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import { ProfileContactChannel } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContactChannel';
import { SmartToast } from '@/app/components/ui/SmartToast';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock('@/app/runtime/screenshotDeterrentRuntime', () => ({
    withAllowedClipboardAction: async <T,>(action: () => Promise<T> | T) => await action(),
}));

function buildAction(overrides: Partial<ProfileAction> = {}): ProfileAction {
    return {
        id: 'contact-1',
        type: 'website',
        label: 'الموقع',
        value: 'example.com',
        ...overrides,
    } as ProfileAction;
}

describe('ProfileContactChannel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('navigator', {
            clipboard: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
        });
    });

    it('يفصل زر النسخ عن رابط القناة ولا يضع تفاعلاً داخل تفاعل', () => {
        render(<ProfileContactChannel action={buildAction()} />);

        const link = screen.getByRole('link');
        const copyButton = screen.getByRole('button', { name: 'نسخ' });

        expect(link).toHaveAttribute('href', 'https://example.com/');
        expect(copyButton.closest('a')).toBeNull();
    });

    it('ينسخ القيمة ويعرض Toast نجاح', async () => {
        const clipboardWrite = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', {
            clipboard: { writeText: clipboardWrite },
        });

        render(<ProfileContactChannel action={buildAction({ label: 'هاتف', type: 'call', value: '07701234567' })} />);

        fireEvent.click(screen.getByRole('button', { name: 'نسخ' }));

        await waitFor(() => {
            expect(clipboardWrite).toHaveBeenCalledWith('07701234567');
        });
        expect(SmartToast.success).toHaveBeenCalledWith('تم النسخ');
    });

    it('يعرض خطأ عند الضغط على قناة غير صالحة', () => {
        render(<ProfileContactChannel action={buildAction({ type: 'email', label: 'بريد', value: 'bad-email' })} />);

        fireEvent.click(screen.getByRole('button', { name: /bad-email/i }));

        expect(SmartToast.error).toHaveBeenCalledWith('بيانات التواصل غير صالحة — عدّلها من «تعديل»');
    });
});
