export type ExecutorDecisionHubDefaults = {
    status: 'pending';
    appealPhase: null;
    appealStatus: 'pending';
    executorOutcome: 'pending';
};

export type DecisionAppealOrigin = 'creditor_side' | 'debtor_side' | 'executor_side';

export type ExecutorRequestKind =
    | 'special_followup'
    | 'guarantor_request'
    | 'trust_disburse'
    | 'third_party_funds_received'
    | 'personal_coercive'
    | 'seizure'
    | 'eviction_procedure'
    | 'lawyer_fee_payout'
    | 'case_expense'
    | 'unified_collection';

export type PersonalCoerciveSubtypeBuilder =
    | 'forced_bring_in'
    | 'arrest_warrant_investigation'
    | 'employee_assignment_investigation'
    | 'travel_ban'
    | 'executive_detention'
    | 'executive_dossier_presentation'
    | 'executive_detention_judge'
    | 'release_debtor';

export type SeizureRequestSubtypeBuilder =
    | 'movable'
    | 'movable_auction'
    | 'property'
    | 'salary'
    | 'notice'
    | 'third_party';

export type SeizureRequestTargetBuilder = 'debtor' | 'guarantor';

export type EvictionWorkflowKeyBuilder =
    | 'field_visit_or_grace'
    | 'eviction'
    | 'break_inventory'
    | 'judicial_custodian'
    | 'police_assistance'
    | 'marital_furniture_delivery'
    | 'encroachment_removal'
    | (string & {});

function buildHubDefaults(): ExecutorDecisionHubDefaults {
    return {
        status: 'pending',
        appealPhase: null,
        appealStatus: 'pending',
        executorOutcome: 'pending',
    };
}

function asTrimmed(value: unknown): string {
    return String(value ?? '').trim();
}

export function buildSpecialFollowupDecisionRow(input: {
    id: string;
    title: string;
    body: string;
    date: string;
    payloadJson?: string;
    appealRequestOrigin?: DecisionAppealOrigin;
}) {
    const payloadJson = asTrimmed(input.payloadJson);
    return {
        id: input.id,
        title: input.title,
        body: input.body,
        date: input.date,
        requestKind: 'special_followup' as const,
        ...(payloadJson ? { payloadJson } : {}),
        ...(input.appealRequestOrigin ? { appealRequestOrigin: input.appealRequestOrigin } : {}),
        ...buildHubDefaults(),
    };
}

export function buildGuarantorFollowupDecisionRow(input: {
    id: string;
    date: string;
}) {
    return {
        id: input.id,
        title: 'طلب إدخال كفيل ضامن',
        body: 'قدم المدين طلباً لإدخال كفيل ضامن في الإضبارة.',
        date: input.date,
        requestKind: 'guarantor_request' as const,
        appealRequestOrigin: 'debtor_side' as const,
        ...buildHubDefaults(),
    };
}

export function buildTrustDisburseDecisionRow(input: {
    id: string;
    date: string;
}) {
    return {
        id: input.id,
        title: 'طلب صرف الأمانات التنفيذية',
        body: 'طلب صرف مبلغ من رصيد الأمانات التنفيذية وفقاً للإجراءات القانونية، مع بيان المبلغ وجهة الصرف وإرفاق السند عند اللزوم.',
        date: input.date,
        requestKind: 'trust_disburse' as const,
        appealRequestOrigin: 'creditor_side' as const,
        ...buildHubDefaults(),
    };
}

export function buildThirdPartyFundsReceivedDecisionRow(input: {
    id: string;
    date: string;
    thirdPartySeizureId: string;
    thirdPartyName: string;
    transferredAmountIqd: number;
}) {
    return {
        id: input.id,
        title: 'طلب تثبيت استلام وتحويل أموال محجوزة لدى الغير',
        body: `طلب تثبيت استلام مبلغ محجوز لدى الغير وتحويله إلى الإضبارة.\nالجهة: ${input.thirdPartyName}\nالمبلغ: ${input.transferredAmountIqd.toLocaleString(
            'ar-IQ',
        )} د.ع.`,
        date: input.date,
        requestKind: 'third_party_funds_received' as const,
        payloadJson: JSON.stringify({
            thirdPartySeizureId: input.thirdPartySeizureId,
            thirdPartyName: input.thirdPartyName,
            transferredAmountIqd: input.transferredAmountIqd,
        }),
        appealRequestOrigin: 'creditor_side' as const,
        ...buildHubDefaults(),
    };
}

export function buildPersonalCoerciveDecisionRow(input: {
    id: string;
    title: string;
    body: string;
    date: string;
    subtype: PersonalCoerciveSubtypeBuilder;
    debtorKey?: string;
}) {
    const debtorKey = asTrimmed(input.debtorKey);
    return {
        id: input.id,
        title: input.title,
        body: input.body,
        date: input.date,
        requestKind: 'personal_coercive' as const,
        appealRequestOrigin: 'creditor_side' as const,
        personalCoerciveSubtype: input.subtype,
        ...(debtorKey ? { personalCoerciveDebtorKey: debtorKey } : {}),
        ...buildHubDefaults(),
    };
}

export function buildSeizureDecisionRow(input: {
    id: string;
    title: string;
    body: string;
    date: string;
    seizurePayloadJson?: string;
    seizureSubtype?: SeizureRequestSubtypeBuilder;
    seizureTarget?: SeizureRequestTargetBuilder;
}) {
    const seizurePayloadJson = asTrimmed(input.seizurePayloadJson);
    return {
        id: input.id,
        title: input.title,
        body: input.body,
        date: input.date,
        requestKind: 'seizure' as const,
        appealRequestOrigin: 'creditor_side' as const,
        ...(seizurePayloadJson ? { seizurePayloadJson } : {}),
        ...(input.seizureSubtype ? { seizureSubtype: input.seizureSubtype } : {}),
        ...(input.seizureTarget ? { seizureTarget: input.seizureTarget } : {}),
        ...buildHubDefaults(),
    };
}

export function buildEvictionExecutorDecisionRow(input: {
    id: string;
    title: string;
    body: string;
    date: string;
    requestKind: Extract<
        ExecutorRequestKind,
        'eviction_procedure' | 'lawyer_fee_payout' | 'case_expense' | 'unified_collection'
    >;
    evictionWorkflowKey?: EvictionWorkflowKeyBuilder;
}) {
    return {
        id: input.id,
        title: input.title,
        body: input.body,
        date: input.date,
        requestKind: input.requestKind,
        appealRequestOrigin: 'creditor_side' as const,
        ...(input.evictionWorkflowKey ? { evictionWorkflowKey: input.evictionWorkflowKey } : {}),
        ...buildHubDefaults(),
    };
}
