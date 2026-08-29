import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
    ColleagueConsultationProvider,
    useColleagueConsultation,
} from '../ColleagueConsultationContext';
import { ColleagueConsultationHeaderButton } from '../ColleagueConsultationHeaderButton';

vi.mock('@/app/context/authHooks', () => ({
    useAuthSafe: () => ({
        user: { id: 'u1', email: 't@t.t', user_metadata: { fullName: 'تجريب' } },
        isLoading: false,
        hasRole: () => true,
    }),
}));

vi.mock('@/app/services/caseShare/caseShareApiService', () => ({
    CaseShareApiService: {
        listNetworkColleagues: vi.fn(async () => []),
    },
}));

afterEach(() => {
    cleanup();
    document.getElementById('hami-colleague-consultation-portal')?.remove();
});

function Probe() {
    const ctx = useColleagueConsultation();
    return (
        <>
            <ColleagueConsultationHeaderButton iconOnly />
            <span data-testid="ctx-present">{ctx ? 'yes' : 'no'}</span>
        </>
    );
}

describe('ColleagueConsultationProvider', () => {
    it('يفتح طبقة الاستشارة عند النقر على الزر', async () => {
        render(
            <ColleagueConsultationProvider
                source={{
                    module: 'lawsuit',
                    dossierId: '1',
                    title: 'دعوى — تجريب',
                    caseNumbers: ['2026/1'],
                    partyNames: [],
                    courtLabel: 'كرخ',
                    courtProvince: '',
                    narrativeText: '',
                    documentCount: 0,
                    catalog: [],
                }}
            >
                <Probe />
            </ColleagueConsultationProvider>,
        );

        expect(screen.getByTestId('ctx-present').textContent).toBe('yes');
        fireEvent.click(screen.getByTestId('colleague-consultation-trigger'));
        await waitFor(() => {
            expect(screen.getByTestId('colleague-consultation-layer')).toBeTruthy();
        });
        expect(screen.getByRole('dialog', { name: 'استشارة زميل' })).toBeTruthy();
    });
});
