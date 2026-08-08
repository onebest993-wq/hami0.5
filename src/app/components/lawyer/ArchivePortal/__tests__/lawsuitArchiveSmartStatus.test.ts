import { describe, expect, it } from 'vitest';
import { computeLawsuitSmartStatus } from '../lawsuitArchiveSmartStatus';

describe('computeLawsuitSmartStatus', () => {
    it('marks voided dossiers as مبطلة not مستمرة', () => {
        const status = computeLawsuitSmartStatus({
            status: 'مبطلة',
            stages: [
                {
                    stageName: 'البداءة',
                    isVoided: true,
                    finalDecision: 'مبطلة — ترك للمراجعة للمرة الثانية',
                    status: 'voided',
                },
            ],
            activeStageIndex: 0,
        });
        expect(status.label).toBe('مبطلة');
        expect(status.type).toBe('annulled');
    });

    it('detects paused and interrupted statuses', () => {
        expect(computeLawsuitSmartStatus({ status: 'مستأخرة', stages: [] }).label).toBe('مستأخرة');
        expect(computeLawsuitSmartStatus({ status: 'منقطعة', stages: [] }).label).toBe('منقطعة');
    });

    it('marks finalized dossiers as انتهت with full legal title', () => {
        const status = computeLawsuitSmartStatus({
            status: 'نشطة',
            stages: [
                {
                    stageName: 'تصحيح قرار',
                    finalDecision: 'مكتسبة الدرجة القطعية',
                    status: 'completed',
                },
            ],
            activeStageIndex: 0,
        });
        expect(status.label).toBe('انتهت');
        expect(status.title).toBe('مكتسبة الدرجة القطعية');
        expect(status.type).toBe('final');
    });
});
