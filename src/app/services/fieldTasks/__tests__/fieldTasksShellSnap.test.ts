import { describe, expect, it, beforeEach } from 'vitest';
import {
    isFieldTasksShellSnappedOpen,
    isTasksManagerShellSnappedOpen,
    snapFieldTasksShellClose,
    snapFieldTasksShellOpen,
    snapTasksManagerShellClose,
    snapTasksManagerShellOpen,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';

describe('fieldTasksShellSnap', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-field-tasks-open');
        document.documentElement.removeAttribute('data-hami-tasks-manager-open');
        document.body.replaceChildren();
    });

    it('يضع علم الستارة حتى بلا جذر في DOM', () => {
        expect(snapFieldTasksShellOpen()).toBe(false);
        expect(isFieldTasksShellSnappedOpen()).toBe(true);
        expect(isTasksManagerShellSnappedOpen()).toBe(false);
    });

    it('يعيد true عند وجود سطح الستارة ويغلق الأجندة', () => {
        const root = document.createElement('div');
        root.setAttribute('data-field-tasks-root', '');
        document.body.appendChild(root);
        document.documentElement.setAttribute('data-hami-tasks-manager-open', '1');
        expect(snapFieldTasksShellOpen()).toBe(true);
        expect(isTasksManagerShellSnappedOpen()).toBe(false);
        snapFieldTasksShellClose();
        expect(isFieldTasksShellSnappedOpen()).toBe(false);
    });

    it('يضع علم الأجندة ويزيل علم الستارة', () => {
        const overlay = document.createElement('div');
        overlay.dataset.testid = 'tasks-manager-overlay';
        document.body.appendChild(overlay);
        snapFieldTasksShellOpen();
        expect(snapTasksManagerShellOpen()).toBe(true);
        expect(isFieldTasksShellSnappedOpen()).toBe(false);
        snapTasksManagerShellClose();
        expect(isTasksManagerShellSnappedOpen()).toBe(false);
    });
});
