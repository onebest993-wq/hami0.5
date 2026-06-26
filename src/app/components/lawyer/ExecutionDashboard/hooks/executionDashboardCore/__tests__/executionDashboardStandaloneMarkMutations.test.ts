import { describe, expect, it } from 'vitest';
import {
    buildStandaloneExecutionMarkRow,
    buildStandaloneMarkDecisionPatch,
    buildStandaloneMarkSeizureRequestDetails,
} from '../executionDashboardStandaloneMarkMutations';

describe('executionDashboardStandaloneMarkMutations', () => {
    it('buildStandaloneExecutionMarkRow upserts by decision id', () => {
        const prev = [
            {
                id: 'mk_old',
                decisionRowId: 'd1',
                markType: 'تعميم',
                targetEntity: 'A',
                markDetails: 'x',
                letterDetails: '',
                isMarkConfirmed: false,
                status: 'active' as const,
                record_locked: false,
                archived_at_ymd: null,
            },
        ];
        const { nextRow, nextMarks } = buildStandaloneExecutionMarkRow(
            {
                decisionId: 'd1',
                markType: 'حجز',
                targetEntity: 'B',
                markDetails: 'y',
                letterDetails: 'كتاب',
            },
            prev,
            '2026-01-01T00:00:00.000Z',
        );
        expect(nextRow.id).toBe('mk_old');
        expect(nextRow.markType).toBe('حجز');
        expect(nextMarks).toHaveLength(1);
    });

    it('buildStandaloneMarkSeizureRequestDetails joins lines', () => {
        expect(
            buildStandaloneMarkSeizureRequestDetails('حجز', 'جهة', 'كتاب', 'تفاصيل'),
        ).toContain('النوع: حجز');
    });

    it('buildStandaloneMarkDecisionPatch serializes payload', () => {
        const patch = buildStandaloneMarkDecisionPatch(
            {
                id: 'mk1',
                decisionRowId: 'd1',
                markType: 'حجز',
                targetEntity: 'B',
                markDetails: 'y',
                letterDetails: '',
                isMarkConfirmed: false,
                status: 'active',
                record_locked: false,
                archived_at_ymd: null,
            },
            '2026-01-01T00:00:00.000Z',
        );
        expect(JSON.parse(patch.seizurePayloadJson).standaloneMarkId).toBe('mk1');
    });
});
