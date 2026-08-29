import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HqFold } from '../HqFold';
import { HQ_FOLD_STORAGE_KEY } from '../useHqFold';

describe('HqFold', () => {
    beforeEach(() => {
        sessionStorage.removeItem(HQ_FOLD_STORAGE_KEY);
    });

    it('يطوي المحتوى ويُظهر الملخص ويُبقي زر الإجراء خارج الطي', () => {
        const onAction = vi.fn();
        render(
            <HqFold
                id="audit"
                title="سجل العمليات"
                summary="لا عمليات بعد"
                hint="تلميح السجل"
                testId="hq-stats-audit"
                action={
                    <button type="button" onClick={onAction}>
                        تحديث
                    </button>
                }
            >
                <p>لا عمليات مسجّلة بعد.</p>
            </HqFold>,
        );

        expect(screen.getByTestId('hq-stats-audit')).toBeInTheDocument();
        expect(screen.getByText('لا عمليات مسجّلة بعد.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'سجل العمليات — طي القسم' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );

        fireEvent.click(screen.getByRole('button', { name: 'تحديث' }));
        expect(onAction).toHaveBeenCalledTimes(1);
        expect(screen.getByText('لا عمليات مسجّلة بعد.')).toBeInTheDocument();

        const toggle = screen.getByRole('button', { name: 'سجل العمليات — طي القسم' });
        fireEvent.click(toggle);
        const expand = screen.getByRole('button', {
            name: 'سجل العمليات — لا عمليات بعد — توسيع القسم',
        });
        expect(expand).toHaveAttribute('aria-expanded', 'false');
        const panel = document.getElementById(expand.getAttribute('aria-controls') || '');
        expect(panel).toHaveAttribute('hidden');
        expect(screen.getByText('لا عمليات بعد')).toBeInTheDocument();
    });
});
