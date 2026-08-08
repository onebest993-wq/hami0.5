import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';

function PressProbe({ onPress }: { onPress: () => void }) {
    const press = useScrollSafePress({ onPress });
    return (
        <button type="button" data-testid="press-probe" {...press}>
            probe
        </button>
    );
}

describe('useScrollSafePress', () => {
    it('يفتح عند pointerup بدون حركة', () => {
        const onPress = vi.fn();
        render(<PressProbe onPress={onPress} />);
        const btn = screen.getByTestId('press-probe');
        fireEvent.pointerDown(btn, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
        expect(onPress).not.toHaveBeenCalled();
        fireEvent.pointerUp(btn, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('لا يفتح عند تجاوز slop', () => {
        const onPress = vi.fn();
        render(<PressProbe onPress={onPress} />);
        const btn = screen.getByTestId('press-probe');
        fireEvent.pointerDown(btn, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
        fireEvent.pointerMove(btn, { clientX: 40, clientY: 40, pointerId: 1 });
        fireEvent.pointerUp(btn, { button: 0, clientX: 40, clientY: 40, pointerId: 1 });
        expect(onPress).not.toHaveBeenCalled();
    });
});
