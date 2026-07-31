import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EXEC_FOC_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';

describe('EXEC_FOC_LAZY_FALLBACK', () => {
    it('renders FocInstantShell as the financial hub body fallback', () => {
        expect(EXEC_FOC_LAZY_FALLBACK).not.toBeNull();
        render(<>{EXEC_FOC_LAZY_FALLBACK}</>);
        const root = screen.getByTestId('foc-instant-shell');
        expect(root.getAttribute('aria-busy')).toBe('true');
        expect(screen.getByText('المركز المالي')).toBeTruthy();
    });
});
