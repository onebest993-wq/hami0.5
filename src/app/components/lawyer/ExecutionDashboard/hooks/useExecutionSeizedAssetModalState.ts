import { useState } from 'react';

export function useExecutionSeizedAssetModalState() {
    const [propertySeizureRequestModalOpen, setPropertySeizureRequestModalOpen] = useState(false);
    const [propertySeizureSubjectDraft, setPropertySeizureSubjectDraft] = useState('');
    const [movableSeizureRequestModalOpen, setMovableSeizureRequestModalOpen] = useState(false);
    const [movableSeizureSubjectDraft, setMovableSeizureSubjectDraft] = useState('');

    const [seizedPropertyStepModalOpen, setSeizedPropertyStepModalOpen] = useState(false);
    const [seizedPropertyStepDecisionId, setSeizedPropertyStepDecisionId] = useState<string | null>(null);
    const [seizedPropertyStepPropertyId, setSeizedPropertyStepPropertyId] = useState<string | null>(null);
    const [seizedPropertyStepEntityKind, setSeizedPropertyStepEntityKind] = useState<'property' | 'movable'>(
        'property',
    );
    const [seizedPropertyStepKind, setSeizedPropertyStepKind] = useState<
        'experts' | 'auction' | 'award' | 'reauction_default' | null
    >(null);
    const [seizedPropertyExpertsNamesDraft, setSeizedPropertyExpertsNamesDraft] = useState('');
    const [seizedPropertyExpertReportDateDraft, setSeizedPropertyExpertReportDateDraft] = useState('');
    const [seizedPropertyExpertPriceDraft, setSeizedPropertyExpertPriceDraft] = useState('');
    const [seizedPropertyAuctionDateDraft, setSeizedPropertyAuctionDateDraft] = useState('');
    const [linkSeizureAuctionToAppointments, setLinkSeizureAuctionToAppointments] = useState(true);
    const [seizedPropertyBuyerNameDraft, setSeizedPropertyBuyerNameDraft] = useState('');
    const [seizedPropertyAwardAmountDraft, setSeizedPropertyAwardAmountDraft] = useState('');
    const [seizedPropertyStepNotesDraft, setSeizedPropertyStepNotesDraft] = useState('');

    const [seizedPropertyAuctionResultModalOpen, setSeizedPropertyAuctionResultModalOpen] = useState(false);
    const [seizedPropertyAuctionResultPropertyId, setSeizedPropertyAuctionResultPropertyId] = useState<
        string | null
    >(null);
    const [seizedPropertyAuctionResultEntityKind, setSeizedPropertyAuctionResultEntityKind] = useState<
        'property' | 'movable'
    >('property');
    const [seizedPropertyAuctionResultOutcome, setSeizedPropertyAuctionResultOutcome] = useState<
        'initial_award' | 'no_bidders'
    >('initial_award');
    const [seizedPropertyAuctionResultBuyerNameDraft, setSeizedPropertyAuctionResultBuyerNameDraft] =
        useState('');
    const [seizedPropertyAuctionResultAmountDraft, setSeizedPropertyAuctionResultAmountDraft] =
        useState('');
    const [seizedPropertyAuctionDepositAmountDraft, setSeizedPropertyAuctionDepositAmountDraft] =
        useState('');

    const [seizureMarkModalOpen, setSeizureMarkModalOpen] = useState(false);
    const [seizureMarkModalEntityKind, setSeizureMarkModalEntityKind] = useState<'property' | 'movable'>(
        'property',
    );
    const [seizureMarkModalEntityId, setSeizureMarkModalEntityId] = useState<string | null>(null);
    const [seizureMarkLetterNumberDraft, setSeizureMarkLetterNumberDraft] = useState('');
    const [seizureMarkDateDraft, setSeizureMarkDateDraft] = useState('');
    const [seizureMarkEntityDraft, setSeizureMarkEntityDraft] = useState('');

    const [publicationModalOpen, setPublicationModalOpen] = useState(false);
    const [publicationModalEntityKind, setPublicationModalEntityKind] = useState<'property' | 'movable'>(
        'property',
    );
    const [publicationModalEntityId, setPublicationModalEntityId] = useState<string | null>(null);
    const [publicationNewspaperNameDraft, setPublicationNewspaperNameDraft] = useState('');
    const [publicationDateYmdDraft, setPublicationDateYmdDraft] = useState('');

    const [showRealEstateSeizureModal, setShowRealEstateSeizureModal] = useState(false);
    const [realEstateSeizureModalDecisionId, setRealEstateSeizureModalDecisionId] = useState<string | null>(
        null,
    );

    return {
        propertySeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        setPropertySeizureSubjectDraft,
        movableSeizureRequestModalOpen,
        setMovableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        setMovableSeizureSubjectDraft,
        seizedPropertyStepModalOpen,
        setSeizedPropertyStepModalOpen,
        seizedPropertyStepDecisionId,
        setSeizedPropertyStepDecisionId,
        seizedPropertyStepPropertyId,
        setSeizedPropertyStepPropertyId,
        seizedPropertyStepEntityKind,
        setSeizedPropertyStepEntityKind,
        seizedPropertyStepKind,
        setSeizedPropertyStepKind,
        seizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertsNamesDraft,
        seizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertReportDateDraft,
        seizedPropertyExpertPriceDraft,
        setSeizedPropertyExpertPriceDraft,
        seizedPropertyAuctionDateDraft,
        setSeizedPropertyAuctionDateDraft,
        linkSeizureAuctionToAppointments,
        setLinkSeizureAuctionToAppointments,
        seizedPropertyBuyerNameDraft,
        setSeizedPropertyBuyerNameDraft,
        seizedPropertyAwardAmountDraft,
        setSeizedPropertyAwardAmountDraft,
        seizedPropertyStepNotesDraft,
        setSeizedPropertyStepNotesDraft,
        seizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultModalOpen,
        seizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultPropertyId,
        seizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        seizureMarkModalOpen,
        setSeizureMarkModalOpen,
        seizureMarkModalEntityKind,
        setSeizureMarkModalEntityKind,
        seizureMarkModalEntityId,
        setSeizureMarkModalEntityId,
        seizureMarkLetterNumberDraft,
        setSeizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        setSeizureMarkDateDraft,
        seizureMarkEntityDraft,
        setSeizureMarkEntityDraft,
        publicationModalOpen,
        setPublicationModalOpen,
        publicationModalEntityKind,
        setPublicationModalEntityKind,
        publicationModalEntityId,
        setPublicationModalEntityId,
        publicationNewspaperNameDraft,
        setPublicationNewspaperNameDraft,
        publicationDateYmdDraft,
        setPublicationDateYmdDraft,
        showRealEstateSeizureModal,
        setShowRealEstateSeizureModal,
        realEstateSeizureModalDecisionId,
        setRealEstateSeizureModalDecisionId,
    };
}
