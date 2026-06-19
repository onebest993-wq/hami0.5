import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import { resolveDisplayParties } from '../resolveDisplayParties';

const baseParties: Party[] = [
    { id: 1, name: 'المدعي', role: 'المدعي', side: 'right', isClient: true },
    { id: 2, name: 'المدعى عليه', role: 'المدعى عليه', side: 'left', isClient: false },
];

describe('resolveDisplayParties', () => {
    it('prefers active stage parties', () => {
        expect(
            resolveDisplayParties({
                displayStage: { parties: baseParties } as CaseStage,
                file: { parties: [{ id: 9, name: 'قديم', role: 'المدعي' }] },
            }).map((p) => p.name),
        ).toEqual(['المدعي', 'المدعى عليه']);
    });

    it('falls back to file parties when stage is empty', () => {
        expect(
            resolveDisplayParties({
                displayStage: { parties: [] } as CaseStage,
                file: { parties: baseParties },
            }).map((p) => p.name),
        ).toEqual(['المدعي', 'المدعى عليه']);
    });

    it('coerces status-only party records from new case payload', () => {
        expect(
            resolveDisplayParties({
                displayStage: { parties: [] } as CaseStage,
                file: {
                    parties: [{ id: 'p1_1', name: 'غقف', status: 'مدعي', isClient: true }],
                },
            }).map((p) => p.name),
        ).toEqual(['غقف']);
    });

    it('recovers parties from a locked prior stage', () => {
        const stages: CaseStage[] = [
            { id: 's1', stageName: 'البداءة', status: 'locked', parties: baseParties },
            { id: 's2', stageName: 'استئناف', status: 'active', parties: [] },
        ];
        expect(
            resolveDisplayParties({
                displayStage: stages[1],
                file: { parties: [] },
                allStages: stages,
            }).map((p) => p.name),
        ).toEqual(['المدعي', 'المدعى عليه']);
    });

    it('builds parties from thirdParties payload', () => {
        expect(
            resolveDisplayParties({
                displayStage: { parties: [] } as CaseStage,
                file: {
                    parties: [],
                    thirdParties: [
                        {
                            id: 1,
                            name: 'اختصام',
                            entryMode: 'interpleader',
                            roleLabel: 'شخص ثالث (اختصامي)',
                            isClient: false,
                        },
                    ],
                },
            }).map((p) => p.name),
        ).toEqual(['اختصام']);
    });

    it('repairs unflipped interpleader on appeal stage for header display', () => {
        const parties = resolveDisplayParties({
            displayStage: {
                stageName: 'الاستئناف',
                parties: [
                    { id: 1, name: 'موكل', role: 'المستأنف (المدعي)', side: 'right', isClient: true },
                    { id: 5, name: 'اختصام', role: 'شخص ثالث (اختصامي)', isClient: false },
                ],
                appealMetadata: {
                    appealType: 'استئناف',
                    appellant: 'الشخص الثالث الاختصامي',
                    filingDate: '2026-01-01',
                    initialAppellantPartyIds: [5],
                },
            } as CaseStage,
        });
        const interpleader = parties.find((p) => p.id === 5);
        expect(interpleader?.role).toContain('المستأنف');
        expect(interpleader?.side).toBe('right');
    });
});
