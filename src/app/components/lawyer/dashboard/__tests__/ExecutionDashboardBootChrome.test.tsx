import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutionDashboardBootChrome } from '../ExecutionDashboardBootChrome';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

describe('ExecutionDashboardBootChrome', () => {
    it('renders above the execution archive shell stacking context', () => {
        render(
            <ExecutionDashboardBootChrome
                file={{ id: 'ex-1', type: 'execution', fileNumber: '12', fileYear: '2026' } as FileData}
                onClose={vi.fn()}
            />,
        );

        const root = screen.getByTestId('execution-dashboard-dossier');
        expect(root.className).toContain('z-[230]');
        expect(screen.getByText('12/2026')).toBeTruthy();
    });
});
