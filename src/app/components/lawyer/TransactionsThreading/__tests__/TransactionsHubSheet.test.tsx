import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionsHubSheet } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubSheet';

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

const keyboardInsetState = vi.hoisted(() => ({ value: 0 }));

vi.mock('@/app/hooks/useMobileKeyboardInset', () => ({
    useMobileKeyboardInset: (enabled: boolean) => (enabled ? keyboardInsetState.value : 0),
}));

describe('TransactionsHubSheet', () => {
    beforeEach(() => {
        keyboardInsetState.value = 0;
    });
    it('يعرض المحتوى فوراً عند الفتح', () => {
        render(
            <TransactionsHubSheet open onOpenChange={vi.fn()} testId="transactions-add-sheet">
                <p>نموذج الإضافة</p>
            </TransactionsHubSheet>,
        );

        const sheet = screen.getByTestId('transactions-add-sheet');
        expect(sheet).toHaveAttribute('data-state', 'open');
        expect(screen.getByText('نموذج الإضافة')).toBeInTheDocument();
    });

    it('يُغلق عند النقر على الخلفية', () => {
        const onOpenChange = vi.fn();
        render(
            <TransactionsHubSheet open onOpenChange={onOpenChange} testId="transactions-add-sheet">
                <p>نموذج</p>
            </TransactionsHubSheet>,
        );

        fireEvent.click(screen.getByLabelText('إغلاق'));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('يبقى mounted مع data-state=closed عند keepMounted', () => {
        render(
            <TransactionsHubSheet open={false} keepMounted onOpenChange={vi.fn()} testId="transactions-add-sheet">
                <p>محتوى جاهز</p>
            </TransactionsHubSheet>,
        );

        expect(screen.getByTestId('transactions-add-sheet')).toHaveAttribute('data-state', 'closed');
        expect(screen.getByText('محتوى جاهز')).toBeInTheDocument();
    });

    it('يرفع اللوحة فوق الكيبورد عبر marginBottom و maxHeight', () => {
        keyboardInsetState.value = 280;
        render(
            <TransactionsHubSheet open onOpenChange={vi.fn()} testId="transactions-add-sheet">
                <p>نموذج</p>
            </TransactionsHubSheet>,
        );

        const sheet = screen.getByTestId('transactions-add-sheet');
        expect(sheet).toHaveAttribute('data-keyboard-inset', '280');
        expect(sheet.style.marginBottom).toBe('280px');
        expect(sheet.style.maxHeight).toContain('280px');
    });
});
