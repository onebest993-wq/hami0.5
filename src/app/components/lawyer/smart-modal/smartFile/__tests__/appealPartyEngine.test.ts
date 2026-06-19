import { describe, expect, it } from 'vitest';
import type { Party } from '../../../LawyerShared';
import {
    buildAppealStageParties,
    defaultIncludedOpponentIds,
    filterPartiesBeforeAppealFlip,
    listOpponentPartiesForAppeal,
    partyBelongsToAppealSide,
    repairAppealStagePartyRoles,
    resolveOpponentRegistrationAppealLayout,
    resolveAppellantLegalSideFromSelection,
    resolveAppealPartyPickerVisibility,
    filterVisibleAppellantParties,
    filterVisibleOpponentParties,
} from '../appealPartyEngine';
import type { CaseStage } from '../../../LawyerShared';

const multiParties: Party[] = [
    { id: 1, name: 'المدعي أ', role: 'المدعي', isClient: true, side: 'right' },
    { id: 2, name: 'مدعى عليه ١', role: 'المدعى عليه', isClient: false, side: 'left' },
    { id: 3, name: 'مدعى عليه ٢', role: 'المدعى عليه الثاني', isClient: false, side: 'left' },
    {
        id: 4,
        name: 'خالد',
        role: 'شخص ثالث',
        isClient: false,
        side: 'left',
    },
];

const affiliativeIncidental = [
    {
        id: 'inc_tp',
        type: 'thirdParty' as const,
        partyName: 'خالد',
        date: '2026-01-01',
        status: 'active' as const,
        thirdPartyEntryMode: 'affiliative' as const,
        affiliationSide: 'defendant' as const,
    },
];

describe('appealPartyEngine', () => {
    it('lists all defendant-side opponents when plaintiff appeals', () => {
        const opponents = listOpponentPartiesForAppeal(multiParties, 'المدعي', affiliativeIncidental);
        expect(opponents.map((p) => p.name)).toEqual(['مدعى عليه ١', 'مدعى عليه ٢', 'خالد']);
    });

    it('treats affiliative third party as defendant side', () => {
        expect(
            partyBelongsToAppealSide(multiParties[3]!, 'المدعى عليه', affiliativeIncidental),
        ).toBe(true);
        expect(
            partyBelongsToAppealSide(multiParties[3]!, 'المدعي', affiliativeIncidental),
        ).toBe(false);
    });

    it('excludes deselected opponents from appeal dossier', () => {
        const filtered = filterPartiesBeforeAppealFlip(
            multiParties,
            'المدعي',
            affiliativeIncidental,
            [2],
        );
        expect(filtered.map((p) => p.name)).toEqual(['المدعي أ', 'مدعى عليه ١']);
    });

    it('defaults to all opponents selected', () => {
        const ids = defaultIncludedOpponentIds(multiParties, 'المدعي', affiliativeIncidental);
        expect(ids).toEqual([2, 3, 4]);
    });

    it('flips roles after filtering opponents', () => {
        const flipped = buildAppealStageParties(
            multiParties,
            'المدعي',
            'استئناف',
            affiliativeIncidental,
            [2],
        );
        expect(flipped).toHaveLength(2);
        expect(flipped[0]?.role).toContain('المستأنف');
        expect(flipped[1]?.role).toContain('المستأنف عليه');
    });

    it('excludes deselected appellants when multiple plaintiffs appeal', () => {
        const twoPlaintiffs: Party[] = [
            { id: 1, name: 'مدعي أ', role: 'المدعي', side: 'right' },
            { id: 5, name: 'مدعي ب', role: 'المدعي الثاني', side: 'right' },
            { id: 2, name: 'مدعى عليه', role: 'المدعى عليه', side: 'left' },
        ];
        const filtered = filterPartiesBeforeAppealFlip(
            twoPlaintiffs,
            'المدعي',
            undefined,
            [2],
            [1],
        );
        expect(filtered.map((p) => p.name)).toEqual(['مدعي أ', 'مدعى عليه', 'مدعي ب']);
    });

    it('accepts string party ids from legacy appeal modals', () => {
        const filtered = filterPartiesBeforeAppealFlip(
            multiParties,
            'المدعي',
            affiliativeIncidental,
            ['2'],
            ['1'],
        );
        expect(filtered.map((p) => p.name)).toEqual(['المدعي أ', 'مدعى عليه ١']);
    });

    it('hides party pickers for simple one-plaintiff one-defendant opponent registration', () => {
        const bilateral: Party[] = [
            { id: 1, name: 'المدعي', role: 'المدعي', isClient: true, side: 'right' },
            { id: 2, name: 'المدعى عليه', role: 'المدعى عليه', isClient: false, side: 'left' },
        ];
        const layout = resolveOpponentRegistrationAppealLayout(bilateral, 'المدعي');
        const visibleApp = filterVisibleAppellantParties(layout.appellantParties, layout.defaultOpponentIds);
        const visibleOpp = filterVisibleOpponentParties(layout.opponentParties, layout.defaultAppellantIds);
        expect(
            resolveAppealPartyPickerVisibility({
                dossierLayout: layout,
                visibleAppellantParties: visibleApp,
                visibleOpponentParties: visibleOpp,
                parties: bilateral,
            }),
        ).toEqual({ showAppellantPicker: false, showOpponentPicker: false });
    });

    it('shows appellant picker when multiple defendants appeal without third party', () => {
        const twoDefendants: Party[] = [
            { id: 1, name: 'المدعي', role: 'المدعي', isClient: true, side: 'right' },
            { id: 2, name: 'مدعى عليه ١', role: 'المدعى عليه', side: 'left' },
            { id: 3, name: 'مدعى عليه ٢', role: 'المدعى عليه الثاني', side: 'left' },
        ];
        const layout = resolveOpponentRegistrationAppealLayout(twoDefendants, 'المدعي');
        const visibleApp = filterVisibleAppellantParties(layout.appellantParties, layout.defaultOpponentIds);
        const visibleOpp = filterVisibleOpponentParties(layout.opponentParties, layout.defaultAppellantIds);
        expect(
            resolveAppealPartyPickerVisibility({
                dossierLayout: layout,
                visibleAppellantParties: visibleApp,
                visibleOpponentParties: visibleOpp,
                parties: twoDefendants,
            }),
        ).toEqual({ showAppellantPicker: true, showOpponentPicker: false });
    });

    it('shows pickers when interpleader third party exists', () => {
        const withInterpleader: Party[] = [
            { id: 1, name: 'المدعي أ', role: 'المدعي', isClient: true, side: 'right' },
            { id: 2, name: 'مدعى عليه', role: 'المدعى عليه', isClient: false, side: 'left' },
            { id: 5, name: 'اختصام', role: 'شخص ثالث (اختصامي)', isClient: false },
        ];
        const layout = resolveOpponentRegistrationAppealLayout(withInterpleader, 'المدعي');
        expect(layout.appellantParties.map((p) => p.name)).toEqual(['مدعى عليه', 'اختصام']);
        expect(layout.opponentParties.map((p) => p.name)).toEqual(['المدعي أ', 'اختصام']);
        expect(layout.defaultAppellantIds).toEqual([2, 5]);
        expect(layout.defaultOpponentIds).toEqual([1]);
        expect(layout.appellantSideLabel).toBe('الطرف الذي قام بالطعن');
    });

    it('hides interpleader from appellant list when selected as opponent', () => {
        const interpleader: Party = {
            id: 5,
            name: 'اختصام',
            role: 'شخص ثالث (اختصامي)',
            isClient: false,
        };
        const appellants = [{ id: 2, name: 'مدعى', role: 'المدعى عليه' }, interpleader];
        expect(filterVisibleAppellantParties(appellants, [5]).map((p) => p.id)).toEqual([2]);
        expect(filterVisibleOpponentParties([interpleader], [5]).map((p) => p.id)).toEqual([]);
        expect(filterVisibleOpponentParties([interpleader], []).map((p) => p.id)).toEqual([5]);
    });

    it('uses interpleader legal side when only interpleader selected as appellant', () => {
        const interpleader: Party = {
            id: 5,
            name: 'اختصام',
            role: 'شخص ثالث (اختصامي)',
            isClient: false,
        };
        expect(
            resolveAppellantLegalSideFromSelection([5], [interpleader], 'المدعى عليه'),
        ).toBe('الشخص الثالث الاختصامي');
    });

    it('flips interpleader to المستأنف when selected as sole appellant in opponent registration', () => {
        const withInterpleader: Party[] = [
            { id: 1, name: 'المدعي أ', role: 'المدعي', isClient: true, side: 'right' },
            { id: 2, name: 'مدعى عليه', role: 'المدعى عليه', isClient: false, side: 'left' },
            { id: 5, name: 'اختصام', role: 'شخص ثالث (اختصامي)', isClient: false },
        ];
        const layout = resolveOpponentRegistrationAppealLayout(withInterpleader, 'المدعي');
        const flipped = buildAppealStageParties(
            withInterpleader,
            'الشخص الثالث الاختصامي',
            'استئناف',
            undefined,
            [1, 2],
            [5],
            layout,
        );
        const interpleaderParty = flipped.find((p) => p.id === 5);
        const client = flipped.find((p) => p.id === 1);
        const defendant = flipped.find((p) => p.id === 2);
        expect(interpleaderParty?.role).toContain('المستأنف');
        expect(interpleaderParty?.role).not.toContain('المستأنف عليه');
        expect(interpleaderParty?.side).toBe('right');
        expect(client?.role).toContain('المستأنف عليه');
        expect(defendant?.role).toContain('المستأنف عليه');
    });

    it('flips interpleader to المستأنف عليه when selected as opponent only', () => {
        const withInterpleader: Party[] = [
            { id: 1, name: 'المدعي أ', role: 'المدعي', isClient: true, side: 'right' },
            { id: 2, name: 'مدعى عليه', role: 'المدعى عليه', isClient: false, side: 'left' },
            { id: 5, name: 'اختصام', role: 'شخص ثالث (اختصامي)', isClient: false },
        ];
        const layout = resolveOpponentRegistrationAppealLayout(withInterpleader, 'المدعي');
        const flipped = buildAppealStageParties(
            withInterpleader,
            'المدعى عليه',
            'استئناف',
            undefined,
            [1, 5],
            [2],
            layout,
        );
        const interpleaderParty = flipped.find((p) => p.id === 5);
        expect(interpleaderParty?.role).toContain('المستأنف عليه');
        expect(interpleaderParty?.side).toBe('left');
    });

    it('keeps interpleader appellant when repairing legacy appeal stage parties', () => {
        const repaired = repairAppealStagePartyRoles(
            [{ id: 5, name: 'اختصام', role: 'شخص ثالث (اختصامي)', isClient: false }],
            {
                stageName: 'الاستئناف',
                appealMetadata: {
                    appealType: 'استئناف',
                    appellant: 'الشخص الثالث الاختصامي',
                    filingDate: '2026-01-01',
                    initialAppellantPartyIds: [5],
                },
            } as CaseStage,
        );
        expect(repaired[0]?.role).toContain('المستأنف');
        expect(repaired[0]?.side).toBe('right');
    });
});
