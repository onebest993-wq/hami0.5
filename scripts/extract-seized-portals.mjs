import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);
const start = lines.findIndex((l) => l.includes('{seizedPropertyStepModalOpen &&'));
const end = lines.findIndex((l) => l.includes('{/* BOTTOM SPACER FOR SMOOTH SCROLLING */}'));

if (start < 0 || end < 0 || end <= start) {
    console.error('markers not found', { start, end });
    process.exit(1);
}

const body = lines
    .slice(start, end)
    .map((l) => l.replace(/^                /, ''))
    .join('\n');

const header = `// @ts-nocheck
/** Seized property inline portals — مستخرج من ExecutionDashboard */
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { formatNumberInput } from '@/app/utils/execution/amountInput';

export type ExecutionDashboardSeizedPropertyPortalsProps = Record<string, unknown>;

export function ExecutionDashboardSeizedPropertyPortals(props: ExecutionDashboardSeizedPropertyPortalsProps) {
    const {
        seizedPropertyStepModalOpen,
        seizedPropertyStepEntityKind,
        setSeizedPropertyStepModalOpen,
        seizedPropertyStepKind,
        seizedPropertyStepPropertyId,
        executionData,
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
        saveSeizedPropertyStepDetails,
        seizedPropertyAuctionResultModalOpen,
        seizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        seizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        saveSeizedPropertyAuctionSessionResult,
        seizureMarkModalOpen,
        seizureMarkModalEntityKind,
        setSeizureMarkModalOpen,
        setSeizureMarkModalEntityId,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        seizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        saveSeizureMarkConfirmation,
        publicationModalOpen,
        publicationModalEntityKind,
        setPublicationModalOpen,
        setPublicationModalEntityId,
        setPublicationNewspaperNameDraft,
        setPublicationDateYmdDraft,
        publicationNewspaperNameDraft,
        publicationDateYmdDraft,
        savePublicationDetails,
    } = props as Record<string, any>;

    return (
        <>
`;

const footer = `
        </>
    );
}
`;

const outPath =
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardSeizedPropertyPortals.tsx';
fs.writeFileSync(outPath, header + body + footer);
console.log('written', outPath, { start, end, lines: end - start });
