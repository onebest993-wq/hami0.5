import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearFieldTasksCloseSuppress,
    clearFieldTasksForceVisible,
    concealFieldTasksWarmSheet,
    isFieldTasksCloseSuppressed,
    isFieldTasksForceVisible,
    paintFieldTasksInstantChrome,
    removeFieldTasksInstantChrome,
    revealFieldTasksWarmSheet,
    suppressFieldTasksClose,
    FIELD_TASKS_INSTANT_DISMISS_EVENT,
} from '@/app/runtime/fieldTasksInstantPaint';
import { FIELD_TASKS_INSTANT_CHROME_ID } from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { buildFieldTasksInstantChromeCardsHtml } from '@/app/runtime/fieldTasksInstantChromeMarkup';
import {
    drainFieldTasksInstantCompleteQueue,
    takeFieldTasksInstantManageQueued,
} from '@/app/runtime/fieldTasksInstantActions';

describe('fieldTasksInstantPaint', () => {
    beforeEach(() => {
        clearFieldTasksCloseSuppress();
        clearFieldTasksForceVisible();
        document.body.innerHTML = '';
        drainFieldTasksInstantCompleteQueue();
        takeFieldTasksInstantManageQueued();
    });

    afterEach(() => {
        clearFieldTasksCloseSuppress();
        clearFieldTasksForceVisible();
        removeFieldTasksInstantChrome();
        document.documentElement.removeAttribute('data-hami-field-tasks-open');
        drainFieldTasksInstantCompleteQueue();
        takeFieldTasksInstantManageQueued();
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
        expect(layer.getAttribute('data-interactive')).toBe('false');
        expect(layer.getAttribute('aria-hidden')).toBe('true');
        expect(sheet.classList.contains('translate-y-0')).toBe(true);
        expect(sheet.classList.contains('hami-field-tasks-sheet--snap')).toBe(false);
    });

    it('reveal لا يسلب نقر ستارة React المفتوحة مسبقاً', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-field-tasks-root', '');
        layer.setAttribute('data-interactive', 'true');
        layer.style.pointerEvents = 'auto';
        document.body.appendChild(layer);

        expect(revealFieldTasksWarmSheet()).toBe(true);
        expect(layer.getAttribute('data-interactive')).toBe('true');
        expect(layer.style.pointerEvents).toBe('auto');
        expect(layer.hasAttribute('inert')).toBe(false);
    });

    it('reveal يفك inert العالق إن كانت الستارة تفاعليّة مسبقاً', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-field-tasks-root', '');
        layer.setAttribute('data-interactive', 'true');
        layer.setAttribute('inert', '');
        layer.setAttribute('aria-hidden', 'true');
        layer.style.pointerEvents = 'none';
        document.body.appendChild(layer);

        expect(revealFieldTasksWarmSheet()).toBe(true);
        expect(layer.hasAttribute('inert')).toBe(false);
        expect(layer.style.pointerEvents).toBe('auto');
        expect(layer.hasAttribute('aria-hidden')).toBe(false);
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

    it('HTML البطاقة الفورية يطابق الزجاج والموقع والحتمي وإنهاء', () => {
        const html = buildFieldTasksInstantChromeCardsHtml([
            {
                id: 'f1',
                title: 'موعد حتمي',
                location: 'الرصافة',
                isFatalDeadline: true,
            },
        ]);
        expect(html).toContain('حتمي');
        expect(html).toContain('الرصافة');
        expect(html).toContain('إنهاء');
        expect(html).toContain('data-field-tasks-instant-complete="f1"');
        expect(html).toContain('border-rose-400/35');
    });

    it('يطلي قشرة الستارة فوراً عندما لا يوجد جذر دافئ', () => {
        expect(paintFieldTasksInstantChrome()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-field-tasks-open')).toBe('1');
        const chrome = document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID);
        expect(chrome).not.toBeNull();
        expect(chrome?.textContent).toContain('مهام اليوم الميدانية');
        expect(chrome?.textContent).toContain('إدارة جميع المهام');
        expect(isFieldTasksCloseSuppressed()).toBe(true);
    });

    it('يملأ القشرة من لقطة المهام دون انتظار مقطع الستارة', async () => {
        const { legalTaskStub } = await import('@/app/services/tasks/__tests__/legalTaskStub');
        const { publishQuantumTasksMetrics } = await import('@/app/utils/quantumTasksMetrics');
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const pinned = legalTaskStub({
            id: 'peek-1',
            title: 'جلسة محكمة الكرادة',
            location: 'محكمة الكرادة',
            pinnedToFieldCurtain: true,
            parsedDate: today,
        });
        publishQuantumTasksMetrics([pinned], [pinned]);

        expect(paintFieldTasksInstantChrome()).toBe(true);
        const chrome = document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID);
        expect(chrome?.textContent).toContain('جلسة محكمة الكرادة');
        expect(chrome?.textContent).toContain('1 مهمة');
        expect(chrome?.textContent).toContain('إنهاء');
        expect(chrome?.textContent).toContain('محكمة الكرادة');
        expect(chrome?.querySelector('[data-field-tasks-instant-complete="peek-1"]')).not.toBeNull();
        publishQuantumTasksMetrics([], []);
    });

    it('يكشف الجذر الدافئ ويزيل القشرة إن وُجدت الستارة', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-field-tasks-root', '');
        layer.className = 'hami-field-tasks-layer';
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'field-tasks-sheet');
        layer.appendChild(sheet);
        document.body.appendChild(layer);

        expect(paintFieldTasksInstantChrome()).toBe(true);
        expect(document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID)).toBeNull();
        expect(isFieldTasksForceVisible()).toBe(true);
        expect(layer.style.opacity).toBe('1');
        expect(sheet.classList.contains('translate-y-0')).toBe(true);
    });

    it('يعرض تلميح الفراغ عندما لا توجد مهام ولا عدّاد معلّق', async () => {
        const { publishQuantumTasksMetrics } = await import('@/app/utils/quantumTasksMetrics');
        publishQuantumTasksMetrics([], []);
        expect(paintFieldTasksInstantChrome()).toBe(true);
        const chrome = document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID);
        expect(chrome?.textContent).toContain('لا مهام ميدانية ظاهرة الآن');
    });

    it('إنهاء وإدارة من القشرة فورية أثناء كتم الشبح — الخلفية فقط تُكتم', async () => {
        const { legalTaskStub } = await import('@/app/services/tasks/__tests__/legalTaskStub');
        const { publishQuantumTasksMetrics } = await import('@/app/utils/quantumTasksMetrics');
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const pinned = legalTaskStub({
            id: 'peek-act',
            title: 'تبليغ',
            pinnedToFieldCurtain: true,
            parsedDate: today,
        });
        publishQuantumTasksMetrics([pinned], [pinned]);
        expect(paintFieldTasksInstantChrome()).toBe(true);
        expect(isFieldTasksCloseSuppressed()).toBe(true);

        const chrome = document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID);
        chrome
            ?.querySelector('[data-field-tasks-instant-complete="peek-act"]')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(drainFieldTasksInstantCompleteQueue()).toEqual(['peek-act']);

        chrome
            ?.querySelector('[data-field-tasks-instant-manage]')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(takeFieldTasksInstantManageQueued()).toBe(true);
        publishQuantumTasksMetrics([], []);
    });

    it('كتم الشبح يمنع إغلاق الخلفية ولا يمنع زر X', () => {
        const dismissed: string[] = [];
        const onDismiss = () => dismissed.push('dismiss');
        window.addEventListener(FIELD_TASKS_INSTANT_DISMISS_EVENT, onDismiss);
        expect(paintFieldTasksInstantChrome()).toBe(true);
        expect(isFieldTasksCloseSuppressed()).toBe(true);

        const chrome = document.getElementById(FIELD_TASKS_INSTANT_CHROME_ID);
        chrome
            ?.querySelector('[data-field-tasks-instant-backdrop]')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(dismissed).toEqual([]);

        chrome
            ?.querySelector('[data-testid="field-tasks-instant-close"]')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(dismissed).toEqual(['dismiss']);
        window.removeEventListener(FIELD_TASKS_INSTANT_DISMISS_EVENT, onDismiss);
    });
});
