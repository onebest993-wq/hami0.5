import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    paintTasksManagerInstantChrome,
    removeTasksManagerInstantChrome,
} from '@/app/runtime/tasksManagerInstantPaint';
import { TASKS_MANAGER_INSTANT_CHROME_ID } from '@/app/services/fieldTasks/fieldTasksShellSnap';

describe('tasksManagerInstantPaint', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-tasks-manager-open');
        document.documentElement.removeAttribute('data-hami-field-tasks-open');
        document.body.replaceChildren();
        document.getElementById('hami-overlay-portal')?.remove();
    });

    afterEach(() => {
        removeTasksManagerInstantChrome();
        document.getElementById('hami-overlay-portal')?.remove();
    });

    it('يطلي قشرة الأجندة فوراً عندما لا توجد overlay', () => {
        expect(paintTasksManagerInstantChrome()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-tasks-manager-open')).toBe('1');
        const chrome = document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID);
        expect(chrome).not.toBeNull();
        expect(chrome?.textContent).toContain('أجندة المهام');
    });

    it('لا يبقي الجسر إذا كانت overlay موجودة', () => {
        const overlay = document.createElement('div');
        overlay.dataset.testid = 'tasks-manager-overlay';
        document.body.appendChild(overlay);
        expect(paintTasksManagerInstantChrome()).toBe(true);
        expect(document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID)).toBeNull();
    });
});
