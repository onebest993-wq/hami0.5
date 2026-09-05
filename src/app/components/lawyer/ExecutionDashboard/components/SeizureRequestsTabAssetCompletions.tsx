import type { InlineActionGateKey } from '../types';
import type { SeizureRequestSubtype } from '@/app/utils/executorSeizureDecisionQueue';
import type { SeizureRequestLaneTab } from './seizureRequestsTabHelpers';

export type SeizureAssetDecisionRow = Record<string, unknown> & {
    id?: string;
    title?: string;
    seizureRequestSavedAt?: string;
};

export type AssetBlockToastOptions = {
    decisionsLink?: boolean;
    decisionId?: string;
    decisionsTab?: 'current' | 'previous' | 'appeals';
    [key: string]: unknown;
};

export type AssetBlockShowToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    options?: AssetBlockToastOptions,
) => void;

export type PropertyCompletionDraft = {
    deedNumber?: string;
    district?: string;
    area?: string;
    notes?: string;
};

export type VehicleCompletionDraft = {
    plate?: string;
    description?: string;
    notes?: string;
};

export type SalaryCompletionDraft = {
    employer?: string;
    salary?: string;
    notes?: string;
};

export type SubmitBasicSeizureRequest = (args: {
    actionType: 'salary' | 'property' | 'vehicle' | 'third_party';
    title: string;
    body: string;
    subtype: SeizureRequestSubtype;
}) => string | null;

export type SharedAssetBlockProps = {
    seizureActionsDisabled: boolean;
    decisions: Record<string, unknown>[];
    resolvedExecutionId: string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    acknowledgeSeizureRequestFromLog: (tab: SeizureRequestLaneTab) => void;
    submitBasicSeizureRequest: SubmitBasicSeizureRequest;
    requestFollowupSeizureDecision?: (
        subtype: 'third_party',
        title: string,
        body: string,
    ) => void;
    openAppeals: (decisionId?: string) => void;
    openDecisions: (decisionId?: string) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    showToast: AssetBlockShowToast;
};
