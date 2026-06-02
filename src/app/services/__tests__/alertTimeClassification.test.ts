import { describe, expect, it } from 'vitest';
import {
    classifySecretaryAlertsByHorizon,
    horizonCounts,
    pickDefaultHorizonFilter,
} from '../alertTimeClassification';
import type { SecretaryAlert } from '../SecretaryOrchestrator';

function alertWithDueInHours(hours: number, id: string): SecretaryAlert {
    const dueAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    return {
        id,
        type: 'HEARING',
        title: 'موكل — 1',
        summary: 'محكمة — جلسة',
        dueAt,
        aiDeepDive: '',
        target: 'lawsuit',
        priority: 2,
    };
}

describe('classifySecretaryAlertsByHorizon', () => {
    it('يقسم إلى عاجل وقريبة وقادمة', () => {
        const now = new Date();
        const classified = classifySecretaryAlertsByHorizon(
            [
                alertWithDueInHours(6, 'u'),
                alertWithDueInHours(48, 'n'),
                alertWithDueInHours(120, 'up'),
                alertWithDueInHours(200, 'far'),
            ],
            now,
        );
        expect(classified.urgentAlerts.map((a) => a.id)).toEqual(['u']);
        expect(classified.nearAlerts.map((a) => a.id)).toEqual(['n']);
        expect(classified.upcomingAlerts.map((a) => a.id)).toEqual(['up']);
        expect(horizonCounts(classified)).toEqual({ urgent: 1, near: 1, upcoming: 1 });
    });

    it('يختار التبويب الافتراضي الأول غير الفارغ', () => {
        expect(pickDefaultHorizonFilter({ urgent: 0, near: 2, upcoming: 0 })).toBe('near');
        expect(pickDefaultHorizonFilter({ urgent: 0, near: 0, upcoming: 3 })).toBe('upcoming');
    });

    it('يقدّم المهمة المثبتة أولاً داخل التبويب', () => {
        const now = new Date('2026-05-24T12:00:00');
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const classified = classifySecretaryAlertsByHorizon(
            [
                {
                    id: 'field-task:b',
                    type: 'DEADLINE',
                    title: 'ب',
                    summary: 's',
                    dueAt: tomorrow.toISOString(),
                    aiDeepDive: '',
                    target: 'schedule',
                    priority: 3,
                    fieldTaskInjected: true,
                },
                {
                    id: 'field-task:a',
                    type: 'DEADLINE',
                    title: 'أ',
                    summary: 's',
                    dueAt: tomorrow.toISOString(),
                    aiDeepDive: '',
                    target: 'schedule',
                    priority: 3,
                    fieldTaskInjected: true,
                    fieldTaskPinned: true,
                },
            ],
            now,
        );
        expect(classified.urgentAlerts[0]?.id).toBe('field-task:a');
    });
});
