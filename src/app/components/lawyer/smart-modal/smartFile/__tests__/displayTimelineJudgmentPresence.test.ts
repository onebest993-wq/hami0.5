import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { getDisplayTimelineFromStage } from '../stageInit';

describe('getDisplayTimelineFromStage — صفة الحكم', () => {
    it('يعيد كتابة الشكل: مختلط بأسماء الأطراف عند العرض', () => {
        const stage = {
            stageName: 'بداءة بدرجة أولى',
            parties: [
                { id: 1, name: 'أحمد', role: 'مدعي' },
                { id: 2, name: 'سامي كاظم', role: 'مدعى عليه' },
                { id: 3, name: 'كريم حسن', role: 'مدعى عليه' },
            ],
            partyJudgmentDispositions: [
                { partyId: '2', form: 'حضوري', operative: 'bound' },
                { partyId: '3', form: 'غيابي', operative: 'released' },
            ],
            timeline: [
                {
                    id: 'judgment_old',
                    type: 'decision',
                    date: '2026-08-04',
                    title: 'حكم بـ إجابة الدعوى بالكامل',
                    details:
                        'المنطوق: إجابة الدعوى بالكامل الشكل: مختلط النتيجة للموكل: كسبتم الدعوى — لا يحق لموكلك الطعن. تُقفل المرافعة بانتظار طعن الخصم. صدر الحكم وقُفلت المرافعة.',
                },
            ],
        } as CaseStage;

        const { displayTimeline } = getDisplayTimelineFromStage(stage);
        const details = String(displayTimeline[0]?.details ?? '');
        expect(details).not.toContain('مختلط');
        expect(details).not.toContain('النتيجة للموكل');
        expect(details).not.toContain('لا يحق لموكلك');
        expect(details).toContain('سامي كاظم — حضوري — إلزام');
        expect(details).toContain('كريم حسن — غيابي — رد');
    });
});
