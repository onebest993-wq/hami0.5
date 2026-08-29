import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import { DashboardTabSurface } from '../DashboardTabSurface';
import {
    snapProfileShellClose,
    snapProfileShellOpen,
} from '@/app/services/profile/profileShellSnap';
import {
    markProfileOpenedThisPage,
    resetProfileOpenedThisPageForTests,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

describe('DashboardTabSurface preserveLayout hit-testing', () => {
    it('forces idle keepAlive surfaces to block descendant pointer events', () => {
        const css = readFileSync(
            resolve(__dirname, '../../../RoyalLawyerProfile/profilePageEnterFx.css'),
            'utf8',
        );
        expect(css).toContain('.hami-dashboard-tab-preserve:not(.hami-dashboard-tab-preserve--active)');
        expect(css).toContain('pointer-events: none !important');
        expect(css).toContain('html:not([data-hami-profile-open=\'1\'])');
        expect(css).toContain(
            ".hami-dashboard-tab-preserve:not([data-testid='lawyer-dashboard-profile-surface']):not(",
        );
    });

    it('سطح الملف المفتوح بالـ snap ليس inert حتى قبل --active من React', () => {
        const src = readFileSync(resolve(__dirname, '../DashboardTabSurface.tsx'), 'utf8');
        expect(src).toContain('isProfileShellSnappedOpen');
        expect(src).toContain('wasProfileOpenedThisPage');
        expect(src).toContain('isPreservedSurfaceLive');
        expect(src).toContain('inertProps(!live)');
        expect(src).not.toMatch(/if \(active\) return true;/);
    });

    it('لا يفرض pointer-events:auto على كل أحفاد الملف — يكسّر لمس لوحة النص على الهاتف', () => {
        const enterCss = readFileSync(
            resolve(__dirname, '../../../RoyalLawyerProfile/profilePageEnterFx.css'),
            'utf8',
        );
        const criticalCss = readFileSync(
            resolve(__dirname, '../../lawyerHomeFx-critical.css'),
            'utf8',
        );
        const canvasCss = readFileSync(
            resolve(__dirname, '../../../RoyalLawyerProfile/profileCanvasFx.core.css'),
            'utf8',
        );
        const forbidden =
            "[data-testid='lawyer-dashboard-profile-surface'] * {\n    pointer-events: auto !important;";
        expect(enterCss).not.toContain(forbidden);
        expect(criticalCss).not.toContain(forbidden);
        expect(canvasCss).toContain('.profile-text-canvas__rim');
        expect(canvasCss).toContain('pointer-events: none');
    });
});

describe('DashboardTabSurface profile preserve live', () => {
    beforeEach(() => {
        resetProfileOpenedThisPageForTests();
        snapProfileShellClose();
    });

    it('active بلا snap وبلا نية فتح يبقى idle', () => {
        const { getByTestId } = render(
            React.createElement(
                DashboardTabSurface,
                {
                    active: true,
                    preserveLayout: true,
                    testId: 'lawyer-dashboard-profile-surface',
                },
                'x',
            ),
        );
        const el = getByTestId('lawyer-dashboard-profile-surface');
        expect(el.classList.contains('hami-dashboard-tab-preserve--active')).toBe(false);
        expect(el).toHaveAttribute('data-hami-tab-preserve', 'idle');
    });

    it('نية فتح + active: live قبل snap', () => {
        markProfileOpenedThisPage();
        const { getByTestId } = render(
            React.createElement(
                DashboardTabSurface,
                {
                    active: true,
                    preserveLayout: true,
                    testId: 'lawyer-dashboard-profile-surface',
                },
                'x',
            ),
        );
        const el = getByTestId('lawyer-dashboard-profile-surface');
        expect(el.classList.contains('hami-dashboard-tab-preserve--active')).toBe(true);
        expect(el).toHaveAttribute('data-hami-tab-preserve', 'active');
    });

    it('snap مفتوح وactive=false يبقى live', () => {
        snapProfileShellOpen();
        const { getByTestId } = render(
            React.createElement(
                DashboardTabSurface,
                {
                    active: false,
                    preserveLayout: true,
                    testId: 'lawyer-dashboard-profile-surface',
                },
                'x',
            ),
        );
        const el = getByTestId('lawyer-dashboard-profile-surface');
        expect(el.classList.contains('hami-dashboard-tab-preserve--active')).toBe(true);
    });
});
