import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import { PersonalStatusSmartFileChrome } from '@/app/components/lawyer/personal-status/PersonalStatusSmartFileChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import { resolvePostHopChallengeChromeActions } from '@/app/components/lawyer/smart-modal/layout/mainPanel/postHopChallengeChrome';
import { resolveRemainingOpponentChallengeFooter } from '@/app/components/lawyer/smart-modal/smartFile/opponentRegistrationContext';

vi.mock('@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton', () => ({
    ColleagueConsultationHeaderButton: () => null,
}));

const PERSONAL_FILE = { lawsuitJurisdiction: 'personal', selectedType: 'personal' };

const personalFirstInstance = {
    id: 'ps0',
    name: 'أحوال شخصية',
    stageName: 'أحوال شخصية',
    status: 'locked',
    judgmentForm: 'مختلط',
    partyJudgmentDispositions: [
        { partyId: '2', form: 'حضوري' },
        { partyId: '3', form: 'غيابي' },
    ],
    partyChallengeLanes: [
        { partyId: '2', disposition: 'حضوري' as const, laneState: 'cassation' as const },
        { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
    ],
    parties: [
        { id: 1, name: 'زينب', role: 'مدعي', isClient: true },
        { id: 2, name: 'علي', role: 'مدعى عليه', isClient: false },
        { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
    ],
} as CaseStage;

const cassation = {
    id: 'ps1',
    name: 'التمييز',
    stageName: 'التمييز',
    status: 'active',
} as CaseStage;

const chromeBase = {
    onClose: vi.fn(),
    setShowEditInfoModal: vi.fn(),
    isTrashOpen: false,
    setIsTrashOpen: vi.fn(),
    isEditingStageName: false,
    setIsEditingStageName: vi.fn(),
    tempStageName: '',
    setTempStageName: vi.fn(),
    onSaveStageName: vi.fn(),
    stages: [personalFirstInstance, cassation],
    viewingStageIndex: 1,
    activeStageIndex: 1,
    isViewingArchived: false,
    onStageSelect: vi.fn(),
};

describe('personal status — post-hop challenge chrome (no استئناف)', () => {
    it('remaining methods never include استئناف after تمييز hop', () => {
        const remaining = resolveRemainingOpponentChallengeFooter({
            stages: [personalFirstInstance, cassation],
            currentStageName: 'التمييز',
            representedParty: 'المدعي',
            file: PERSONAL_FILE,
        });
        expect(remaining.show).toBe(true);
        expect(remaining.methods).not.toContain('استئناف');
        expect(remaining.methods).toEqual(expect.arrayContaining(['اعتراض غيابي', 'تمييز']));
        expect(remaining.label).toBe('قام الخصم بالطعن');
    });

    it('filters استئناف when stages alone mark personal dossier', () => {
        const remaining = resolveRemainingOpponentChallengeFooter({
            stages: [personalFirstInstance, cassation],
            currentStageName: 'التمييز',
            representedParty: 'المدعي',
        });
        expect(remaining.methods).not.toContain('استئناف');
    });

    it('post-hop chrome shows remaining تمييز/اعتراض and never independent استئناف spawn', () => {
        const postHop = resolvePostHopChallengeChromeActions({
            stages: [personalFirstInstance, cassation],
            displayStage: cassation,
            displayStageLabel: 'التمييز',
            representedParty: 'المدعي',
            viewingStageIndex: 1,
            activeStageIndex: 1,
            file: PERSONAL_FILE,
        });
        expect(postHop.showRemainingOpponentChallenge).toBe(true);
        expect(postHop.showIndependentClientChallenge).toBe(false);
        expect(postHop.remainingOpponentChallengeLabel).not.toMatch(/استئناف/);
    });

    it('PersonalStatusSmartFileChrome renders remaining chip beside stage rail', () => {
        render(
            <PersonalStatusSmartFileChrome
                {...chromeBase}
                showRemainingOpponentChallenge
                remainingOpponentChallengeLabel="قام الخصم بالتمييز"
                onRemainingOpponentChallenge={vi.fn()}
                showIndependentClientChallenge
                onIndependentClientChallenge={vi.fn()}
            />,
        );

        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.postHopChallengeChrome)).toBeInTheDocument();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.remainingOpponentChallenge)).toHaveTextContent(
            'قام الخصم بالتمييز',
        );
        expect(screen.queryByText('إنشاء طعن استئنافي مستقل')).toBeNull();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.independentChallengeSpawn)).toBeNull();
    });

    it('hides chrome challenge chips when viewing archived', () => {
        render(
            <PersonalStatusSmartFileChrome
                {...chromeBase}
                isViewingArchived
                showRemainingOpponentChallenge
                remainingOpponentChallengeLabel="قام الخصم بالطعن"
                onRemainingOpponentChallenge={vi.fn()}
            />,
        );
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.postHopChallengeChrome)).toBeNull();
    });
});
