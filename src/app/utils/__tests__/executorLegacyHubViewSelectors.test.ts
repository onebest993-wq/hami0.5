import { describe, expect, it } from 'vitest';
import {
    getLatestSeizureDecisionBySubtypeFromRows,
    listGuarantorHubRowsFromRows,
    listSeizureHubRowsFromRows,
    readSeizureRequestTargetFromRow,
} from '@/app/utils/executorLegacyHubViewSelectors';

describe('executorLegacyHubViewSelectors', () => {
    it('reads guarantor seizure target from payload and fallback text', () => {
        expect(
            readSeizureRequestTargetFromRow({
                seizurePayloadJson: JSON.stringify({ seizureTarget: 'guarantor' }),
            }),
        ).toBe('guarantor');

        expect(
            readSeizureRequestTargetFromRow({
                title: 'طلب حجز أموال الكفيل',
                body: 'الكفيل الضامن',
            }),
        ).toBe('guarantor');
    });

    it('returns latest seizure row by subtype using resolvedAt/date recency', () => {
        const latest = getLatestSeizureDecisionBySubtypeFromRows(
            [
                {
                    id: 'old_row',
                    requestKind: 'seizure',
                    seizureSubtype: 'salary',
                    date: '2026-07-10',
                },
                {
                    id: 'new_row',
                    requestKind: 'seizure',
                    seizureSubtype: 'salary',
                    resolvedAt: '2026-07-11T10:00:00.000Z',
                    date: '2026-07-11',
                },
            ],
            'salary',
        );

        expect(latest?.id).toBe('new_row');
    });

    it('lists only hub rows for seizure and guarantor requests', () => {
        const rows = [
            {
                id: 'seizure_hub',
                requestKind: 'seizure',
                seizureSubtype: 'third_party',
                date: '2026-07-11',
            },
            {
                id: 'seizure_appeal',
                requestKind: 'seizure',
                seizureSubtype: 'third_party',
                appealSourceDecisionId: 'origin',
                date: '2026-07-12',
            },
            {
                id: 'guarantor_hub',
                requestKind: 'guarantor_request',
                date: '2026-07-11',
            },
        ];

        expect(listSeizureHubRowsFromRows(rows, 'third_party').map((row) => row.id)).toEqual([
            'seizure_hub',
        ]);
        expect(listGuarantorHubRowsFromRows(rows).map((row) => row.id)).toEqual([
            'guarantor_hub',
        ]);
    });
});
