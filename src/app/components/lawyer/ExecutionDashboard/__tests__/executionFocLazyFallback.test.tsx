import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EXEC_FOC_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';

describe('EXEC_FOC_LAZY_FALLBACK', () => {
    it('renders a zero-import silent shell as the financial hub body fallback', () => {
        expect(EXEC_FOC_LAZY_FALLBACK).not.toBeNull();
        render(<>{EXEC_FOC_LAZY_FALLBACK}</>);
        const root = screen.getByTestId('foc-instant-shell');
        expect(root.getAttribute('aria-busy')).toBe('true');
        expect(root.getAttribute('aria-label')).toBeNull();
        expect(root.textContent).not.toContain('جاري تجهيز');
        expect(screen.getByText('المركز المالي')).toBeTruthy();
        expect(root.className).not.toContain('animate-pulse');
        expect(root.innerHTML).not.toContain('animate-pulse');
    });
});
