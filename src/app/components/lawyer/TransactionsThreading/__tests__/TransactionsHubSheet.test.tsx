import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionsHubSheet } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubSheet';

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

describe('TransactionsHubSheet', () => {
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
});
