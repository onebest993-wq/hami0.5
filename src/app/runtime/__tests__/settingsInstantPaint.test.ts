import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    applySettingsOpaqueChrome,
    armSettingsOverlayInteraction,
    clearSettingsForceVisible,
    clearSettingsReopenSuppress,
    concealSettingsWarmShell,
    getSettingsShellRevealedAt,
    isSettingsCloseGuarded,
    isSettingsForceVisible,
    isSettingsOverlayInteractionArmed,
    isSettingsReopenSuppressed,
    paintSettingsInstantChrome,
    removeSettingsInstantBridge,
    revealSettingsWarmShell,
    scheduleSettingsOverlayInteractionArm,
    suppressSettingsReopen,
} from '../settingsInstantPaint';

describe('settingsInstantPaint', () => {
    beforeEach(() => {
        clearSettingsForceVisible();
        clearSettingsReopenSuppress();
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-settings-close-guard');
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearSettingsForceVisible();
        clearSettingsReopenSuppress();
        removeSettingsInstantBridge();
        document.documentElement.removeAttribute('data-settings-close-guard');
        vi.useRealTimers();
    });

    it('applySettingsOpaqueChrome masks dashboard theme before host reveal', () => {
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        dash.style.backgroundColor = 'rgb(26, 20, 12)';
        document.body.appendChild(dash);

        applySettingsOpaqueChrome();

        expect(document.documentElement.style.backgroundColor).toBe('rgb(11, 16, 33)');
        expect(document.body.style.backgroundColor).toBe('rgb(11, 16, 33)');
        expect(dash.style.backgroundColor).toBe('rgb(11, 16, 33)');
    });

    it('reveals portal host with opaque visibility and pointer events', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        layer.style.visibility = 'hidden';
        document.body.appendChild(layer);

        expect(revealSettingsWarmShell()).toBe(true);
        expect(isSettingsForceVisible()).toBe(true);
        expect(getSettingsShellRevealedAt()).not.toBeNull();
        expect(layer.style.visibility).toBe('visible');
        expect(layer.style.pointerEvents).toBe('auto');
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        expect(isSettingsCloseGuarded()).toBe(true);
    });

    it('does not paint a skeleton bridge when no host exists', () => {
        expect(paintSettingsInstantChrome()).toBe(false);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeNull();
        expect(isSettingsForceVisible()).toBe(false);
    });

    it('conceals the portal host without blocking reopen by default (prime-safe)', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);
        revealSettingsWarmShell();
        concealSettingsWarmShell();

        expect(isSettingsForceVisible()).toBe(false);
        expect(layer.style.visibility).toBe('hidden');
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        expect(isSettingsCloseGuarded()).toBe(false);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('conceal with suppressReopen blocks reopen briefly (real user close)', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);
        revealSettingsWarmShell();
        concealSettingsWarmShell({ suppressReopen: true });

        expect(isSettingsReopenSuppressed()).toBe(true);
        vi.advanceTimersByTime(500);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('suppressSettingsReopen blocks until window elapses', () => {
        suppressSettingsReopen(200);
        expect(isSettingsReopenSuppressed()).toBe(true);
        vi.advanceTimersByTime(200);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('arms interaction immediately after open-gesture click is swallowed', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);

        revealSettingsWarmShell();
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        expect(isSettingsCloseGuarded()).toBe(true);

        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);
        window.dispatchEvent(new Event('click', { bubbles: true }));
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
        expect(isSettingsCloseGuarded()).toBe(false);
    });

    it('scheduleSettingsOverlayInteractionArm falls back by timeout', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        layer.classList.add('hami-settings-overlay-layer--visible');
        document.body.appendChild(layer);

        scheduleSettingsOverlayInteractionArm(layer);
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(false);

        vi.advanceTimersByTime(80);
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
        expect(isSettingsCloseGuarded()).toBe(false);
    });

    it('does not restart arm schedule when Host/Shell re-invoke', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        layer.classList.add('hami-settings-overlay-layer--visible');
        document.body.appendChild(layer);

        scheduleSettingsOverlayInteractionArm(layer);
        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        scheduleSettingsOverlayInteractionArm(layer);
        window.dispatchEvent(new Event('click', { bubbles: true }));
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
    });

    it('suppressSettingsReopen swallows residual gear click then clears', () => {
        const gear = document.createElement('button');
        gear.setAttribute('data-testid', 'header-settings-trigger');
        document.body.appendChild(gear);

        suppressSettingsReopen();
        expect(isSettingsReopenSuppressed()).toBe(true);

        const residual = new MouseEvent('click', { bubbles: true, cancelable: true });
        const stopped = vi.fn();
        residual.stopImmediatePropagation = stopped;
        gear.dispatchEvent(residual);

        expect(residual.defaultPrevented).toBe(true);
        expect(stopped).toHaveBeenCalled();
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('suppressSettingsReopen ignores non-gear click and keeps window until timeout', () => {
        suppressSettingsReopen(90);
        expect(isSettingsReopenSuppressed()).toBe(true);
        window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(isSettingsReopenSuppressed()).toBe(true);
        vi.advanceTimersByTime(90);
        expect(isSettingsReopenSuppressed()).toBe(false);
    });

    it('suppressSettingsReopen allows intentional gear open after window elapses', () => {
        const gear = document.createElement('button');
        gear.setAttribute('data-testid', 'header-settings-trigger');
        document.body.appendChild(gear);

        suppressSettingsReopen(90);
        vi.advanceTimersByTime(90);
        expect(isSettingsReopenSuppressed()).toBe(false);

        const intentional = new MouseEvent('click', { bubbles: true, cancelable: true });
        gear.dispatchEvent(intentional);
        expect(intentional.defaultPrevented).toBe(false);
    });

    it('armSettingsOverlayInteraction enables pointer events immediately', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(layer);
        armSettingsOverlayInteraction(layer);
        expect(isSettingsOverlayInteractionArmed(layer)).toBe(true);
        expect(layer.style.pointerEvents).toBe('auto');
        expect(isSettingsCloseGuarded()).toBe(false);
    });
});
