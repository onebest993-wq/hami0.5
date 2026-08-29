import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import React from 'react';
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';
import { CriminalDashboardBridgeLazyProvider } from '@/app/components/lawyer/criminal-system/criminalDashboardBridgeLazy';

const attachCriminalDashboardBridge = vi.fn(() => () => undefined);
const scheduleIdleWork = vi.fn((fn: () => void) => {
    fn();
    return () => undefined;
});

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    getBackgroundServicesDeferMs: () => 0,
    scheduleIdleWork: (fn: () => void, opts?: unknown) => scheduleIdleWork(fn, opts),
}));

vi.mock('@/app/slices/criminal/bridgeEvent', () => ({
    CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT: 'hami:criminal-bridge-activate',
    consumeCriminalDashboardBridgeActivateRequest: () => false,
}));

vi.mock('@/app/components/lawyer/criminal-system/criminalDashboardBridgeRuntime', () => ({
    attachCriminalDashboardBridge: (...args: unknown[]) => attachCriminalDashboardBridge(...args),
}));

describe('CriminalDashboardBridgeLazyProvider — idle بعد طلاء الشبكة', () => {
    beforeEach(() => {
        window.__hamiHomeMainGridPainted__ = false;
        attachCriminalDashboardBridge.mockClear();
        scheduleIdleWork.mockClear();
    });

    afterEach(() => {
        window.__hamiHomeMainGridPainted__ = false;
    });

    it('لا يبدأ idle قبل الطلاء ويبدأ بعده', async () => {
        render(
            <CriminalDashboardBridgeLazyProvider enabled lawyerId="lawyer-1">
                <div data-testid="child" />
            </CriminalDashboardBridgeLazyProvider>,
        );

        expect(scheduleIdleWork).not.toHaveBeenCalled();
        expect(attachCriminalDashboardBridge).not.toHaveBeenCalled();

        await act(async () => {
            window.__hamiHomeMainGridPainted__ = true;
            window.dispatchEvent(new Event(HOME_MAIN_GRID_PAINTED_EVENT));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(scheduleIdleWork).toHaveBeenCalled();
        expect(attachCriminalDashboardBridge).toHaveBeenCalled();
    });
});
