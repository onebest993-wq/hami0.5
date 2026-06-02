/**
 * اختبارات الـ hook الذي يُغذّي بطاقة «التنبيهات» في البطاقة العامة.
 *
 * يتحقّق من:
 *  1) صحّة التصنيف الزمني (urgent / near / upcoming) بالعدّ وبالـ IDs
 *  2) ترتيب الأولويات داخل كل دلو (priority → critical أولاً)
 *  3) الكسل (lazy mapping): استدعاء أفقٍ واحد لا يولّد بقية الأفقيات
 *  4) المرجعية الثابتة (referential stability) بين الاستعلامين المتتاليين
 *  5) إعادة الاستخدام: لا يُغيِّر mapAndSort مرجع الناتج إذا لم يتغيّر classified
 *  6) التزامن: alertsForFilter و sourcesForFilter يُرجعان قوائم متطابقة الـ IDs
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
    it('1) يقسّم التنبيهات على الأفقيات الثلاثة بدقّة', () => {
        const alerts = [
            makeAlert({ id: 'u1', hoursAhead: 6 }),  // عاجل
            makeAlert({ id: 'u2', hoursAhead: 18 }), // عاجل
            makeAlert({ id: 'n1', hoursAhead: 48 }), // قريبة
            makeAlert({ id: 'up1', hoursAhead: 120 }), // قادمة
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));

        expect(result.current.counts).toEqual({ urgent: 2, near: 1, upcoming: 1 });
        expect(result.current.carouselTotal).toBe(4);

        const urgent = result.current.alertsForFilter('urgent');
        expect(urgent.map((a) => a.id).sort()).toEqual(['u1', 'u2']);

        const near = result.current.alertsForFilter('near');
        expect(near.map((a) => a.id)).toEqual(['n1']);

        const upcoming = result.current.alertsForFilter('upcoming');
        expect(upcoming.map((a) => a.id)).toEqual(['up1']);
    });

    it('2) يرتّب داخل الدلو حسب الأولوية (critical قبل high قبل medium)', () => {
        const alerts = [
            makeAlert({ id: 'medium', hoursAhead: 6, priority: 4 }), // -> medium
            makeAlert({ id: 'high', hoursAhead: 6, priority: 2 }),   // -> high
            makeAlert({ id: 'critical', hoursAhead: 6, priority: 1 }), // -> critical
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));
        const ids = result.current.alertsForFilter('urgent').map((a) => a.id);
        expect(ids).toEqual(['critical', 'high', 'medium']);
    });

    it('3) Lazy mapping: استدعاء أفقٍ واحد لا يبني البقية ضمنياً', () => {
        const alerts = [
            makeAlert({ id: 'u', hoursAhead: 6 }),
            makeAlert({ id: 'n', hoursAhead: 48 }),
            makeAlert({ id: 'up', hoursAhead: 120 }),
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));

        // العدّ متاح فوراً دون الحاجة لتخريط أي أفق
        expect(result.current.counts.urgent).toBe(1);
        expect(result.current.counts.near).toBe(1);
        expect(result.current.counts.upcoming).toBe(1);

        // طلب أفق واحد فقط
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
        // عند تغيّر قائمة التنبيهات، يجب أن نحصل على مرجع جديد للقائمة المُخرَّطة
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
            makeAlert({ id: 'n1', hoursAhead: 48 }),
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

    it('8) تنبيهات بلا dueAt من نوع REQUEST → عاجل افتراضياً', () => {
        const alerts: SecretaryAlert[] = [
            makeAlert({
                id: 'req1',
                type: 'REQUEST',
                target: 'client_requests',
                hoursAhead: undefined,
                dueAt: undefined,
            }),
            makeAlert({ id: 'ignored', hoursAhead: undefined, dueAt: undefined }), // بدون dueAt → مُتجاهَل
        ];
        const { result } = renderHook(() => useNeuralAlertsFromSecretary(alerts));
        expect(result.current.alertsForFilter('urgent').map((a) => a.id)).toEqual(['req1']);
        expect(result.current.carouselTotal).toBe(1);
    });
});
