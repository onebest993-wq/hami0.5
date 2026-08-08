import { describe, expect, it } from 'vitest';
import { resolveCriminalMandatoryCassationFromRecord } from '@/app/spark/context/resolveCriminalMandatoryCassation';
import { buildCriminalSparkContextFromArchiveRecord } from '@/app/spark/context/criminalSparkContext';
import { pickActiveCriminalSparkNudge } from '@/app/spark/engine/sparkCriminalEngine';

describe('resolveCriminalMandatoryCassationFromRecord', () => {
    it('يكتشف حكم إعدام يستوجب تمييزاً إلزامياً', () => {
        const record = {
            id: 'crim-death',
            finalDecision: { decisionType: 'conviction', punishmentType: 'death' },
            isSentToCassation: false,
            verdictCards: [],
            basics: { caseNumber: 'CR-1/2026' },
        };

        expect(resolveCriminalMandatoryCassationFromRecord(record)).toBe(true);

        const ctx = buildCriminalSparkContextFromArchiveRecord(record);
        expect(pickActiveCriminalSparkNudge(ctx!)?.kind).toBe('criminal.mandatory_cassation');
    });

    it('يتجاهل الإحالة المسجّلة للتمييز', () => {
        const record = {
            id: 'crim-sent',
            finalDecision: { decisionType: 'conviction', punishmentType: 'life' },
            isSentToCassation: true,
            verdictCards: [],
            basics: { caseNumber: 'CR-2/2026' },
        };

        expect(resolveCriminalMandatoryCassationFromRecord(record)).toBe(false);
    });
});
