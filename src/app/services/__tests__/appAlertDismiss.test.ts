import { beforeEach, describe, expect, it } from 'vitest';
import {
    dismissAlertId,
    filterVisibleAlerts,
    getDismissedAlertIds,
} from '../appAlertDismiss';
import type { SecretaryAlert } from '../SecretaryOrchestrator';

function alert(id: string, priority = 2): SecretaryAlert {
    return {
        id,
        type: 'TASK',
        title: 't',
        summary: 's',
        aiDeepDive: 'd',
        target: 'schedule',
        priority,
    };
}

describe('appAlertDismiss', () => {
    beforeEach(() => localStorage.clear());

    it('يخفي المعرّفات المُهمَلة', () => {
        dismissAlertId('x1');
        const visible = filterVisibleAlerts([alert('x1'), alert('x2')]);
        expect(visible.map((a) => a.id)).toEqual(['x2']);
    });

    it('يرحّل المخزن القديم neural-alerts-dismissed', () => {
        localStorage.setItem('neural-alerts-dismissed', JSON.stringify(['legacy-1']));
        expect(getDismissedAlertIds()).toContain('legacy-1');
    });
});
