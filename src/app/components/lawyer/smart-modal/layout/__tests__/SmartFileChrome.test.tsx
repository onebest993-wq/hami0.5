import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SmartFileChrome } from '@/app/components/lawyer/smart-modal/layout/SmartFileChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';

vi.mock('@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton', () => ({
    ColleagueConsultationHeaderButton: () => null,
}));

vi.mock('@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel', () => ({
    CaseFlowActionsPanel: () => null,
}));

const baseProps = {
    onClose: vi.fn(),
    setShowEditInfoModal: vi.fn(),
    isTrashOpen: false,
    setIsTrashOpen: vi.fn(),
    isEditingStageName: false,
    setIsEditingStageName: vi.fn(),
    tempStageName: '',
    setTempStageName: vi.fn(),
    onSaveStageName: vi.fn(),
    stages: [{ id: 's1', stageName: 'مرحلة', isCompleted: false } as never],
    viewingStageIndex: 0,
    activeStageIndex: 0,
    isViewingArchived: false,
    onStageSelect: vi.fn(),
};

describe('SmartFileChrome dossier nav', () => {
    it('يعرض زر الإغلاق فقط في الوضع النافذي', () => {
        render(<SmartFileChrome {...baseProps} />);

        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.dossierBack)).toBeNull();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.dossierExit)).toBeInTheDocument();
    });

    it('يعرض زر الرجوع فقط عند التنقل المتداخل', () => {
        render(<SmartFileChrome {...baseProps} isTrashOpen dossierNestedNav />);

        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.dossierBack)).toBeInTheDocument();
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.dossierExit)).toBeNull();
    });

    it('يعرض طعن الخصم المتبقي بجانب شريط المراحل بعد hop', () => {
        render(
            <SmartFileChrome
                {...baseProps}
                stages={[
                    { id: 's0', stageName: 'بداءة بدرجة أولى', status: 'locked' } as never,
                    { id: 's1', stageName: 'الاستئناف', status: 'active' } as never,
                ]}
                viewingStageIndex={1}
                activeStageIndex={1}
                showRemainingOpponentChallenge
                remainingOpponentChallengeLabel="قام الخصم بالطعن"
                onRemainingOpponentChallenge={vi.fn()}
            />,
        );

        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.postHopChallengeChrome)).toBeInTheDocument();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.remainingOpponentChallenge)).toHaveTextContent(
            'قام الخصم بالطعن',
        );
    });

    it('يعرض أزرار طعن مسمّاة بجانب شريط المراحل', () => {
        const onNamed = vi.fn();
        render(
            <SmartFileChrome
                {...baseProps}
                stages={[
                    {
                        id: 's0',
                        stageName: 'بداءة بدرجة أولى',
                        status: 'active',
                        finalDecision: 'رد الدعوى جزئياً',
                    } as never,
                ]}
                namedChallengeActions={[
                    { challengerId: '1', challengerName: 'أحمد', label: 'طعن مستقل باسم: أحمد' },
                    { challengerId: '2', challengerName: 'سامي', label: 'طعن مستقل باسم: سامي' },
                ]}
                onNamedChallengeAction={onNamed}
            />,
        );

        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.namedChallengeAction('1'))).toHaveTextContent(
            'طعن مستقل باسم: أحمد',
        );
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.namedChallengeAction('2'))).toBeInTheDocument();
        screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.namedChallengeAction('2')).click();
        expect(onNamed).toHaveBeenCalledWith('2');
    });
});
