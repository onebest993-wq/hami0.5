import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LawsuitsWorkspaceShell } from '@/app/components/lawyer/dashboard/LawsuitsWorkspaceShell';

vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: () => () => undefined,
}));

import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

describe('LawsuitsWorkspaceShell close / keepAlive', () => {
    it('يخفي الطبقة عند open=false مع الإبقاء على التركيب', () => {
        render(
            <LawsuitsWorkspaceShell open={false} onClose={() => undefined}>
                {() => <div>body</div>}
            </LawsuitsWorkspaceShell>,
        );
        const root = screen.getByTestId('lawsuits-workspace');
        expect(root).toHaveAttribute('data-open', 'false');
        expect(root).toHaveAttribute('aria-hidden', 'true');
        expect(root.style.visibility).toBe('hidden');
        expect(root.style.pointerEvents).toBe('none');
        expect(useBodyScrollLock).toHaveBeenCalledWith(false);
    });

    it('زر الإغلاق يستدعي onClose على pointerdown', () => {
        const onClose = vi.fn();
        render(
            <LawsuitsWorkspaceShell open onClose={onClose}>
                {() => <div>body</div>}
            </LawsuitsWorkspaceShell>,
        );
        fireEvent.pointerDown(screen.getByTestId('lawsuits-workspace-close'), { button: 0 });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(useBodyScrollLock).toHaveBeenCalledWith(true);
    });
});
