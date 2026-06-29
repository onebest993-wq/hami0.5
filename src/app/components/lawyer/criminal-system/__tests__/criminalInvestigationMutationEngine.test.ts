import { describe, expect, it } from 'vitest';
import type { CriminalCase, InvestigationLog, Statement } from '../criminalCaseModel';
import { makeInitialDraft } from '../criminalCaseDraftFactory';
import {
    applyCompleteInvestigationLetter,
    applyInvestigationLogExhibitLifecycleUpdate,
    applyInvestigationLogInsertion,
    applyStatementInsertion,
    applyStatementUpdate,
} from '../criminalInvestigationMutationEngine';

function minimalCase(over: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'case-1',
        createdAt: new Date().toISOString(),
        legalArticleHistory: [],
        ...makeInitialDraft(),
        ...over,
    } as CriminalCase;
}

const baseStatement: Statement = {
    id: 'st-1',
    date: '2024-01-01',
    giverType: 'defendant',
    giverName: 'أحمد',
    content: 'نص الإفادة',
};

const baseLog: InvestigationLog = {
    id: 'log-1',
    date: '2024-01-01',
    category: 'official_letter',
    title: 'كتاب',
    details: 'تفاصيل',
    status: 'awaiting_response',
};

describe('criminalInvestigationMutationEngine', () => {
    it('applyStatementInsertion appends a stamped statement', () => {
        const target = minimalCase({ statements: [], stageJourney: [{ id: 'node-1', stage: 'investigation', label: 'تحقيق', order: 0 }] });
        const result = applyStatementInsertion(target, baseStatement);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.nextCase.statements).toHaveLength(1);
            expect(result.nextCase.statements?.[0]?.proceduralNodeId).toBe('node-1');
        }
    });

    it('applyStatementInsertion blocks when investigation is locked', () => {
        const target = minimalCase({ isInvestigationLocked: true });
        expect(applyStatementInsertion(target, baseStatement)).toEqual({ ok: false, reason: 'blocked' });
    });

    it('applyStatementUpdate preserves ratified patch rules', () => {
        const target = minimalCase({
            statements: [{ ...baseStatement, isJudiciallyRatified: true, notes: 'قديم' }],
        });
        const result = applyStatementUpdate(target, 'st-1', {
            content: 'يجب ألا يتغير',
            notes: 'جديد',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            const updated = result.nextCase.statements?.[0];
            expect(updated?.content).toBe('نص الإفادة');
            expect(updated?.notes).toBe('جديد');
            expect(updated?.isJudiciallyRatified).toBe(true);
        }
    });

    it('applyInvestigationLogInsertion appends a log in investigation stage', () => {
        const target = minimalCase({ investigationLogs: [], caseStage: 'investigation' });
        const result = applyInvestigationLogInsertion(target, baseLog);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.nextCase.investigationLogs).toHaveLength(1);
        }
    });

    it('applyCompleteInvestigationLetter marks response received', () => {
        const target = minimalCase({
            caseStage: 'investigation',
            investigationLogs: [baseLog],
        });
        const result = applyCompleteInvestigationLetter(target, 'log-1', {
            receivedDate: '2024-02-01',
            responseNotes: 'وصل',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            const log = result.nextCase.investigationLogs?.[0];
            expect(log?.status).toBe('response_received');
            expect(log?.responseReceivedAt).toBe('2024-02-01');
            expect(log?.details).toContain('وصل');
        }
    });

    it('applyInvestigationLogExhibitLifecycleUpdate rejects non-exhibit logs', () => {
        const target = minimalCase({
            caseStage: 'investigation',
            investigationLogs: [baseLog],
        });
        const result = applyInvestigationLogExhibitLifecycleUpdate(target, 'log-1', 'sent_to_lab');
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('خزانة المبرزات');
        }
    });
});
