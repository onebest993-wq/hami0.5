import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearFieldTasksCloseSuppress,
    clearFieldTasksForceVisible,
    concealFieldTasksWarmSheet,
    isFieldTasksCloseSuppressed,
    isFieldTasksForceVisible,
    revealFieldTasksWarmSheet,
    suppressFieldTasksClose,
} from '@/app/runtime/fieldTasksInstantPaint';

describe('fieldTasksInstantPaint', () => {
    beforeEach(() => {
        clearFieldTasksCloseSuppress();
        clearFieldTasksForceVisible();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        clearFieldTasksCloseSuppress();
        clearFieldTasksForceVisible();
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
        expect(layer.style.pointerEvents).toBe('none');
        expect(layer.getAttribute('data-open')).toBe('true');
        expect(sheet.classList.contains('translate-y-0')).toBe(true);
        expect(sheet.classList.contains('hami-field-tasks-sheet--snap')).toBe(false);
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

    it('suppressFieldTasksClose يمنع الإغلاق الفوري', () => {
        suppressFieldTasksClose(200);
        expect(isFieldTasksCloseSuppressed()).toBe(true);
    });
});
