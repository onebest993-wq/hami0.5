import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExecutionOptionSheet from '../ExecutionOptionSheet';

describe('ExecutionOptionSheet leftover tap', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not close from the same tap that opened it', () => {
        vi.useFakeTimers();
        const onClose = vi.fn();
        render(
            <ExecutionOptionSheet
                open
                onClose={onClose}
                title="نوع السند المنفذ"
                options={[{ value: 'قرارات وأحكام المحاكم', label: 'قرارات المحاكم' }]}
                selectedValue=""
                onSelect={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('execution-creation-option-sheet-backdrop'));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog', { name: 'نوع السند المنفذ' })).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(100);
        });
        fireEvent.click(screen.getByTestId('execution-creation-option-sheet-backdrop'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
