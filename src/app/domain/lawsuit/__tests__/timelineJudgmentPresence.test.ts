import { describe, expect, it } from 'vitest';
import {
    rewriteJudgmentTimelinePresenceText,
    rewriteTimelineEventsJudgmentPresence,
    resolveStageJudgmentPresenceLine,
} from '../timelineJudgmentPresence';

describe('timelineJudgmentPresence', () => {
    it('يستبدل الشكل: مختلط بنتائج الأطراف ويمسح تلميح الموكل', () => {
        const details =
            'المنطوق: إجابة الدعوى بالكامل\nالشكل: مختلط\nالنتيجة للموكل: كسبتم الدعوى';
        const out = rewriteJudgmentTimelinePresenceText(
            details,
            'سامي كاظم — حضوري — إلزام\nكريم حسن — غيابي — إلزام',
        );
        expect(out).not.toContain('مختلط');
        expect(out).not.toContain('النتيجة للموكل');
        expect(out).toContain('المنطوق: إجابة الدعوى بالكامل');
        expect(out).toContain('سامي كاظم — حضوري — إلزام');
        expect(out).toContain('كريم حسن — غيابي — إلزام');
    });

    it('يحذف كلمة مختلط وتلميح الموكل إن لم تُحفظ الصفات', () => {
        const details = 'المنطوق: إجابة الدعوى بالكامل\nالشكل: مختلط\nالنتيجة للموكل: كسبتم الدعوى';
        const out = rewriteJudgmentTimelinePresenceText(details, '');
        expect(out).not.toContain('مختلط');
        expect(out).not.toContain('النتيجة للموكل');
        expect(out).toContain('المنطوق:');
    });

    it('يعيد كتابة أحداث السجل من صفات المرحلة أو البطاقات', () => {
        const events = [
            {
                id: '1',
                title: 'حكم بـ إجابة الدعوى بالكامل (مختلط)',
                details: 'الشكل: مختلط',
            },
        ];
        const rewritten = rewriteTimelineEventsJudgmentPresence(
            events,
            'سامي — حضوري — إلزام\nكريم — غيابي — إلزام',
        );
        expect(rewritten[0]?.title).not.toContain('مختلط');
        expect(rewritten[0]?.details).toContain('سامي — حضوري — إلزام');
        expect(rewritten[0]?.details).not.toContain('مختلط');
    });

    it('يلخّص النتيجة من dispositions مع إلزام/رد', () => {
        expect(
            resolveStageJudgmentPresenceLine({
                parties: [
                    { id: 2, name: 'سامي' },
                    { id: 3, name: 'كريم' },
                ],
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري', operative: 'bound' },
                    { partyId: '3', form: 'غيابي', operative: 'released' },
                ],
            }),
        ).toBe('سامي — حضوري — إلزام\nكريم — غيابي — رد');
    });

    it('يلخّص الصفة من البطاقات إن غابت dispositions', () => {
        expect(
            resolveStageJudgmentPresenceLine({
                parties: [
                    { id: 2, name: 'سامي' },
                    { id: 3, name: 'كريم' },
                ],
                partyChallengeLanes: [
                    { partyId: '2', disposition: 'حضوري' },
                    { partyId: '3', disposition: 'غيابي' },
                ],
            }),
        ).toBe('سامي حضوري — كريم غيابي');
    });
});
