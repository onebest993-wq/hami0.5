import { describe, expect, it } from 'vitest';
import {
    CRIMINAL_MUTATION_DENIED_MSG,
    rejectCriminalCaseMutation,
} from './criminalCaseMutationGuard';
import { useCriminalStore } from './criminalStore';
import {
    makePendingLawyerRequest,
    makePreparatoryDecision,
    resetCriminalStore,
    seedDraftForNewCase,
} from './__tests__/criminalStoreTestHelpers';

describe('criminalCaseMutationGuard', () => {
    it('rejects mutation when owner differs from session lawyer', () => {
        expect(
            rejectCriminalCaseMutation({ ownerLawyerId: 'lawyer-b' }, 'lawyer-a'),
        ).toBeTruthy();
    });

    it('rejects mutation on legacy orphan when session lawyer is known', () => {
        expect(rejectCriminalCaseMutation({ ownerLawyerId: '' }, 'lawyer-a')).toBeTruthy();
    });

    it('allows mutation for owned case', () => {
        expect(
            rejectCriminalCaseMutation({ ownerLawyerId: 'lawyer-a' }, 'lawyer-a'),
        ).toBeNull();
    });

    it('rejects mutation when session lawyer id is empty', () => {
        expect(
            rejectCriminalCaseMutation({ ownerLawyerId: 'lawyer-a' }, ''),
        ).toBeTruthy();
        expect(rejectCriminalCaseMutation({ ownerLawyerId: 'lawyer-a' }, null)).toBeTruthy();
    });
});

describe('lawyer request trash owner guards (P0)', () => {
    it('moveLawyerRequestToTrash / deleteLawyerRequest refuse foreign owner', () => {
        resetCriminalStore();
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        expect(caseId).toBeTruthy();
        useCriminalStore.getState().addOrUpdateRequest(caseId!, makePendingLawyerRequest('r-guard', '2026-05-20', 'طلب'));
        useCriminalStore.setState((state) => ({
            casesById: {
                ...state.casesById,
                [caseId!]: {
                    ...state.casesById[caseId!],
                    ownerLawyerId: 'other-lawyer',
                },
            },
        }));

        const err = useCriminalStore.getState().moveLawyerRequestToTrash(caseId!, 'r-guard');
        expect(err).toBe(CRIMINAL_MUTATION_DENIED_MSG);
        expect(
            useCriminalStore.getState().casesById[caseId!]?.lawyerRequests?.some((r) => r.id === 'r-guard'),
        ).toBe(true);

        useCriminalStore.getState().deleteLawyerRequest(caseId!, 'r-guard');
        expect(
            useCriminalStore.getState().casesById[caseId!]?.lawyerRequests?.some((r) => r.id === 'r-guard'),
        ).toBe(true);
    });

    it('moveJudicialDecisionToTrash refuses foreign owner', () => {
        resetCriminalStore();
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        expect(caseId).toBeTruthy();
        const decision = makePreparatoryDecision('jd-1', '2026-05-21', 'قرار تحضيري');
        useCriminalStore.setState((state) => ({
            casesById: {
                ...state.casesById,
                [caseId!]: {
                    ...state.casesById[caseId!],
                    ownerLawyerId: 'other-lawyer',
                    judicialDecisions: [decision],
                },
            },
        }));

        const err = useCriminalStore.getState().moveJudicialDecisionToTrash(caseId!, 'jd-1');
        expect(err).toBe(CRIMINAL_MUTATION_DENIED_MSG);
        expect(
            useCriminalStore.getState().casesById[caseId!]?.judicialDecisions?.some((d) => d.id === 'jd-1'),
        ).toBe(true);
    });

    it('moveLawyerRequestToTrash allows session owner', () => {
        resetCriminalStore();
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        expect(caseId).toBeTruthy();
        useCriminalStore.getState().addOrUpdateRequest(caseId!, makePendingLawyerRequest('r-ok', '2026-05-20', 'طلب'));
        const err = useCriminalStore.getState().moveLawyerRequestToTrash(caseId!, 'r-ok');
        expect(err).toBeNull();
        expect(
            useCriminalStore.getState().casesById[caseId!]?.lawyerRequests?.some((r) => r.id === 'r-ok'),
        ).toBe(false);
    });
});
