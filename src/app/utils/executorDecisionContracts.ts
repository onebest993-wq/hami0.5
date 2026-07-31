export const DECISIONS_RELOAD_EVENT = 'hami-decisions-reload';

export function executorDecisionRowHubDefaults(): {
    status: 'pending';
    appealPhase: null;
} {
    return { status: 'pending', appealPhase: null };
}

export type PersonalCoerciveSubtype =
    | 'forced_bring_in'
    | 'arrest_warrant_investigation'
    | 'employee_assignment_investigation'
    | 'travel_ban'
    | 'executive_detention'
    | 'executive_dossier_presentation'
    | 'executive_detention_judge'
    | 'release_debtor';

export const EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES: readonly PersonalCoerciveSubtype[] = [
    'executive_dossier_presentation',
    'executive_detention',
] as const;

export function isExecutiveDossierPresentationSubtype(
    subtype: string | null | undefined,
): subtype is PersonalCoerciveSubtype {
    return EXECUTIVE_DOSSIER_PRESENTATION_SUBTYPES.includes(
        String(subtype || '').trim() as PersonalCoerciveSubtype,
    );
}

export type SeizureRequestSubtype =
    | 'movable'
    | 'movable_auction'
    | 'property'
    | 'salary'
    | 'notice'
    | 'third_party';

export type SeizureRequestTarget = 'debtor' | 'guarantor';

export type EvictionRequestKind =
    | 'eviction_procedure'
    | 'lawyer_fee_payout'
    | 'case_expense'
    | 'unified_collection';

export type UnifiedCollectionDecisionState = 'none' | 'pending' | 'approved' | 'rejected';
