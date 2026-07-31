import { describe, expect, it } from 'vitest';
import {
    getGoverningDossierPresentationRowFromRows,
    getGoverningPersonalCoerciveSubtypeRowFromRows,
    getGoverningSeizureDecisionBySubtypeFromRows,
    hasActivePersonalCoerciveSubtypeCardFromRows,
    isExecutorHubRowInactiveForGoverning,
} from '@/app/utils/executorRequestGoverningSelectors';

describe('executorRequestGoverningSelectors', () => {
    it('ignores archived approved forced bring rows in governing coercive selection', () => {
        const rows = [
            {
                id: 'coercive_archived',
                requestKind: 'personal_coercive',
                personalCoerciveSubtype: 'forced_bring_in',
                executorOutcome: 'approved',
                isArchived: true,
                date: '2026-07-11',
            },
        ];

        expect(getGoverningPersonalCoerciveSubtypeRowFromRows(rows, 'forced_bring_in')).toBeNull();
        expect(hasActivePersonalCoerciveSubtypeCardFromRows(rows, 'forced_bring_in')).toBe(false);
    });

    it('closes dossier presentation governing row after explicit close', () => {
        const row = {
            id: 'dossier_closed',
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'executive_dossier_presentation',
            executorOutcome: 'approved',
            dossierPresentationClosed: true,
            date: '2026-07-11',
        } as const;

        expect(isExecutorHubRowInactiveForGoverning(row, [row])).toBe(true);
        expect(getGoverningDossierPresentationRowFromRows([row])).toBeNull();
    });

    it('returns pending seizure row as governing and hides superseded one', () => {
        const rows = [
            {
                id: 'seizure_old',
                requestKind: 'seizure',
                seizureSubtype: 'third_party',
                executorOutcome: 'approved',
                requestCycleSuperseded: true,
                date: '2026-07-10',
            },
            {
                id: 'seizure_pending',
                requestKind: 'seizure',
                seizureSubtype: 'third_party',
                executorOutcome: 'pending',
                date: '2026-07-11',
            },
        ];

        expect(getGoverningSeizureDecisionBySubtypeFromRows(rows, 'third_party')?.id).toBe(
            'seizure_pending',
        );
    });
});
