import { describe, expect, it } from 'vitest';
import {
    buildExecutionArchiveAttentionNudge,
    scanExecutionArchiveForSpark,
} from '@/app/spark/engine/executionArchiveSparkScan';

describe('executionArchiveSparkScan', () => {
    it('يجد إضبارة واحدة بمهلة رضائية منتهية', () => {
        const files = [
            {
                id: 'e1',
                executionCaseNumber: 'EX-1/2026',
                dossier_lifecycle_status: 'active',
                debtors: [{ id: 'd1', name: 'مدين' }],
                execution_memo_anchor_date: '2020-01-01',
                notice_voluntary_period_end_declared: false,
            },
        ];
        const hits = scanExecutionArchiveForSpark(files);
        expect(hits).toHaveLength(1);
        expect(hits[0]?.nudge.kind).toBe('execution.voluntary_period_end');

        const summary = buildExecutionArchiveAttentionNudge(hits);
        expect(summary?.kind).toBe('execution.archive_attention_summary');
        expect(summary?.hitCount).toBe(1);
    });

    it('يتجاهل الإضابير المنتهية', () => {
        const hits = scanExecutionArchiveForSpark([
            {
                id: 'e2',
                dossier_lifecycle_status: 'finished',
                execution_memo_anchor_date: '2020-01-01',
            },
        ]);
        expect(hits).toHaveLength(0);
    });
});
