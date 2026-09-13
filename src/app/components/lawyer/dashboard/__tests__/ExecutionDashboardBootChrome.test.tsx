import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutionDashboardBootChrome } from '../ExecutionDashboardBootChrome';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

/**
 * يُركّب هذا الإطارُ `useOverlayGhostClickShield` (١٨٠ م.ث، طور الالتقاط)، فالنقرةُ
 * الفورية بعد العرض **تُبتلع عمداً**. وكان الاختبار ينقر داخل النافذة فسقط منذ
 * أُضيف الدرع (`3b9b03bc`). يُقدَّم الوقتُ متجاوزاً النافذة، **والتوكيدُ باقٍ كما هو**.
 * وحجّةُ الدرع والمسابيرُ الثلاثة في `executionDashboardStatusViews.test.tsx`.
 */
const GHOST_CLICK_SHIELD_MS = 180;

afterEach(() => {
    vi.useRealTimers();
});

describe('ExecutionDashboardBootChrome', () => {
    it('renders above the execution archive shell stacking context', () => {
        vi.useFakeTimers({ toFake: ['performance'] });
        const onExitToHome = vi.fn();
        render(
            <ExecutionDashboardBootChrome
                file={{ id: 'ex-1', type: 'execution', fileNumber: '12', fileYear: '2026' } as FileData}
                onExitToHome={onExitToHome}
            />,
        );

        const root = screen.getByTestId('execution-dashboard-dossier');
        expect(root.className).toContain('z-[230]');
        expect(screen.getByText('12/2026')).toBeTruthy();
        const close = screen.getByTestId('execution-dashboard-close');
        expect(close).toHaveAttribute('aria-label', 'المغادرة إلى الواجهة الرئيسية');
        vi.advanceTimersByTime(GHOST_CLICK_SHIELD_MS + 20);
        close.click();
        expect(onExitToHome).toHaveBeenCalledTimes(1);
    });
});
