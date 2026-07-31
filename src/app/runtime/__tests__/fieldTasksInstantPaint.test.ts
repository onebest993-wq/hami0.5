import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearFieldTasksForceVisible,
    clearFieldTasksInstantPaint,
    concealFieldTasksWarmSheet,
    isFieldTasksForceVisible,
    isFieldTasksInstantPaintActive,
    paintFieldTasksInstantSheet,
    revealFieldTasksWarmSheet,
} from '@/app/runtime/fieldTasksInstantPaint';

describe('fieldTasksInstantPaint', () => {
    beforeEach(() => {
        clearFieldTasksForceVisible();
        clearFieldTasksInstantPaint();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        clearFieldTasksForceVisible();
        clearFieldTasksInstantPaint();
    });

    it('reveals warm sheet with inline styles and forceVisible', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-field-tasks-root', '');
        layer.className = 'hami-field-tasks-layer';
        layer.style.opacity = '0';
        layer.style.visibility = 'hidden';
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'field-tasks-sheet');
        layer.appendChild(sheet);
        document.body.appendChild(layer);

        expect(revealFieldTasksWarmSheet()).toBe(true);
        expect(isFieldTasksForceVisible()).toBe(true);
        expect(layer.style.opacity).toBe('1');
        expect(layer.style.visibility).toBe('visible');
        expect(layer.getAttribute('data-open')).toBe('true');
        expect(isFieldTasksInstantPaintActive()).toBe(false);
    });

    it('paint is a no-op when warm sheet can be revealed', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-field-tasks-root', '');
        document.body.appendChild(layer);

        paintFieldTasksInstantSheet();
        expect(isFieldTasksInstantPaintActive()).toBe(false);
        expect(isFieldTasksForceVisible()).toBe(true);
    });

    it('conceals the warm sheet', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-field-tasks-root', '');
        document.body.appendChild(layer);
        revealFieldTasksWarmSheet();
        concealFieldTasksWarmSheet();

        expect(isFieldTasksForceVisible()).toBe(false);
        expect(layer.style.opacity).toBe('0');
        expect(layer.style.visibility).toBe('hidden');
    });
});
