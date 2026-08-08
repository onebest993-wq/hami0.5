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
});
