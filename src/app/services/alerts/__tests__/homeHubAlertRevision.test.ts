import { describe, expect, it } from 'vitest';
import {
    secretaryAlertRevisionKey,
    secretaryAlertsRevisionEqual,
} from '@/app/services/alerts/homeHubAlertRevision';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

function alert(partial: Partial<SecretaryAlert> & { id: string }): SecretaryAlert {
    return {
        type: 'HEARING',
        priority: 2,
        summary: 'جلسة',
        target: 'lawsuit',
        ...partial,
    } as SecretaryAlert;
}

describe('homeHubAlertRevision', () => {
    it('يكتشف تغيّر الحقول وليس المعرّف فقط', () => {
        const a = [alert({ id: 'calendar:1', summary: 'أول' })];
        const b = [alert({ id: 'calendar:1', summary: 'ثانٍ' })];
        expect(secretaryAlertsRevisionEqual(a, b)).toBe(false);
        expect(secretaryAlertRevisionKey(a[0]!)).not.toBe(secretaryAlertRevisionKey(b[0]!));
    });

    it('يعتبر القائمتين متطابقتين عند نفس المحتوى', () => {
        const list = [alert({ id: 'request:1', dueAt: '2026-08-03T10:00:00.000Z' })];
        expect(secretaryAlertsRevisionEqual(list, [...list])).toBe(true);
    });
});
