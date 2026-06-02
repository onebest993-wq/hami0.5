import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JudicialDecisionsLedger } from './JudicialDecisionsLedger';
import {
    CUSTOM_LAWYER_MOTION_TYPE,
    DETENTION_DECISION_TEMPLATE,
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
} from '../proceduralRequestTypes';
import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase } from '../criminalStore';

function decision(
    overrides: Partial<JudicialDecision> & { title: string; proceduralTemplate?: string },
): JudicialDecision {
    return {
        id: overrides.id ?? 'd1',
        issuedAt: overrides.issuedAt ?? '2026-05-25',
        title: overrides.title,
        summary: overrides.summary ?? '',
        decisionType: overrides.decisionType ?? 'preparatory',
        appeals: overrides.appeals ?? [],
        isLocked: overrides.isLocked ?? false,
        proceduralTemplate: overrides.proceduralTemplate,
    } as JudicialDecision;
}

const sealedInvestigationCase: CriminalCase = {
    id: 'case-inv',
    caseStage: 'investigation',
    isFrozen: true,
    investigationDossierClosure: { kind: 'temporary', closedAt: '2026-05-01' },
    defendants: [
        {
            id: 'd1',
            fullName: 'متهم',
            address: '',
            birthYear: '',
            status: '',
            detentionAuthority: '',
            detentionExpiryDate: '',
            detentionHistoryLog: [],
            totalDetentionDays: 0,
            investigationStatus: 'closed_pending',
        },
    ],
} as CriminalCase;

describe('JudicialDecisionsLedger', () => {
    it('shows filter-specific empty label', () => {
        render(
            <JudicialDecisionsLedger
                decisions={[]}
                parties={[]}
                kindFilter="lawyer_motion"
                onFileAppeal={vi.fn()}
                onRecordAppealResult={vi.fn()}
            />,
        );
        expect(screen.getByText(/طلبات محامٍ مطابقة للفلتر/)).toBeTruthy();
    });

    it('renders purge decision title on sealed investigation dossier', () => {
        render(
            <JudicialDecisionsLedger
                decisions={[
                    decision({
                        id: 'purge-1',
                        title: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
                        proceduralTemplate: INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
                        isLocked: true,
                    }),
                ]}
                parties={[]}
                investigationPurgeCase={sealedInvestigationCase}
                investigationDossierSealed
                onFileAppeal={vi.fn()}
                onRecordAppealResult={vi.fn()}
            />,
        );
        expect(screen.getByText(/غلق الدعوى مؤقتاً/)).toBeTruthy();
        expect(screen.getByRole('button', { name: /تسجيل طعن تمييزي/ })).toBeTruthy();
    });

    it('filters lawyer motions when kindFilter is lawyer_motion', () => {
        render(
            <JudicialDecisionsLedger
                decisions={[
                    decision({
                        id: 'det-1',
                        title: DETENTION_DECISION_TEMPLATE,
                        proceduralTemplate: DETENTION_DECISION_TEMPLATE,
                    }),
                    decision({
                        id: 'mot-1',
                        title: CUSTOM_LAWYER_MOTION_TYPE,
                        proceduralTemplate: CUSTOM_LAWYER_MOTION_TYPE,
                    }),
                ]}
                parties={[]}
                kindFilter="lawyer_motion"
                onFileAppeal={vi.fn()}
                onRecordAppealResult={vi.fn()}
            />,
        );
        expect(screen.getByText(CUSTOM_LAWYER_MOTION_TYPE)).toBeTruthy();
        expect(screen.queryByText(DETENTION_DECISION_TEMPLATE)).toBeNull();
    });
});
