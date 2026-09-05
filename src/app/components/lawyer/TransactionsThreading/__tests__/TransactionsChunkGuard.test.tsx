import { describe, expect, it, vi, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TxLazyIsland } from '../TransactionsChunkGuard';

function Boom(): never {
    throw new Error('tx-chunk-fail');
}

describe('TransactionsChunkGuard', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    afterEach(() => {
        errorSpy.mockClear();
    });

    afterAll(() => {
        errorSpy.mockRestore();
    });

    it('يخفي الجزيرة ويستدعي onFailed عند سقوط المقطع', () => {
        const onFailed = vi.fn();
        render(
            <div>
                <span>hub-safe</span>
                <TxLazyIsland onFailed={onFailed}>
                    <Boom />
                </TxLazyIsland>
            </div>,
        );

        expect(screen.getByText('hub-safe')).toBeInTheDocument();
        expect(onFailed).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('tx-chunk-fail')).not.toBeInTheDocument();
    });

    it('يعيد المحاولة بعد إعادة التركيب بمفتاح جديد', () => {
        const onFailed = vi.fn();
        function Ok() {
            return <span>chunk-ok</span>;
        }

        const { rerender } = render(
            <TxLazyIsland key="fail" onFailed={onFailed}>
                <Boom />
            </TxLazyIsland>,
        );
        expect(onFailed).toHaveBeenCalledTimes(1);

        rerender(
            <TxLazyIsland key="ok" onFailed={onFailed}>
                <Ok />
            </TxLazyIsland>,
        );
        expect(screen.getByText('chunk-ok')).toBeInTheDocument();
    });
});
