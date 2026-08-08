/** نوع الأصل في دورة حجز التنفيذ — المنقول والعقار يتشاركان نفس الخطوات الثمانية */
export type SeizureAssetKind = 'movable' | 'property';

export type SeizureWorkflowStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const SEIZURE_WORKFLOW_STEP_COUNT = 8;

export const SEIZURE_WORKFLOW_STEP_TITLES: readonly string[] = [
    'تأييد وضع الإشارة',
    'انتداب الخبراء والتقدير',
    'موعد المزايدة أو اعتراض التقدير',
    'لجنة خبراء جديدة (بعد الاعتراض)',
    'النشر والإعلان',
    'نتيجة جلسة المزايدة',
    'إحالة أولية / لا راغب بالشراء',
    'إحالة قطعية وإعادة مزايدة',
];

export type SeizureInlineFocusStep =
    | 'experts'
    | 'auction'
    | 'reauction_default'
    | 'title_transfer'
    | 'buyer_delivery'
    | 'proceeds_disburse';

export type SeizureWorkflowHistoryLine = { label: string; value: string };

export type SeizureEntityBase = {
    id?: string;
    status?: string;
    seizureMarkLetterNumber?: string;
    seizureMarkDate?: string;
    seizureMarkEntity?: string;
    newspaperName?: string;
    publicationDateYmd?: string;
    expertReportDateYmd?: string;
    expertEstimatedAmountIqd?: number | null;
    estimatedPriceIqd?: number | null;
    expertCommitteeSize?: number | null;
    expertNames?: string[];
    experts?: { expertName?: string };
    lastExpertObjectionKind?: string;
    auctionDateYmd?: string;
    auction?: { auctionDateYmd?: string };
    noBiddersRecordedAtIso?: string;
    initialAwardBuyerName?: string;
    initialAwardAmountIqd?: number | null;
    auctionDepositAmountIqd?: number | null;
    finalAwardAmountIqd?: number | null;
    lastBidderOrBuyerName?: string;
    award?: {
        buyerName?: string;
        awardAmountIqd?: number;
        recordedAtIso?: string;
    };
    reauctionDefault?: { recordedAtIso?: string; notes?: string };
    buyerDeliveryCompletedAtIso?: string;
    proceedsDisburseCompletedAtIso?: string;
    titleTransferCompletedAtIso?: string;
};

export type SeizureWorkflowDossierInput = {
    decisionsStorageExecutionId?: string;
    executionId?: string;
    executionDataId?: string;
    executionData?: Record<string, unknown> | null;
};

export type SubmitSeizurePendingRequestInput = {
    dossierId: string;
    entityId: string;
    assetKind: SeizureAssetKind;
    subtype: string;
    requestTitle: string;
    requestBody: string;
    payloadExtra?: Record<string, unknown>;
};

export type SeizureDecisionOutcomeDetail = {
    executionId?: string;
    decisionId?: string;
    requestKind?: string;
    outcome?: 'approved' | 'rejected';
};
