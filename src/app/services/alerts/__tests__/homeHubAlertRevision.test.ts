import { describe, expect, it } from 'vitest';
import {
    secretaryAlertRevisionKey,
    secretaryAlertsRevisionEqual,
    alertsHubPayloadUnchanged,
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
        const list = [alert({ id: 'calendar:eq-1', dueAt: '2026-08-03T10:00:00.000Z' })];
        expect(secretaryAlertsRevisionEqual(list, [...list])).toBe(true);
    });

    it('يكتشف تغيّر العنوان أو الموعد لنفس المعرّف', () => {
        const a = [alert({ id: 'calendar:1', title: 'جلسة أ', dueAt: '2099-01-01T00:00:00.000Z' })];
        const b = [alert({ id: 'calendar:1', title: 'جلسة ب', dueAt: '2099-01-01T00:00:00.000Z' })];
        const c = [alert({ id: 'calendar:1', title: 'جلسة أ', dueAt: '2099-01-02T00:00:00.000Z' })];
        expect(secretaryAlertsRevisionEqual(a, b)).toBe(false);
        expect(secretaryAlertsRevisionEqual(a, c)).toBe(false);
    });
});

describe('alertsHubPayloadUnchanged', () => {
    it('لا يتخطّى دفعة تغيّر فيها الموعد مع بقاء المعرّف', () => {
        const prev = {
            loading: false,
            error: null,
            alerts: [alert({ id: 'calendar:1', dueAt: '2099-01-01T00:00:00.000Z' })],
        };
        const next = {
            loading: false,
            error: null,
            alerts: [alert({ id: 'calendar:1', dueAt: '2099-01-02T00:00:00.000Z' })],
        };
        expect(alertsHubPayloadUnchanged(prev, next)).toBe(false);
        expect(alertsHubPayloadUnchanged(prev, prev)).toBe(true);
    });
});
