import { describe, expect, it } from 'vitest';
import {
    INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
    INTERPLEADER_JUDGMENT_THIRD_FULL,
    INTERPLEADER_JUDGMENT_THIRD_PARTIAL,
} from '../interpleaderJudgmentEngine';
import {
    isInterpleaderRequestAnswered,
    isInterpleaderRequestDismissed,
    resolveAppealDossierLayout,
    resolveAppealDossierMode,
} from '../interpleaderAppealEngine';

const parties = [
    { id: 1, name: 'مدعي', role: 'المدعي', isClient: false },
    { id: 2, name: 'مدعى', role: 'المدعى عليه', isClient: false },
    { id: 3, name: 'ثالث', role: 'شخص ثالث (اختصامي)', isClient: true },
];

describe('interpleaderAppealEngine', () => {
    it('detects answered vs dismissed third party request', () => {
        expect(isInterpleaderRequestAnswered(INTERPLEADER_JUDGMENT_THIRD_FULL)).toBe(true);
        expect(isInterpleaderRequestAnswered(INTERPLEADER_JUDGMENT_THIRD_PARTIAL)).toBe(true);
        expect(isInterpleaderRequestDismissed(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL)).toBe(true);
        expect(isInterpleaderRequestDismissed(INTERPLEADER_JUDGMENT_THIRD_FULL)).toBe(false);
    });

    it('uses interpleader_appellant mode when client marker is on interpleader after dismissal', () => {
        expect(
            resolveAppealDossierMode(INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, parties),
        ).toBe('interpleader_appellant');
    });

    it('uses against_interpleader when client marker is on main party after third party win', () => {
        const plaintiffClient = [
            { id: 1, name: 'مدعي', role: 'المدعي', isClient: true },
            { id: 2, name: 'مدعى', role: 'المدعى عليه', isClient: false },
            { id: 3, name: 'ثالث', role: 'شخص ثالث (اختصامي)', isClient: false },
        ];
        expect(
            resolveAppealDossierMode(INTERPLEADER_JUDGMENT_THIRD_FULL, plaintiffClient),
        ).toBe('against_interpleader');
    });

    it('ignores representedParty when isClient marker differs', () => {
        const layout = resolveAppealDossierLayout(parties, {
            judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            representedParty: 'المدعى عليه',
            standardAppellantSide: 'المدعي',
        });
        expect(layout.mode).toBe('interpleader_appellant');
        expect(layout.appellantParties.map((p) => p.name)).toEqual(['ثالث']);
    });

    it('lists interpleader as opponent when plaintiff appeals third party win', () => {
        const layout = resolveAppealDossierLayout(
            [{ id: 1, name: 'مدعي', role: 'المدعي', isClient: true }, ...parties.slice(1)],
            {
                judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL,
                representedParty: 'المدعي',
                standardAppellantSide: 'المدعي',
            },
        );
        expect(layout.mode).toBe('against_interpleader');
        expect(layout.appellantParties.map((p) => p.name)).toEqual(['مدعي']);
        expect(layout.opponentParties.map((p) => p.name)).toEqual(['ثالث']);
    });
});
