import { describe, expect, it, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ExecutionArchiveInstantChrome } from '@/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome';

describe('ExecutionArchiveInstantChrome', () => {
    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-execution-create-guard');
    });
    it('keep-alive المغلق inert ومخفي عن الإيماءة؛ المفتوح overlay-safe بلا inert', () => {
        const onClose = vi.fn();
        const { rerender, getByTestId } = render(
            <ExecutionArchiveInstantChrome open={false} onClose={onClose}>
                <input data-testid="execution-archive-search" />
            </ExecutionArchiveInstantChrome>,
        );

        const closed = getByTestId('execution-archive-shell');
        expect(closed).toHaveAttribute('aria-hidden', 'true');
        expect(closed).toHaveAttribute('data-open', 'false');
        expect(closed).toHaveAttribute('inert');
        expect(closed).not.toHaveAttribute('data-hami-overlay-safe');
        expect(closed.style.pointerEvents).toBe('none');

        rerender(
            <ExecutionArchiveInstantChrome open onClose={onClose}>
                <input data-testid="execution-archive-search" />
            </ExecutionArchiveInstantChrome>,
        );

        const opened = getByTestId('execution-archive-shell');
        expect(opened).toHaveAttribute('aria-hidden', 'false');
        expect(opened).toHaveAttribute('data-open', 'true');
        expect(opened).toHaveAttribute('data-hami-overlay-safe', '1');
        expect(opened).not.toHaveAttribute('inert');
    });

    it('يعطل زر إغلاق المخزن أثناء نموذج الإنشاء', () => {
        const onClose = vi.fn();
        const { getByRole, getByTestId } = render(
            <ExecutionArchiveInstantChrome open onClose={onClose} contentInteractive={false}>
                <span />
            </ExecutionArchiveInstantChrome>,
        );
        expect(getByRole('button', { name: 'إغلاق مخزن الأضابير التنفيذية' })).toBeDisabled();
        expect(getByTestId('execution-archive-shell').style.pointerEvents).toBe('auto');
    });

    it('حارس إغلاق الإنشاء يعطّل القشرة حتى لو contentInteractive لا يزال true', () => {
        const onClose = vi.fn();
        document.documentElement.setAttribute('data-hami-execution-create-guard', '1');
        const { getByRole, getByTestId } = render(
            <ExecutionArchiveInstantChrome open onClose={onClose} contentInteractive>
                <span />
            </ExecutionArchiveInstantChrome>,
        );

        expect(getByTestId('execution-archive-shell').style.pointerEvents).toBe('auto');
        expect(getByRole('button', { name: 'إغلاق مخزن الأضابير التنفيذية' })).toBeDisabled();
        getByRole('button', { name: 'إغلاق مخزن الأضابير التنفيذية' }).click();
        expect(onClose).not.toHaveBeenCalled();
    });
});
