import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ExecutionCreationView } from '@/app/components/lawyer/ExecutionCreationView';

describe('ExecutionCreationView instrument gate', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    it('hides instrument section until directorate inputs are complete', async () => {
        render(<ExecutionCreationView isOpen onClose={vi.fn()} onSave={vi.fn()} />);

        expect(
            screen.queryByRole('heading', { name: 'السند المنفذ' }),
        ).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('اسم المديرية'), {
            target: { value: 'تنفيذ الكرخ' },
        });

        expect(
            screen.queryByRole('heading', { name: 'السند المنفذ' }),
        ).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('رقم الإضبارة'), {
            target: { value: '1540/2026' },
        });

        await waitFor(
            () => {
                expect(screen.getByRole('heading', { name: 'السند المنفذ' })).toBeInTheDocument();
            },
            { timeout: 15_000 },
        );
    }, 30_000);
});
