import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CommandCenterOverlays } from '@/app/components/lawyer/dashboard/CommandCenterOverlays';
import type { CommandCenterDockActions } from '@/app/components/lawyer/dashboard/useCommandCenterDockActions';

const toastError = vi.fn();
const toastWarning = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        error: (...args: unknown[]) => toastError(...args),
        warning: (...args: unknown[]) => toastWarning(...args),
    },
}));

vi.mock('@/app/stores/workspaceStore', () => ({
    useWorkspaceStore: (sel: (s: { pinnedItems: unknown[] }) => unknown) => sel({ pinnedItems: [] }),
}));

vi.mock('@/app/services/auth/shellAuth', () => ({
    hasLocalAppSession: (userId?: string | null) => Boolean(userId),
}));

vi.mock('@/app/components/lawyer/dashboard/HomeDockQuickSheet', () => ({
    HomeDockQuickSheet: ({
        mode,
        onNavigateRoute,
        onOpenEntity,
        onUnpin,
        onClose,
    }: {
        mode: string | null;
        onNavigateRoute: (path: string) => void;
        onOpenEntity: (alert: { id: string }) => void;
        onUnpin: (id: string, type: string) => void;
        onClose: () => void;
    }) =>
        mode ? (
            <div data-testid="mock-dock-sheet" data-mode={mode}>
                <button type="button" onClick={() => onNavigateRoute('workspace:lawsuit:p1')}>
                    safe-nav
                </button>
                <button type="button" onClick={() => onNavigateRoute('javascript:alert(1)')}>
                    evil-nav
                </button>
                <button type="button" onClick={() => onOpenEntity({ id: 'a1' })}>
                    open-entity
                </button>
                <button type="button" onClick={() => onUnpin('p1', 'lawsuit')}>
                    unpin
                </button>
                <button type="button" onClick={onClose}>
                    close-sheet
                </button>
            </div>
        ) : null,
}));

function actions(overrides: Partial<CommandCenterDockActions> = {}): CommandCenterDockActions {
    return {
        resolveDockWidgetClick: () => undefined,
        hubDockSheet: 'pins',
        setHubDockSheet: vi.fn(),
        secretaryAlerts: [],
        onNavigateRoute: vi.fn(),
        onOpenEntity: vi.fn(),
        onUnpinItem: vi.fn(),
        ...overrides,
    } as CommandCenterDockActions;
}

async function sheetReady() {
    await waitFor(() => {
        expect(screen.getByTestId('mock-dock-sheet')).toBeInTheDocument();
    });
}

describe('CommandCenterOverlays', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يمنع التنقل بلا جلسة', async () => {
        const onNavigateRoute = vi.fn();
        render(
            <CommandCenterOverlays userId={undefined} actions={actions()} onNavigateRoute={onNavigateRoute} />,
        );
        await sheetReady();
        fireEvent.click(screen.getByText('safe-nav'));
        expect(onNavigateRoute).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalled();
    });

    it('يمرّر المسار الآمن للمستخدم المسجّل', async () => {
        const onNavigateRoute = vi.fn();
        render(
            <CommandCenterOverlays
                userId="lawyer-1"
                actions={actions()}
                onNavigateRoute={onNavigateRoute}
            />,
        );
        await sheetReady();
        fireEvent.click(screen.getByText('safe-nav'));
        expect(onNavigateRoute).toHaveBeenCalledWith('workspace:lawsuit:p1');
        expect(toastError).not.toHaveBeenCalled();
        expect(toastWarning).not.toHaveBeenCalled();
    });

    it('ينبّه عند مسار غير صالح ولا يتنقل', async () => {
        const onNavigateRoute = vi.fn();
        render(
            <CommandCenterOverlays
                userId="lawyer-1"
                actions={actions()}
                onNavigateRoute={onNavigateRoute}
            />,
        );
        await sheetReady();
        fireEvent.click(screen.getByText('evil-nav'));
        expect(onNavigateRoute).not.toHaveBeenCalled();
        expect(toastWarning).toHaveBeenCalled();
    });

    it('يحرس فتح الكيان وإلغاء التثبيت', async () => {
        const onOpenEntity = vi.fn();
        const onUnpinItem = vi.fn();
        render(
            <CommandCenterOverlays
                userId={undefined}
                actions={actions({ onOpenEntity, onUnpinItem })}
                onNavigateRoute={vi.fn()}
            />,
        );
        await sheetReady();
        fireEvent.click(screen.getByText('open-entity'));
        fireEvent.click(screen.getByText('unpin'));
        expect(onOpenEntity).not.toHaveBeenCalled();
        expect(onUnpinItem).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalled();
    });
});
