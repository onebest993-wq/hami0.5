import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionsThreadingHost } from '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost';

vi.mock('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem', () => ({
    TransactionsThreadingSystem: ({
        onBack,
        open,
    }: {
        onBack: () => void;
        open?: boolean;
    }) => (
        <div data-testid="transactions-loaded-hub" data-open={open ? '1' : '0'}>
            <button type="button" onClick={onBack}>
                loaded-back
            </button>
        </div>
    ),
}));

describe('TransactionsThreadingHost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يرسم System فوراً عند الفتح', () => {
        render(<TransactionsThreadingHost open onBack={vi.fn()} userId="lawyer-1" />);
        expect(screen.getByTestId('transactions-loaded-hub')).toBeInTheDocument();
        expect(screen.getByTestId('transactions-loaded-hub')).toHaveAttribute('data-open', '1');
    });

    it('لا يرسم شيئاً عند الإغلاق', () => {
        const { container } = render(
            <TransactionsThreadingHost open={false} onBack={vi.fn()} userId="lawyer-1" />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByTestId('transactions-loaded-hub')).not.toBeInTheDocument();
    });

    it('System يستدعي onBack', () => {
        const onBack = vi.fn();
        render(<TransactionsThreadingHost open onBack={onBack} userId="lawyer-1" />);
        fireEvent.click(screen.getByRole('button', { name: 'loaded-back' }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
