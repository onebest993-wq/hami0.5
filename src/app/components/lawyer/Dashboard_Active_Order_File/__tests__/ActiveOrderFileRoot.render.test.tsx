import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { Dashboard_Active_Order_File } from '../ActiveOrderFileRoot';
import { hydrateCase } from '@/app/domain/urgent/hydrateCase';
import type { UrgentCase } from '../../Component_Urgent_Card';

vi.mock('@/app/context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'dev-user-uuid-1' }, isLoading: false }),
    useAuthUser: () => ({ id: 'dev-user-uuid-1' }),
}));

function renderDossier(fileData: unknown) {
    const errors: Error[] = [];
    const view = render(
        <ErrorBoundary
            onError={(error) => {
                errors.push(error);
            }}
            fallback={<div data-testid="dossier-crash">crash</div>}
        >
            <Dashboard_Active_Order_File fileData={fileData} onClose={() => undefined} />
        </ErrorBoundary>,
    );
    return { ...view, errors };
}

const urgentJudiciaryCase: UrgentCase = {
    id: 'render-test-urgent-1',
    type: 'urgent_action',
    actionType: 'منع السفر',
    applicantName: 'موكل اختبار',
    court: 'محكمة',
    requestNumber: '2026/1',
    createdAt: new Date().toISOString(),
    phase: 'grievance_window',
    status: 'safe',
    archived: false,
    deleted: false,
    specificActionType: 'منع السفر',
    procedureCategory: 'urgent_judiciary',
};

describe('Dashboard_Active_Order_File render smoke', () => {
    it('renders with minimal id-only seed without crashing', () => {
        const { errors } = renderDossier({ id: 'minimal-id-only' });
        expect(errors).toHaveLength(0);
        expect(screen.queryByTestId('dossier-crash')).toBeNull();
        expect(screen.getByText('سير الإجراءات القضائية')).toBeInTheDocument();
    });

    it('renders urgent judiciary case from hydrateCase', () => {
        const hydrated = hydrateCase({
            ...urgentJudiciaryCase,
            judgeDecision: 'rejected',
            judgeDecisionDate: '2026-01-15',
            rejectionNotificationDate: '2026-01-20',
            cassationOutcome: 'filed',
            cassationFilingDate: '2026-01-22',
        });
        const { errors } = renderDossier(hydrated);
        expect(errors).toHaveLength(0);
        expect(screen.getByText('سير الإجراءات القضائية')).toBeInTheDocument();
    });

    it('renders legacy corrupt row after hydrateCase normalization', () => {
        const hydrated = hydrateCase({
            id: 'legacy-corrupt',
            type: 'urgent_action',
            specificActionType: 'حجز احتياطي',
            hearings: [{ stage: 'invalid', sessionDate: 'bad' }, null, { stage: 'grievance', sessionDate: '2026-02-01' }],
            judgeDecision: 'maybe',
            allParty1: 'not-an-array',
        });
        const { errors } = renderDossier(hydrated ?? { id: 'legacy-corrupt' });
        expect(errors).toHaveLength(0);
        expect(screen.getByText('سير الإجراءات القضائية')).toBeInTheDocument();
    });
});
