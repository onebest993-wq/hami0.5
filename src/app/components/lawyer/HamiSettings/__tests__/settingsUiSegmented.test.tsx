import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Segmented } from '@/app/components/lawyer/HamiSettings/settings-ui/index';

describe('Segmented', () => {
    it('يستخدم radiogroup و aria-checked', () => {
        render(
            <Segmented
                value="b"
                options={[
                    { value: 'a', label: 'أ' },
                    { value: 'b', label: 'ب' },
                    { value: 'c', label: 'ج' },
                ]}
                onChange={vi.fn()}
            />,
        );

        const group = screen.getByRole('radiogroup');
        expect(group).toBeInTheDocument();

        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(3);
        expect(radios[1]).toHaveAttribute('aria-checked', 'true');
        expect(radios[1]).toHaveAttribute('tabindex', '0');
        expect(radios[0]).toHaveAttribute('tabindex', '-1');
    });

    it('ينتقل بالأسهم ويحدّث القيمة', () => {
        document.documentElement.dir = 'rtl';
        const onChange = vi.fn();
        render(
            <Segmented
                value="a"
                options={[
                    { value: 'a', label: 'أ' },
                    { value: 'b', label: 'ب' },
                ]}
                onChange={onChange}
            />,
        );

        const first = screen.getAllByRole('radio')[0];
        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowLeft' });
        expect(onChange).toHaveBeenCalledWith('b');
    });
});
