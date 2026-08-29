/** @vitest-environment jsdom */
import React, { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/lawyer/ExecutionCreationView.tsx', () => ({
    ExecutionCreationView: function MockCreationView() {
        return <div data-testid="creation-real">CREATION_READY</div>;
    },
}));

describe('LazyExecutionCreationView preload-aware', () => {
    it('بعد preload يرسم النموذج الحقيقي بلا BootShell', async () => {
        const { LazyExecutionCreationView } = await import('@/app/runtime/executionCreationViewLazy');

        await act(async () => {
            await LazyExecutionCreationView.preload();
        });

        expect(LazyExecutionCreationView.isPreloaded()).toBe(true);

        render(
            <Suspense fallback={<div data-testid="creation-fallback">LOADING</div>}>
                <LazyExecutionCreationView isOpen onClose={() => undefined} onSave={() => undefined} />
            </Suspense>,
        );

        expect(screen.queryByTestId('creation-fallback')).toBeNull();
        expect(screen.getByTestId('creation-real').textContent).toBe('CREATION_READY');
    });
});
