import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RadarErrorBoundary } from '../RadarErrorBoundary';

function Boom(): React.ReactElement {
    throw new Error('radar-boom');
}

describe('RadarErrorBoundary', () => {
    it('يعرض رجوع عند خطأ التركيب دون ErrorBoundary العام', () => {
        const onBack = vi.fn();
        const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        render(
            <RadarErrorBoundary onBack={onBack}>
                <Boom />
            </RadarErrorBoundary>,
        );

        expect(screen.getByTestId('radar-error-fallback')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('radar-error-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });
});
