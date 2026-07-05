import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TxDateInput } from '../TxDateInput';

vi.mock('@/app/components/ui/HamiDateInput', () => ({
    HamiDateInput: ({
        value,
        onValueChange,
        placeholder,
        disabled,
        className,
    }: {
        value: string;
        onValueChange?: (iso: string) => void;
        placeholder?: string;
        disabled?: boolean;
        className?: string;
    }) => (
        <button
            type="button"
            data-testid="tx-date-trigger"
            disabled={disabled}
            className={className}
            onClick={() => onValueChange?.('2026-07-03')}
        >
            {value || placeholder}
        </button>
    ),
}));

describe('TxDateInput', () => {
    it('يمرّر تغيير التاريخ عبر onChange', () => {
        const onChange = vi.fn();
        render(<TxDateInput value="" onChange={onChange} />);

        fireEvent.click(screen.getByTestId('tx-date-trigger'));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                target: expect.objectContaining({ value: '2026-07-03' }),
            }),
        );
    });
});
