/**
 * `calendarEventToTimestamp` يَعِد صراحةً (في رأس `calendarDateTime.ts`) بأنّ
 * «لاعبَين على جهازين بمنطقتين زمنيتين مختلفتين يحسبان نفس بداية ونهاية الحدث» —
 * فالمدخلات تُفسَّر بـ**Asia/Baghdad** لا بساعة الجهاز.
 *
 * وكان هذا الملفّ يقيس بـ`getHours()` — أي بساعة الجهاز — فيصدق على جهازٍ عند +03:00
 * ويكذب على غيره. أي أنّه كان **يُثبت نقيض العقد الذي وُضع ليحرسه**: لو عاد المنتج
 * غداً إلى التوقيت المحلّي لبقي أخضر على جهاز المطوّر.
 *
 * فالقياس الآن باللحظة المطلقة وبالساعة كما تُقرأ **في بغداد** — ولا شيء منهما يتغيّر
 * بتغيّر جهاز التشغيل.
 */
import { describe, expect, it } from 'vitest';
import { calendarEventToTimestamp } from '../calendarDateTime';

const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

/** الساعة والدقيقة كما تُقرأ في بغداد، أياً كانت ساعة الجهاز. */
function baghdadParts(ts: number): { ymd: string; hm: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(ts));
    const at = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return {
        ymd: `${at('year')}-${at('month')}-${at('day')}`,
        hm: `${at('hour')}:${at('minute')}`,
    };
}

describe('calendarDateTime', () => {
    it('يعامل YYYY-MM-DD بدون وقت كنهاية اليوم بتوقيت بغداد', () => {
        const ts = calendarEventToTimestamp('2026-05-20', undefined, 'end');
        expect(ts).not.toBeNull();

        // اللحظة المطلقة: 23:59:59.999 بغداد = 20:59:59.999 UTC
        expect(ts).toBe(Date.UTC(2026, 4, 20, 23, 59, 59, 999) - BAGHDAD_OFFSET_MS);

        const { ymd, hm } = baghdadParts(ts!);
        expect(ymd).toBe('2026-05-20');
        expect(hm).toBe('23:59');
    });

    it('يحلل التاريخ مع وقت بتوقيت بغداد', () => {
        const ts = calendarEventToTimestamp('2026-05-20', '14:30', 'start');
        expect(ts).not.toBeNull();

        expect(ts).toBe(Date.UTC(2026, 4, 20, 14, 30, 0, 0) - BAGHDAD_OFFSET_MS);

        const { ymd, hm } = baghdadParts(ts!);
        expect(ymd).toBe('2026-05-20');
        expect(hm).toBe('14:30');
    });

    /**
     * وحدٌّ يُقال بصراحة بدل أن يُفترض: **على جهازٍ عند +03:00 لا يُميّز أيُّ اختبارٍ
     * بين التفسيرين**، لأنّ بغداد وساعةَ الجهاز تتطابقان هناك تماماً.
     *
     * قيس بكسر المنتج عمداً إلى `new Date(...)` المحلّي: الثلاثة تسقط على `TZ=UTC`
     * وتبقى **خضراء** على الساعة المحلّية. فحارسُ هذه الخاصّية هو العدّاء لا جهاز
     * المطوّر — وما أصلحه هذا الملفّ أنّ الاختبار صار يقيس **العقد** (لحظةٌ مطلقة +
     * ساعةُ بغداد) بدل أن يقيس ما يعرضه الجهاز، فيصحّ في كلّ منطقة بدل أن يصحّ في واحدة.
     */
    it('اللحظة لا تتغيّر بتغيّر ساعة الجهاز — الفرق عن UTC ثابتٌ ثلاث ساعات', () => {
        const ts = calendarEventToTimestamp('2026-01-15', '08:00', 'start');
        expect(ts).not.toBeNull();
        const asUtcWallClock = Date.UTC(2026, 0, 15, 8, 0, 0, 0);
        expect(asUtcWallClock - ts!).toBe(BAGHDAD_OFFSET_MS);
    });
});
