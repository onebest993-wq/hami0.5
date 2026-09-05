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
        const body = chrome?.querySelector('[data-tasks-manager-instant-body]');
        expect(body?.querySelectorAll('[data-tasks-manager-instant-bone]').length).toBe(5);
    });

    it('يملأ القشرة بعناوين اللقطة بدل العظام الفارغة', async () => {
        const { legalTaskStub } = await import('@/app/services/tasks/__tests__/legalTaskStub');
        const { publishQuantumTasksMetrics } = await import('@/app/utils/quantumTasksMetrics');
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const pinned = legalTaskStub({
            id: 'mgr-1',
            title: 'متابعة تنفيذ الرصافة',
            pinnedToFieldCurtain: true,
            parsedDate: today,
        });
        publishQuantumTasksMetrics([pinned], [pinned]);
        expect(paintTasksManagerInstantChrome()).toBe(true);
        const chrome = document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID);
        expect(chrome?.textContent).toContain('متابعة تنفيذ الرصافة');
        publishQuantumTasksMetrics([], []);
    });

    it('عناوين الأجندة من اللقطة الكاملة وليست ستارة الميدان فقط', async () => {
        const { legalTaskStub } = await import('@/app/services/tasks/__tests__/legalTaskStub');
        const { publishQuantumTasksMetrics } = await import('@/app/utils/quantumTasksMetrics');
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 8);
        nextWeek.setHours(12, 0, 0, 0);
        const future = legalTaskStub({
            id: 'mgr-week',
            title: 'جلسة استئناف الكرادة',
            pinnedToFieldCurtain: false,
            parsedDate: nextWeek,
        });
        publishQuantumTasksMetrics([future], [future]);
        expect(paintTasksManagerInstantChrome()).toBe(true);
        const chrome = document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID);
        expect(chrome?.textContent).toContain('جلسة استئناف الكرادة');
        publishQuantumTasksMetrics([], []);
    });

    it('يكشف overlay الدافئة المخفية بلا قشرة وبلا نقر حتى يلحق React', () => {
        const overlay = document.createElement('div');
        overlay.dataset.testid = 'tasks-manager-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('data-keep-alive', '1');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.style.pointerEvents = 'none';
        const manager = document.createElement('div');
        manager.dataset.testid = 'tasks-manager';
        overlay.appendChild(manager);
        document.body.appendChild(overlay);

        expect(paintTasksManagerInstantChrome()).toBe(true);
        expect(document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID)).toBeNull();
        expect(overlay.style.opacity).toBe('1');
        expect(overlay.style.visibility).toBe('visible');
        expect(overlay.style.pointerEvents).toBe('none');
        expect(overlay.getAttribute('data-open')).toBe('true');
    });

    it('لا يكشف overlay فارغاً ينتظر مقطع الأجندة — القشرة تبقى بعظام', () => {
        const overlay = document.createElement('div');
        overlay.dataset.testid = 'tasks-manager-overlay';
        document.body.appendChild(overlay);

        expect(paintTasksManagerInstantChrome()).toBe(true);
        const chrome = document.getElementById(TASKS_MANAGER_INSTANT_CHROME_ID);
        expect(chrome).not.toBeNull();
        expect(chrome?.querySelectorAll('[data-tasks-manager-instant-bone]').length).toBe(5);
    });
});
