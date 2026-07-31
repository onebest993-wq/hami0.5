import { describe, expect, it } from 'vitest';
import {
    archiveExecutiveDetentionCycleDecisionRows,
    appendExecutiveDetentionJudgeDecisionRows,
    supersedeGuarantorRequestDecisionRows,
} from '@/app/utils/executorPersonalCoerciveAdminOps';

describe('executorPersonalCoerciveAdminOps', () => {
    it('archives dossier presentation cycle rows within debtor scope', () => {
        const rows = archiveExecutiveDetentionCycleDecisionRows({
            rows: [
                {
                    id: 'dossier_row',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'executive_dossier_presentation',
                    personalCoerciveDebtorKey: 'debtor-1',
                },
                {
                    id: 'other_debtor',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'executive_dossier_presentation',
                    personalCoerciveDebtorKey: 'debtor-2',
                },
            ],
            debtorKey: 'debtor-1',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(rows[0]?.isArchived).toBe(true);
        expect(rows[0]?.requestCycleSuperseded).toBe(true);
        expect(rows[1]?.isArchived).toBeUndefined();
    });

    it('appends executive detention judge decision and supersedes prior sibling rows', () => {
        const result = appendExecutiveDetentionJudgeDecisionRows({
            rows: [
                {
                    id: 'judge_old',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'executive_detention_judge',
                    parentExecutorDecisionId: 'parent-1',
                },
            ],
            parentExecutorDecisionId: 'parent-1',
            outcome: 'approved',
            todayYmd: '2026-07-11',
            nowIso: '2026-07-11T10:00:00.000Z',
            decisionId: 'judge_new',
        });

        expect(result.ok).toBe(true);
        expect(result.rows[0]?.id).toBe('judge_new');
        expect(
            result.rows.find((row) => String(row.id) === 'judge_old')?.requestCycleSuperseded,
        ).toBe(true);
    });

    it('supersedes active guarantor request rows and returns affected count', () => {
        const result = supersedeGuarantorRequestDecisionRows({
            rows: [
                { id: 'g1', requestKind: 'guarantor_request' },
                { id: 'other', requestKind: 'special_followup' },
            ],
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(result.count).toBe(1);
        expect(result.rows[0]?.isArchived).toBe(true);
        expect(result.rows[0]?.requestCycleSuperseded).toBe(true);
    });
});
