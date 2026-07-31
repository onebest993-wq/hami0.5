import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionDashboardSeizedPropertyPortals } from '../ExecutionDashboardSeizedPropertyPortals';

describe('ExecutionDashboardSeizedPropertyPortals', () => {
    function buildProps(): Parameters<typeof ExecutionDashboardSeizedPropertyPortals>[0] {
        return {
            seizedPropertyStepModalOpen: false,
            seizedPropertyStepEntityKind: 'property',
            setSeizedPropertyStepModalOpen: vi.fn(),
            seizedPropertyStepKind: 'experts',
            seizedPropertyStepPropertyId: 'property-1',
            executionData: {
                seizedProperties: [
                    {
                        id: 'property-1',
                        propertyNo: '12',
                        district: 'الكرخ',
                        status: 'seized',
                        seizedAtIso: '2026-07-11T10:00:00.000Z',
                        expertCommitteeSize: 3,
                    },
                ],
                seizedMovables: [],
            },
            seizedPropertyExpertsNamesDraft: '',
            setSeizedPropertyExpertsNamesDraft: vi.fn(),
            seizedPropertyExpertReportDateDraft: '',
            setSeizedPropertyExpertReportDateDraft: vi.fn(),
            seizedPropertyExpertPriceDraft: '',
            setSeizedPropertyExpertPriceDraft: vi.fn(),
            seizedPropertyAuctionDateDraft: '',
            setSeizedPropertyAuctionDateDraft: vi.fn(),
            linkSeizureAuctionToAppointments: false,
            setLinkSeizureAuctionToAppointments: vi.fn(),
            seizedPropertyBuyerNameDraft: '',
            setSeizedPropertyBuyerNameDraft: vi.fn(),
            seizedPropertyAwardAmountDraft: '',
            setSeizedPropertyAwardAmountDraft: vi.fn(),
            seizedPropertyStepNotesDraft: '',
            setSeizedPropertyStepNotesDraft: vi.fn(),
            saveSeizedPropertyStepDetails: vi.fn(),
            seizedPropertyAuctionResultModalOpen: false,
            seizedPropertyAuctionResultEntityKind: 'property',
            setSeizedPropertyAuctionResultModalOpen: vi.fn(),
            setSeizedPropertyAuctionResultPropertyId: vi.fn(),
            setSeizedPropertyAuctionResultEntityKind: vi.fn(),
            setSeizedPropertyAuctionResultOutcome: vi.fn(),
            setSeizedPropertyAuctionResultBuyerNameDraft: vi.fn(),
            setSeizedPropertyAuctionResultAmountDraft: vi.fn(),
            setSeizedPropertyAuctionDepositAmountDraft: vi.fn(),
            seizedPropertyAuctionResultOutcome: 'initial_award',
            seizedPropertyAuctionResultBuyerNameDraft: '',
            seizedPropertyAuctionResultAmountDraft: '',
            seizedPropertyAuctionDepositAmountDraft: '',
            saveSeizedPropertyAuctionSessionResult: vi.fn(),
            seizureMarkModalOpen: false,
            seizureMarkModalEntityKind: 'property',
            setSeizureMarkModalOpen: vi.fn(),
            setSeizureMarkModalEntityId: vi.fn(),
            setSeizureMarkLetterNumberDraft: vi.fn(),
            setSeizureMarkDateDraft: vi.fn(),
            setSeizureMarkEntityDraft: vi.fn(),
            seizureMarkLetterNumberDraft: '',
            seizureMarkDateDraft: '',
            seizureMarkEntityDraft: '',
            saveSeizureMarkConfirmation: vi.fn(),
            publicationModalOpen: false,
            publicationModalEntityKind: 'property',
            setPublicationModalOpen: vi.fn(),
            setPublicationModalEntityId: vi.fn(),
            setPublicationNewspaperNameDraft: vi.fn(),
            setPublicationDateYmdDraft: vi.fn(),
            publicationNewspaperNameDraft: '',
            publicationDateYmdDraft: '',
            savePublicationDetails: vi.fn(),
        };
    }

    it('renders nothing when every portal is closed', () => {
        const { container } = render(<ExecutionDashboardSeizedPropertyPortals {...buildProps()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the experts modal with the committee size label and saves the step', () => {
        const props = buildProps();
        props.seizedPropertyStepModalOpen = true;

        render(<ExecutionDashboardSeizedPropertyPortals {...props} />);

        expect(screen.getByText('تسجيل تقرير الخبراء')).toBeInTheDocument();
        expect(screen.getByText(/مطلوب 3 خبراء/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
        expect(props.saveSeizedPropertyStepDetails).toHaveBeenCalledTimes(1);
    });

    it('closes and resets the publication portal on backdrop click', () => {
        const props = buildProps();
        props.publicationModalOpen = true;

        render(<ExecutionDashboardSeizedPropertyPortals {...props} />);

        fireEvent.click(screen.getByRole('presentation'));

        expect(props.setPublicationModalOpen).toHaveBeenCalledWith(false);
        expect(props.setPublicationModalEntityId).toHaveBeenCalledWith(null);
        expect(props.setPublicationNewspaperNameDraft).toHaveBeenCalledWith('');
        expect(props.setPublicationDateYmdDraft).toHaveBeenCalledWith('');
    });
});
