import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AbsentJudgmentNotificationModal } from '../AbsentJudgmentNotificationModal';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../../smartFile/civilLawsuitTestIds';

describe('AbsentJudgmentNotificationModal', () => {
    it('يفرض اختيار الغائب عند تعدد غير المبلَّغين', () => {
        const onConfirm = vi.fn();
        render(
            <AbsentJudgmentNotificationModal
                isOpen
                onClose={() => undefined}
                onConfirm={onConfirm}
                ghayabiParties={[
                    { partyId: '2', name: 'سامي' },
                    { partyId: '3', name: 'كريم' },
                ]}
            />,
        );
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption('2'))).toHaveTextContent('سامي');
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption('3'))).toHaveTextContent('كريم');
        expect(screen.getByRole('button', { name: 'حفظ التبليغ' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'حفظ التبليغ' }));
        expect(onConfirm).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption('3')));
        expect(screen.getByRole('button', { name: 'حفظ التبليغ' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'حفظ التبليغ' }));
        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ partyId: '3', partyIds: ['3'] }),
        );
    });

    it('يسمح باختيار أكثر من غائب في حفظ واحد', () => {
        const onConfirm = vi.fn();
        render(
            <AbsentJudgmentNotificationModal
                isOpen
                onClose={() => undefined}
                onConfirm={onConfirm}
                ghayabiParties={[
                    { partyId: '2', name: 'سامي' },
                    { partyId: '3', name: 'كريم' },
                ]}
            />,
        );
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption('2')));
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption('3')));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption('2'))).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption('3'))).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        fireEvent.click(screen.getByRole('button', { name: 'حفظ التبليغ' }));
        expect(onConfirm).toHaveBeenCalledWith(
            expect.objectContaining({ partyIds: ['2', '3'], partyId: '2' }),
        );
    });
});
