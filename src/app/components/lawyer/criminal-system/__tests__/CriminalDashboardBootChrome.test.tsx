import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CriminalDashboardBootChrome } from '../CriminalDashboardBootChrome';

describe('CriminalDashboardBootChrome', () => {
    it('renders loading skeleton with case headline', () => {
        render(<CriminalDashboardBootChrome caseId="cr-1" headline="قضية/2026" />);

        const root = screen.getByTestId('criminal-dashboard-boot-chrome');
        expect(root.getAttribute('data-case-id')).toBe('cr-1');
        expect(screen.getByText('قضية/2026')).toBeTruthy();
    });
});
