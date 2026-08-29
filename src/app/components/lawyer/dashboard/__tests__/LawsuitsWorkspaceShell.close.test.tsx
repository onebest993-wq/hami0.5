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
        expect(root).toHaveAttribute('inert');
        expect(root.style.visibility).toBe('hidden');
        expect(root.style.pointerEvents).toBe('none');
        expect(useBodyScrollLock).toHaveBeenCalledWith(false);
    });

    it('يزيل التركيز من داخل المخزن عند الإخفاء keep-alive', () => {
        const { rerender } = render(
            <LawsuitsWorkspaceShell open onClose={() => undefined}>
                {() => (
                    <button type="button" data-testid="dossier-card">
                        بطاقة
                    </button>
                )}
            </LawsuitsWorkspaceShell>,
        );
        const card = screen.getByTestId('dossier-card');
        card.focus();
        expect(document.activeElement).toBe(card);

        rerender(
            <LawsuitsWorkspaceShell open={false} onClose={() => undefined}>
                {() => (
                    <button type="button" data-testid="dossier-card">
                        بطاقة
                    </button>
                )}
            </LawsuitsWorkspaceShell>,
        );

        expect(document.activeElement).not.toBe(card);
    });

    it('زر المغادرة يستدعي onExitToHome عند النقر', () => {
        const onClose = vi.fn();
        const onExitToHome = vi.fn();
        render(
            <LawsuitsWorkspaceShell open onClose={onClose} onExitToHome={onExitToHome}>
                {() => <div>body</div>}
            </LawsuitsWorkspaceShell>,
        );
        fireEvent.click(screen.getByTestId('lawsuits-workspace-exit'));
        expect(onExitToHome).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
        expect(useBodyScrollLock).toHaveBeenCalledWith(true);
    });

    it('Escape لا يغلق المخزن عند وجود إضبارة مستعجل مفتوحة', () => {
        const onExitToHome = vi.fn();
        const overlay = document.createElement('div');
        overlay.setAttribute('data-testid', 'urgent-active-order-dossier');
        document.body.appendChild(overlay);

        render(
            <LawsuitsWorkspaceShell open onClose={() => undefined} onExitToHome={onExitToHome}>
                {() => <div>body</div>}
            </LawsuitsWorkspaceShell>,
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onExitToHome).not.toHaveBeenCalled();

        overlay.remove();
    });

    it('Escape لا يغلق المخزن عند وجود نموذج مستعجل مفتوح', () => {
        const onExitToHome = vi.fn();
        const overlay = document.createElement('div');
        overlay.setAttribute('data-testid', 'urgent-actions-form');
        document.body.appendChild(overlay);

        render(
            <LawsuitsWorkspaceShell open onClose={() => undefined} onExitToHome={onExitToHome}>
                {() => <div>body</div>}
            </LawsuitsWorkspaceShell>,
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onExitToHome).not.toHaveBeenCalled();

        overlay.remove();
    });
});
