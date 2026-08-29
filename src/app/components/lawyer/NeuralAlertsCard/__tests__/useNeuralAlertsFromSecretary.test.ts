/**
 * اختبارات الـ hook الذي يُغذّي بطاقة «التنبيهات» في البطاقة العامة.
 *
 * نموذج التصنيف الحالي (طبقتان فعليتان):
 *  - urgent: خلال ٤٨ ساعة أو اليوم/غداً (أيام)
 *  - upcoming: ما بعد ٤٨ ساعة ولغاية ٩٦ ساعة (أو ٢–٤ أيام)
 *  - near: دلو تراثي فارغ — `alertsForFilter('near')` يُعاد توجيهه إلى upcoming للتوافق
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useNeuralAlertsFromSecretary } from '../useNeuralAlertsFromSecretary';

function makeAlert(
    overrides: Partial<SecretaryAlert> & { id: string; hoursAhead?: number },
): SecretaryAlert {
    const { hoursAhead, ...rest } = overrides;
    const dueAt = hoursAhead != null
        ? new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString()
        : undefined;
    return {
        id: overrides.id,
        type: 'HEARING',
        title: `موكل — ${overrides.id}`,
        summary: 'محكمة — جلسة',
        dueAt,
        aiDeepDive: '',
        target: 'lawsuit',
        priority: 2,
        ...rest,
    };
}

describe('useNeuralAlertsFromSecretary', () => {
    it('1) يقسّم التنبيهات على العاجل والقادم بدقّة', () => {
        const alerts = [
            makeAlert({ id: 'u1', hoursAhead: 6 }),
            makeAlert({ id: 'u2', hoursAhead: 18 }),
            makeAlert({ id: 'up1', hoursAhead: 72 }),
            makeAlert({ id: 'up2', hoursAhead: 90 }),
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));

        expect(result.current.counts).toEqual({ urgent: 2, near: 0, upcoming: 2 });
        expect(result.current.carouselTotal).toBe(4);

        expect(result.current.alertsForFilter('urgent').map((a) => a.id).sort()).toEqual(['u1', 'u2']);
        expect(result.current.alertsForFilter('upcoming').map((a) => a.id).sort()).toEqual(['up1', 'up2']);
        expect(result.current.alertsForFilter('near').map((a) => a.id).sort()).toEqual(['up1', 'up2']);
    });

    it('2) يرتّب داخل الدلو حسب الأولوية (critical قبل high قبل medium)', () => {
        const alerts = [
            makeAlert({ id: 'medium', hoursAhead: 6, priority: 4 }),
            makeAlert({ id: 'high', hoursAhead: 6, priority: 2 }),
            makeAlert({ id: 'critical', hoursAhead: 6, priority: 1 }),
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));
        const ids = result.current.alertsForFilter('urgent').map((a) => a.id);
        expect(ids).toEqual(['critical', 'high', 'medium']);
    });

    it('3) Lazy mapping: استدعاء أفقٍ واحد لا يبني البقية ضمنياً', () => {
        const alerts = [
            makeAlert({ id: 'u', hoursAhead: 6 }),
            makeAlert({ id: 'up', hoursAhead: 72 }),
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));

        expect(result.current.counts).toEqual({ urgent: 1, near: 0, upcoming: 1 });

        const urgent = result.current.alertsForFilter('urgent');
        expect(urgent).toHaveLength(1);
        expect(urgent[0]!.id).toBe('u');
    });

    it('4) المرجعية الثابتة: استدعاء alertsForFilter مرتين بنفس المفتاح يُرجِع نفس المرجع', () => {
        const alerts = [makeAlert({ id: 'a', hoursAhead: 6 })];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));
        const first = result.current.alertsForFilter('urgent');
        const second = result.current.alertsForFilter('urgent');
        expect(second).toBe(first);
    });

    it('5) إعادة التهيئة عند تغيّر مرجع classified (إعادة تخريط)', () => {
        const alertsA = [makeAlert({ id: 'a', hoursAhead: 6 })];
        const alertsB = [makeAlert({ id: 'b', hoursAhead: 6 })];

        const { result, rerender } = renderHook(
            ({ list }) => useNeuralAlertsFromSecretary(list),
            { initialProps: { list: alertsA } },
        );
        const first = result.current.alertsForFilter('urgent');
        expect(first.map((x) => x.id)).toEqual(['a']);

        rerender({ list: alertsB });
        const second = result.current.alertsForFilter('urgent');
        expect(second.map((x) => x.id)).toEqual(['b']);
        expect(second).not.toBe(first);
    });

    it('6) sourcesForFilter يُطابق alertsForFilter في الـ IDs (لا تنبيه دون مصدر)', () => {
        const alerts = [
            makeAlert({ id: 'u1', hoursAhead: 6 }),
            makeAlert({ id: 'up1', hoursAhead: 72 }),
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));

        for (const filter of ['urgent', 'near', 'upcoming'] as const) {
            const a = result.current.alertsForFilter(filter).map((x) => x.id).sort();
            const s = result.current.sourcesForFilter(filter).map((x) => x.id).sort();
            expect(s).toEqual(a);
        }
    });

    it('7) قائمة فارغة: لا أعطال + carouselTotal = 0', () => {
        const { result } = renderHook(() => useNeuralAlertsFromSecretary([]));
        expect(result.current.carouselTotal).toBe(0);
        expect(result.current.counts).toEqual({ urgent: 0, near: 0, upcoming: 0 });
        expect(result.current.alertsForFilter('urgent')).toEqual([]);
        expect(result.current.sourcesForFilter('urgent')).toEqual([]);
    });

    it('8) تنبيهات بلا dueAt لا تُصنَّف عاجلاً افتراضياً', () => {
        const alerts: SecretaryAlert[] = [
            makeAlert({
                id: 'req1',
                type: 'TASK',
                target: 'notepad',
                hoursAhead: undefined,
                dueAt: undefined,
            }),
            makeAlert({ id: 'ignored', hoursAhead: undefined, dueAt: undefined }),
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));
        expect(result.current.alertsForFilter('urgent').map((a) => a.id)).toEqual([]);
        expect(result.current.carouselTotal).toBe(0);
    });
});
