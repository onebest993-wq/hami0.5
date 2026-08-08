import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AppearancePressButton } from '@/app/components/lawyer/HamiSettings/appearance/AppearancePressButton';

describe('AppearancePressButton', () => {
    it('لا يُنفّذ onPress مرتين من pointerdown ثم click', () => {
        const onPress = vi.fn();
        render(
            <AppearancePressButton data-testid="press-btn" onPress={onPress}>
                اختبار
            </AppearancePressButton>,
        );
        const btn = screen.getByTestId('press-btn');
        fireEvent.pointerDown(btn);
        fireEvent.click(btn);
        expect(onPress).toHaveBeenCalledTimes(1);
    });
});
