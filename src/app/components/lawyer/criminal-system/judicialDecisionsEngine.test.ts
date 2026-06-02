import { describe, expect, it } from 'vitest';
import {
    canFileDefendantCassationAppeal,
    canOpenCassationAppealModal,
    canRecordCassationAppealResult,
    canShowCassationAppealFileButton,
    coalesceJudicialDecisions,
    findJudicialDecisionByRef,
    getPendingCassationAppealForResult,
    decisionAlreadyHasCassationAppeal,
    formatJudicialLedgerDate,
    formatRectificationBadge,
    inferJudicialDecisionKind,
    isDecisionFullyFavorableToDefendants,
    isRecordedCassationAppealConcluded,
    lawyerRequestToJudicialDecision,
    mergeJudicialDecisionsFromRequests,
    resolveDefendantStatusFromJudicialDecisions,
    filterDefendantPartiesForDecision,
} from './judicialDecisionsEngine';
import { CUSTOM_LAWYER_MOTION_TYPE } from './proceduralRequestTypes';

describe('judicialDecisionsEngine', () => {
    it('filterDefendantPartiesForDecision scopes appellants to decision defendantIds', () => {
        const parties = [
            { id: 'd1', source: 'defendant' as const },
            { id: 'd2', source: 'defendant' as const },
            { id: 'c1', source: 'complainant' as const },
        ];
        const single = filterDefendantPartiesForDecision(parties, {
            id: 'j1',
            issuedAt: '2026-05-01',
            title: 'قرار توقيف المتهم',
            summary: '—',
            defendantIds: ['d2'],
        } as any);
        expect(single.map((p) => p.id)).toEqual(['d2']);

        const combined = filterDefendantPartiesForDecision(parties, {
            id: 'j2',
            issuedAt: '2026-05-01',
            title: 'قرار توقيف المتهم',
            summary: '—',
            defendantIds: ['d1', 'd2'],
        } as any);
        expect(combined.map((p) => p.id)).toEqual(['d1', 'd2']);

        const general = filterDefendantPartiesForDecision(parties, {
            id: 'j3',
            issuedAt: '2026-05-01',
            title: 'قرار عام',
            summary: '—',
        } as any);
        expect(general.map((p) => p.id)).toEqual(['d1', 'd2']);
    });

    it('resolveDefendantStatusFromJudicialDecisions follows locked detention then release', () => {
        const decisions = [
            {
                id: 'd1',
                issuedAt: '2026-01-01',
                title: 'قرار توقيف المتهم',
                summary: 'توقيف',
                requestType: 'قرار توقيف المتهم',
                defendantIds: ['def-1'],
                isLocked: true,
                decisionType: 'preparatory' as const,
                disposition: 'neutral' as const,
                appeals: [],
            },
            {
                id: 'd2',
                issuedAt: '2026-02-01',
                title: 'إطلاق سراح',
                summary: 'documentDetentionRelease إطلاق سراح',
                defendantIds: ['def-1'],
                isLocked: true,
                decisionType: 'preparatory' as const,
                disposition: 'neutral' as const,
                appeals: [],
            },
        ];
        expect(resolveDefendantStatusFromJudicialDecisions('def-1', decisions as any, 'حر')).toBe('حر');
        expect(resolveDefendantStatusFromJudicialDecisions('def-1', [decisions[0]] as any, 'حر')).toBe('موقوف');
    });

    it('classifies dispositive vs preparatory', () => {
        expect(inferJudicialDecisionKind('تأجيل', 'تأجيل الجلسة')).toBe('preparatory');
        expect(inferJudicialDecisionKind('إفراج', 'إخلاء سبيل المتهم')).toBe('dispositive');
    });

    it('maps isAppealable from lawyer request to judicial decision', () => {
        const d = lawyerRequestToJudicialDecision({
            id: 'r9',
            requestDate: '2026-05-01',
            type: 'تأجيل',
            lawyerNote: '—',
            status: 'approved',
            judgeMargin: 'موافق',
            decisionDate: '2026-05-02',
            isLocked: true,
            proceduralTemplate: CUSTOM_LAWYER_MOTION_TYPE,
            isAppealable: true,
        })!;
        expect(d.isAppealable).toBe(true);
        expect(d.proceduralTemplate).toBe(CUSTOM_LAWYER_MOTION_TYPE);
    });

    it('blocks defendant cassation when decision fully favors defendant', () => {
        const d = lawyerRequestToJudicialDecision({
            id: 'r1',
            requestDate: '2026-05-01',
            type: 'إفراج المتهم',
            lawyerNote: '—',
            status: 'approved',
            judgeMargin: 'إخلاء سبيل',
            decisionDate: '2026-05-10',
            defendantIds: ['d1'],
            isLocked: true,
        })!;
        expect(isDecisionFullyFavorableToDefendants(d)).toBe(true);
        expect(canFileDefendantCassationAppeal(d)).toBe(false);
        expect(canOpenCassationAppealModal(d)).toBe(true);
    });

    it('maps executed judicial decision without motion outcome badge', () => {
        const d = lawyerRequestToJudicialDecision({
            id: 'ex1',
            requestDate: '2026-05-10',
            type: 'قرار توقيف المتهم',
            lawyerNote: 'توقيف المتهم',
            status: 'executed',
            judgeMargin: 'توقيف المتهم',
            decisionDate: '2026-05-10',
            isLocked: true,
            proceduralTemplate: 'قرار توقيف المتهم',
            detentionStartDate: '2026-05-10',
            detentionEndDate: '2026-05-20',
        })!;
        expect(d.isLocked).toBe(true);
        expect(d.requestOutcomeStatus).toBeUndefined();
        expect(d.detentionStartDate).toBe('2026-05-10');
        expect(d.detentionEndDate).toBe('2026-05-20');
    });

    it('merges stored decisions with lawyer requests', () => {
        const merged = mergeJudicialDecisionsFromRequests([], [
            {
                id: 'req1',
                requestDate: '2026-05-01',
                type: 'كفالة',
                lawyerNote: 'طلب',
                status: 'approved',
                judgeMargin: 'موافقة',
                decisionDate: '2026-05-02',
                isLocked: true,
            },
        ]);
        expect(merged.length).toBe(1);
        expect(merged[0]?.sourceRequestId).toBe('req1');
        expect(merged[0]?.requestOutcomeStatus).toBe('approved');
    });

    it('rejected lawyer request carries outcome badge only — no phantom cassation banner', () => {
        const d = lawyerRequestToJudicialDecision({
            id: 'req2',
            requestDate: '2026-05-01',
            type: 'إصدار أمر استقدام / قبض',
            lawyerNote: 'طلب',
            status: 'rejected',
            judgeMargin: 'رفض الطلب',
            decisionDate: '2026-05-03',
            isLocked: true,
        })!;
        expect(d.requestOutcomeStatus).toBe('rejected');
        expect(formatRectificationBadge(
            {
                id: 'a1',
                appellantType: 'defendant',
                appellantIds: ['d1'],
                cassationStatus: 'concluded',
                result: 'affirmation',
            },
            () => '—',
        )).toBeNull();
    });

    it('formatRectificationBadge requires filed cassation with concluded result', () => {
        expect(
            isRecordedCassationAppealConcluded({
                id: 'a1',
                appellantType: 'defendant',
                appellantIds: ['d1'],
                cassationStatus: 'concluded',
                result: 'affirmation',
            }),
        ).toBe(false);
        const text = formatRectificationBadge(
            {
                id: 'a2',
                appellantType: 'defendant',
                appellantIds: ['d1'],
                cassationStatus: 'concluded',
                result: 'affirmation',
                filedAt: '2026-06-01',
            },
            () => '—',
        );
        expect(text).toContain('تصديق تمييزي');
    });

    it('formatJudicialLedgerDate normalizes ISO display', () => {
        expect(formatJudicialLedgerDate('2026-05-22T12:00:00.000Z')).toBe('2026-05-22');
    });

    it('hides file appeal button when decision already has a filed cassation', () => {
        const d = lawyerRequestToJudicialDecision({
            id: 'r9',
            requestDate: '2026-05-01',
            type: 'إصدار أمر استقدام / قبض',
            lawyerNote: '—',
            status: 'rejected',
            judgeMargin: 'رفض',
            decisionDate: '2026-05-02',
            isLocked: true,
        })!;
        const withAppeal: typeof d = {
            ...d,
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['d1'],
                    cassationStatus: 'pending',
                    filedAt: '2026-05-03',
                },
            ],
        };
        expect(decisionAlreadyHasCassationAppeal(withAppeal)).toBe(true);
        expect(canShowCassationAppealFileButton(withAppeal)).toBe(false);
        expect(canShowCassationAppealFileButton(d)).toBe(true);
    });

    it('findJudicialDecisionByRef matches jd_* ledger ids', () => {
        const d: JudicialDecision = {
            id: 'jd_r99',
            issuedAt: '2026-05-01',
            title: 'توقيف',
            summary: '—',
            decisionType: 'preparatory',
            appeals: [],
            isLocked: true,
            sourceRequestId: 'r99',
        };
        expect(findJudicialDecisionByRef([d], 'jd_r99')?.id).toBe('jd_r99');
        expect(findJudicialDecisionByRef([d], 'r99')?.sourceRequestId).toBe('r99');
    });

    it('canRecordCassationAppealResult is false after concluded appeal', () => {
        const d: JudicialDecision = {
            id: 'jd_x',
            issuedAt: '2026-05-01',
            title: 'قبض',
            summary: '—',
            decisionType: 'preparatory',
            isLocked: true,
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['d1'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    filedAt: '2026-05-02',
                    concludedAt: '2026-06-01',
                },
            ],
        };
        expect(canRecordCassationAppealResult(d)).toBe(false);
        expect(getPendingCassationAppealForResult(d)).toBeUndefined();
    });

    it('returns pending intervention even when ordinary cassation is concluded', () => {
        const d: JudicialDecision = {
            id: 'jd_x',
            issuedAt: '2026-05-01',
            title: 'قرار تحقيق',
            summary: '—',
            decisionType: 'preparatory',
            isLocked: true,
            interventionCassationPending: true,
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['d1'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    appealPath: 'ordinary',
                    filedAt: '2026-05-02',
                    concludedAt: '2026-06-01',
                },
                {
                    id: 'a2',
                    appellantType: 'complainant',
                    appellantIds: ['c1'],
                    cassationStatus: 'pending',
                    appealPath: 'intervention_264b',
                    filedAt: '2026-06-05',
                },
            ],
        };
        const pending = getPendingCassationAppealForResult(d);
        expect(pending?.id).toBe('a2');
        expect(canRecordCassationAppealResult(d)).toBe(true);
    });

    it('coalesceJudicialDecisions keeps concluded appeal over duplicate pending copy', () => {
        const merged = coalesceJudicialDecisions([
            {
                id: 'jd_r1',
                issuedAt: '2026-05-01',
                title: 'قبض',
                summary: '—',
                decisionType: 'preparatory',
                sourceRequestId: 'r1',
                isLocked: true,
                appeals: [
                    {
                        id: 'ap1',
                        appellantType: 'defendant',
                        appellantIds: ['d1'],
                        cassationStatus: 'concluded',
                        result: 'procedural_annulment',
                        concludedAt: '2026-06-01',
                    },
                ],
            },
            {
                id: 'r1',
                issuedAt: '2026-05-01',
                title: 'قبض',
                summary: '—',
                decisionType: 'preparatory',
                isLocked: true,
                appeals: [
                    {
                        id: 'ap1',
                        appellantType: 'defendant',
                        appellantIds: ['d1'],
                        cassationStatus: 'pending',
                        filedAt: '2026-05-03',
                    },
                ],
            },
        ]);
        expect(merged).toHaveLength(1);
        expect(merged[0]?.appeals?.[0]?.cassationStatus).toBe('concluded');
        expect(canRecordCassationAppealResult(merged[0]!)).toBe(false);
    });

    it('merge preserves pending cassation appeals after filing', () => {
        const merged = mergeJudicialDecisionsFromRequests(
            [
                {
                    id: 'jd_r1',
                    issuedAt: '2026-05-02',
                    title: 'إصدار أمر استقدام / قبض',
                    summary: 'رفض',
                    decisionType: 'preparatory',
                    appeals: [
                        {
                            id: 'ap1',
                            appellantType: 'defendant',
                            appellantIds: ['d1'],
                            cassationStatus: 'pending',
                            filedAt: '2026-05-03',
                        },
                    ],
                    isLocked: true,
                    sourceRequestId: 'r1',
                },
            ],
            [
                {
                    id: 'r1',
                    requestDate: '2026-05-01',
                    type: 'إصدار أمر استقدام / قبض',
                    lawyerNote: 'طلب',
                    status: 'rejected',
                    judgeMargin: 'رفض',
                    decisionDate: '2026-05-02',
                    isLocked: true,
                },
            ],
        );
        expect(merged[0]?.appeals?.length).toBe(1);
        expect(merged[0]?.appeals?.[0]?.cassationStatus).toBe('pending');
    });

    it('merge preserves appeal lifecycle fields from stored decision', () => {
        const merged = mergeJudicialDecisionsFromRequests(
            [
                {
                    id: 'jd_r1',
                    issuedAt: '2026-05-02',
                    title: 'حكم',
                    summary: '—',
                    decisionType: 'dispositive',
                    isLocked: true,
                    sourceRequestId: 'r1',
                    isAppealed: true,
                    interventionCassationPending: true,
                    appealResult: 'تأييد القرار',
                    cassationPapersReceivedAt: '2026-05-10',
                    cassationCorrectionPending: true,
                },
            ],
            [
                {
                    id: 'r1',
                    requestDate: '2026-05-01',
                    type: 'حكم',
                    lawyerNote: 'طلب',
                    status: 'approved',
                    judgeMargin: 'حكم',
                    decisionDate: '2026-05-02',
                    isLocked: true,
                },
            ],
        );
        expect(merged[0]?.isAppealed).toBe(true);
        expect(merged[0]?.interventionCassationPending).toBe(true);
        expect(merged[0]?.cassationCorrectionPending).toBe(true);
        expect(merged[0]?.cassationPapersReceivedAt).toBe('2026-05-10');
        expect(merged[0]?.appealResult).toBe('تأييد القرار');
    });
});
