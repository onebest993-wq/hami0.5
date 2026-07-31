import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransactionsThreadingHost } from '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost';

const loadTransactionsHubModule = vi.fn();

vi.mock('@/app/runtime/transactionsHubLoader', () => ({
    getCachedTransactionsThreadingSystem: vi.fn(() => null),
    hydrateTransactionsShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    loadTransactionsHubModule: (...args: unknown[]) => loadTransactionsHubModule(...args),
}));

vi.mock('@/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell', () => ({
    TransactionsHubInstantShell: ({ onBack }: { onBack: () => void }) => (
        <div data-testid="transactions-instant-shell">
            <button type="button" onClick={onBack}>
                رجوع
            </button>
        </div>
    ),
}));

const LoadedHub = ({ onBack, open }: { onBack: () => void; open?: boolean }) => (
    <div data-testid="transactions-loaded-hub" data-open={open ? '1' : '0'}>
        <button type="button" onClick={onBack}>
            loaded-back
        </button>
    </div>
);

describe('TransactionsThreadingHost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        loadTransactionsHubModule.mockImplementation(() => new Promise(() => undefined));
    });

    it('يعرض instant shell عند الفتح قبل resolve الـ chunk', () => {
        render(
            <TransactionsThreadingHost open onBack={vi.fn()} userId="lawyer-1" />,
        );

        expect(screen.getByTestId('transactions-instant-shell')).toBeInTheDocument();
    });

    it('لا يعرض InstantShell عند keepAlive مغلق قبل resolve', () => {
        render(
            <TransactionsThreadingHost
                open={false}
                keepAlive
                onBack={vi.fn()}
                userId="lawyer-1"
            />,
        );

        expect(screen.queryByTestId('transactions-instant-shell')).not.toBeInTheDocument();
        expect(loadTransactionsHubModule).toHaveBeenCalled();
    });

    it('يبقي System مخفياً عند keepAlive بعد resolve', async () => {
        loadTransactionsHubModule.mockResolvedValue({ default: LoadedHub });

        render(
            <TransactionsThreadingHost
                open={false}
                keepAlive
                onBack={vi.fn()}
                userId="lawyer-1"
            />,
        );

        await waitFor(() => expect(screen.getByTestId('transactions-loaded-hub')).toBeInTheDocument());
        expect(screen.getByTestId('transactions-loaded-hub')).toHaveAttribute('data-open', '0');
    });

    it('ينتقل للمكوّن المحمّل بعد resolve', async () => {
        loadTransactionsHubModule.mockResolvedValue({ default: LoadedHub });

        render(
            <TransactionsThreadingHost open onBack={vi.fn()} userId="lawyer-1" />,
        );

        await waitFor(() => expect(screen.getByTestId('transactions-loaded-hub')).toBeInTheDocument());
    });

    it('instant shell يستدعي onBack', () => {
        const onBack = vi.fn();
        render(
            <TransactionsThreadingHost open onBack={onBack} userId="lawyer-1" />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'رجوع' }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
