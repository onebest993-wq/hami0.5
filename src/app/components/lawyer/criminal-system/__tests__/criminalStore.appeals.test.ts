import { beforeEach, describe, expect, it } from 'vitest';
import { useCriminalStore } from '../criminalStore';
import { resetCriminalStore, seedDraftForNewCase } from './criminalStoreTestHelpers';

describe('criminalStore', () => {
    beforeEach(() => {
        resetCriminalStore();
    });

    it('issueStageDecision updates personalStage only for targetDefendantIds', () => {
        seedDraftForNewCase('محكمة الجنح');
        const s = useCriminalStore.getState();
        const d1 = s.draft.defendants[0]?.id;
        s.addDefendant();
        const d2 = useCriminalStore.getState().draft.defendants[1]?.id;
        if (d2) {
            s.setDefendantField(d2, 'fullName', 'سعد كاظم');
            s.setDefendantField(d2, 'birthYear', '1991');
            s.setDefendantField(d2, 'status', 'حر');
        }
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().issueStageDecision(caseId, {
            id: 'dec-1',
            stageType: 'misdemeanor',
            decisionType: 'acquittal',
            date: '2026-08-01',
            details: 'براءة جزئية',
            defendantStatusAtDecision: 'bailed',
            targetDefendantIds: [d1!],
        });
        const updated = useCriminalStore.getState().casesById[caseId];
        expect(updated?.defendants?.find((d) => d.id === d1)?.personalStage).toBe('acquitted');
        expect(updated?.defendants?.find((d) => d.id === d2)?.personalStage).toBe('under_investigation');
    });

    it('recordCassationResult via store rejects personal quash without beneficiaries', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        useCriminalStore.getState().initiateCassationProceeding(caseId, {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'ST/2',
            panelName: 'تمييز',
            appellantDefendantIds: [useCriminalStore.getState().casesById[caseId]!.defendants[0]!.id],
        });
        const err = useCriminalStore.getState().recordCassationResult(caseId, {
            result: 'quash_dismissal',
            date: '2026-06-20',
            details: 'بدون مستفيدين',
            isObjectiveGrounds: false,
            targetDefendantIds: [],
        });
        expect(err).toBeTruthy();
        const c = useCriminalStore.getState().casesById[caseId];
        expect(c?.defendants?.every((d) => d.personalStage !== 'acquitted')).toBe(true);
    });

    it('recordCassationResult via store applies quash_remand with timeline unlock', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const d1 = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        useCriminalStore.getState().initiateCassationProceeding(caseId, {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'ST/1',
            panelName: 'تمييز',
            appellantDefendantIds: [d1!],
        });
        useCriminalStore.getState().recordCassationResult(caseId, {
            result: 'quash_remand',
            date: '2026-06-15',
            details: 'نقض وإعادة',
            isObjectiveGrounds: true,
        });
        const c = useCriminalStore.getState().casesById[caseId];
        expect(c?.isInvestigationLocked).toBe(false);
        expect(c?.stageJourney?.some((n) => n.status === 'current' && n.transitionText?.includes('جولة ثانية'))).toBe(
            true,
        );
    });

    it('recordJudicialAppealResult on preparatory annulment releases appellant defendant', () => {
        seedDraftForNewCase('مرحلة التحقيق');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        const sourceRequestId = 'req_arrest_1';
        const decisionId = `jd_${sourceRequestId}`;
        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        defendants: (c.defendants ?? []).map((d) =>
                            d.id === defId ? { ...d, status: 'مستقدم' as const } : d,
                        ),
                        judicialDecisions: [
                            {
                                id: decisionId,
                                issuedAt: '2026-05-01',
                                title: 'إصدار أمر استقدام / قبض',
                                summary: 'أمر قبض',
                                decisionType: 'preparatory',
                                proceduralTemplate: 'إصدار أمر استقدام / قبض',
                                sourceRequestId,
                                appeals: [
                                    {
                                        id: 'ap_proc',
                                        appellantType: 'defendant',
                                        appellantIds: [defId!],
                                        targetDefendantIds: [defId!],
                                        cassationStatus: 'pending',
                                        filedAt: '2026-05-10',
                                    },
                                ],
                                isLocked: true,
                            },
                        ],
                    },
                },
            };
        });
        const err = useCriminalStore.getState().recordJudicialAppealResult(caseId, decisionId, 'ap_proc', {
            result: 'procedural_annulment',
            isObjectiveGrounds: false,
            date: '2026-07-02',
        });
        expect(err).toBeNull();
        const c = useCriminalStore.getState().casesById[caseId];
        const storedAppeal = c?.judicialDecisions?.[0]?.appeals?.[0];
        expect(storedAppeal?.cassationStatus).toBe('concluded');
        expect(storedAppeal?.result).toBe('procedural_annulment');
        expect(c?.judicialDecisions?.[0]?.isLocked).toBe(true);
        expect(c?.defendants?.find((d) => d.id === defId)?.status).toBe('حر');
        const mirrorTl = (c?.timelineEvents ?? []).find((e) =>
            String(e.category ?? '').includes('إبطال قرار إجرائي'),
        );
        expect(mirrorTl).toBeUndefined();
    });

    it('recordJudicialAppealResult updates appeal metadata without procedural timeline mirror', () => {
        seedDraftForNewCase('محكمة الجنح');
        const caseId = useCriminalStore.getState().createCaseFromDraft();
        const defId = useCriminalStore.getState().casesById[caseId]?.defendants[0]?.id;
        const decisionId = 'jd_test_dec';
        useCriminalStore.setState((state) => {
            const c = state.casesById[caseId];
            if (!c) return state;
            return {
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...c,
                        judicialDecisions: [
                            {
                                id: decisionId,
                                issuedAt: '2026-05-01',
                                title: 'قرار إدانة',
                                summary: 'إدانة',
                                decisionType: 'dispositive',
                                appeals: [
                                    {
                                        id: 'ap1',
                                        appellantType: 'defendant',
                                        appellantIds: [defId!],
                                        targetDefendantIds: [defId!],
                                        cassationStatus: 'pending',
                                    },
                                ],
                                isLocked: true,
                            },
                        ],
                    },
                },
            };
        });
        useCriminalStore.getState().recordJudicialAppealResult(caseId, decisionId, 'ap1', {
            result: 'quash_dismissal',
            isObjectiveGrounds: true,
            targetDefendantIds: [defId!],
            date: '2026-07-01',
        });
        const c = useCriminalStore.getState().casesById[caseId];
        const appeal = c?.judicialDecisions?.[0]?.appeals?.[0];
        expect(appeal?.result).toBe('quash_dismissal');
        expect(appeal?.cassationStatus).toBe('concluded');
        expect(appeal?.isObjectiveGrounds269b).toBe(true);
        const appealTimeline = (c?.timelineEvents ?? []).filter((e) =>
            String(e.category ?? '').includes('نتيجة تمييزية على قرار'),
        );
        expect(appealTimeline).toHaveLength(0);
    });
});
