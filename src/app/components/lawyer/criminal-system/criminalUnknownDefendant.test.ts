import { describe, expect, it } from 'vitest';
import type { CriminalCase, CriminalDefendant } from './criminalStore';
import {
    canAddUnknownDefendantToDraft,
    canAddUnknownDefendants,
    canMarkDraftDefendantAsUnknown,
    draftHasNamedIdentifiedDefendant,
    draftIsAllUnknownDefendants,
    getIdentifiedDefendants,
    getUnknownIdentityDefendants,
    hasIdentifiedDefendant,
    hasUnrevealedUnknownDefendants,
    investigationDossierHasMixedUnknownAndIdentified,
    isComplaintRestrictedToInvestigationOnly,
    isDefendantIdentityUnknown,
    makeUnknownIdentityDefendant,
    newCaseStageLockedToInvestigationForUnknown,
    normalizeCaseDefendantsForUnknown,
    pruneEmptyDefendantShells,
    repairUnknownDefendantCaseRecord,
    resolveDefendantFullName,
    unknownDefendantDisplayLabel,
} from './criminalUnknownDefendant';

describe('criminalUnknownDefendant', () => {
    it('resolveDefendantFullName falls back to legacy name field', () => {
        expect(
            resolveDefendantFullName({
                id: 'd1',
                fullName: '',
                name: 'باسم من الحقل القديم',
            } as CriminalDefendant),
        ).toBe('باسم من الحقل القديم');
    });

    it('labels unknown defendants with index', () => {
        expect(unknownDefendantDisplayLabel(2)).toBe('مشكو منه مجهول (2)');
        expect(unknownDefendantDisplayLabel(1, true)).toBe('حدث مجهول (1)');
    });

    it('separates unknown and identified defendants', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const known: CriminalDefendant = {
            ...unknown,
            id: 'known-1',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        const list = [unknown, known];
        expect(getUnknownIdentityDefendants(list)).toHaveLength(1);
        expect(getIdentifiedDefendants(list)).toHaveLength(1);
        expect(isDefendantIdentityUnknown(unknown)).toBe(true);
        expect(isDefendantIdentityUnknown(known)).toBe(false);
    });

    it('normalizes legacy unknown case without defendant rows', () => {
        const legacy = {
            unknownDefendant: true,
            defendants: [],
        } as CriminalCase;
        const normalized = normalizeCaseDefendantsForUnknown(legacy);
        expect(normalized).toHaveLength(1);
        expect(hasUnrevealedUnknownDefendants(normalized)).toBe(true);
        expect(hasIdentifiedDefendant(normalized)).toBe(false);
    });

    it('allows mixed known and unknown defendants', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const known: CriminalDefendant = {
            ...unknown,
            id: 'known-1',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        const list = [unknown, known];
        expect(hasUnrevealedUnknownDefendants(list)).toBe(true);
        expect(hasIdentifiedDefendant(list)).toBe(true);
        expect(investigationDossierHasMixedUnknownAndIdentified(list)).toBe(true);
        expect(isComplaintRestrictedToInvestigationOnly(list)).toBe(false);
    });

    it('restricts investigation-only when all defendants are unknown', () => {
        const list = [makeUnknownIdentityDefendant(1), makeUnknownIdentityDefendant(2)];
        expect(isComplaintRestrictedToInvestigationOnly(list)).toBe(true);
        expect(canAddUnknownDefendants('complainant_side')).toBe(true);
        expect(canAddUnknownDefendants('defendant_side')).toBe(false);
    });

    it('filters unknown defendants from statements log visibility', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const known: CriminalDefendant = {
            ...unknown,
            id: 'known-1',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        const statements = [
            {
                id: 'st1',
                date: '2026-05-01',
                giverType: 'defendant' as const,
                giverName: unknown.fullName,
                content: 'نص',
            },
            {
                id: 'st2',
                date: '2026-05-02',
                giverType: 'defendant' as const,
                giverName: 'علي محمد',
                content: 'نص',
            },
        ];
        const visible = filterStatementsExcludingUnknown(statements, [unknown, known]);
        expect(visible).toHaveLength(1);
        expect(visible[0]?.id).toBe('st2');
    });

    it('prunes empty defendant shells after unknown reveal scenario', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const emptyShell: CriminalDefendant = {
            ...unknown,
            id: 'empty-shell',
            fullName: '',
            isIdentityUnknown: false,
        };
        const revealed: CriminalDefendant = {
            ...unknown,
            id: 'revealed',
            fullName: 'علي حسن',
            isIdentityUnknown: false,
        };
        const pruned = pruneEmptyDefendantShells([emptyShell, revealed]);
        expect(pruned).toHaveLength(1);
        expect(getIdentifiedDefendants(pruned)[0]?.fullName).toBe('علي حسن');
    });

    it('repairUnknownDefendantCaseRecord drops ghost unknown when flag is false', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const known: CriminalDefendant = {
            ...unknown,
            id: 'known-1',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        const legacy = {
            unknownDefendant: false,
            defendants: [unknown, known],
        } as CriminalCase;
        const repaired = repairUnknownDefendantCaseRecord(legacy);
        expect(repaired.unknownDefendant).toBe(false);
        expect(repaired.defendants).toHaveLength(1);
        expect(repaired.defendants[0]?.fullName).toBe('علي محمد');
    });

    it('draftIsAllUnknownDefendants detects all-unknown draft', () => {
        expect(draftIsAllUnknownDefendants([makeUnknownIdentityDefendant(1)])).toBe(true);
        expect(
            draftIsAllUnknownDefendants([
                makeUnknownIdentityDefendant(1),
                makeUnknownIdentityDefendant(2),
            ]),
        ).toBe(true);
        const unknown = makeUnknownIdentityDefendant(1);
        const named: CriminalDefendant = {
            ...unknown,
            id: 'named',
            fullName: 'علي',
            isIdentityUnknown: false,
        };
        expect(draftIsAllUnknownDefendants([unknown, named])).toBe(false);
    });

    it('canAddUnknownDefendantToDraft is always true for the add button', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        expect(canAddUnknownDefendantToDraft([])).toBe(true);
        expect(canAddUnknownDefendantToDraft([unknown])).toBe(true);
        expect(canAddUnknownDefendantToDraft([unknown, makeUnknownIdentityDefendant(2)])).toBe(true);
    });

    it('newCaseStageLockedToInvestigationForUnknown when any unknown exists', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const named: CriminalDefendant = {
            ...unknown,
            id: 'named',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        expect(newCaseStageLockedToInvestigationForUnknown([named])).toBe(false);
        expect(newCaseStageLockedToInvestigationForUnknown([unknown])).toBe(true);
        expect(newCaseStageLockedToInvestigationForUnknown([unknown, named])).toBe(true);
    });

    it('canMarkDraftDefendantAsUnknown allows sole primary identified slot', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const only: CriminalDefendant = {
            ...unknown,
            id: 'only',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        expect(canMarkDraftDefendantAsUnknown([only], 'only')).toBe(true);
    });

    it('canMarkDraftDefendantAsUnknown allows empty identified shell when another is named', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const named: CriminalDefendant = {
            ...unknown,
            id: 'named',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        const emptyShell: CriminalDefendant = {
            ...unknown,
            id: 'empty-shell',
            fullName: '',
            isIdentityUnknown: false,
        };
        expect(canMarkDraftDefendantAsUnknown([named, emptyShell], 'empty-shell')).toBe(true);
        expect(canMarkDraftDefendantAsUnknown([named, emptyShell], 'named')).toBe(true);
        expect(getIdentifiedDefendants([named, emptyShell])).toHaveLength(1);
    });

    it('canMarkDraftDefendantAsUnknown blocks unknown targets and allows primary slot rules', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const onlyNamed: CriminalDefendant = {
            ...unknown,
            id: 'only',
            fullName: 'علي محمد',
            isIdentityUnknown: false,
        };
        const secondEmpty: CriminalDefendant = {
            ...unknown,
            id: 'second-empty',
            fullName: '',
            isIdentityUnknown: false,
        };
        const secondNamed: CriminalDefendant = {
            ...unknown,
            id: 'second-named',
            fullName: 'حسن أحمد',
            isIdentityUnknown: false,
        };
        expect(canMarkDraftDefendantAsUnknown([onlyNamed], 'only')).toBe(true);
        expect(canMarkDraftDefendantAsUnknown([onlyNamed, secondEmpty], 'only')).toBe(true);
        expect(canMarkDraftDefendantAsUnknown([onlyNamed, secondNamed], 'only')).toBe(true);
        expect(canMarkDraftDefendantAsUnknown([onlyNamed, secondNamed], 'second-named')).toBe(true);
        expect(canMarkDraftDefendantAsUnknown([unknown, onlyNamed], 'only')).toBe(true);
    });
});
