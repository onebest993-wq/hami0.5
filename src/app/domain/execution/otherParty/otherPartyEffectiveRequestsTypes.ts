import type { ExecutionFile } from '@/app/types/execution';
import type {
    HiddenFollowupVisibilityInput,
    HiddenGuarantorContext,
    HiddenPersonalCoerciveRequestKey,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';
import type { CreditorMirrorWorkflowContext } from './creditorOtherPartyMirrorVisibility';

export type OtherPartyRequestOutcome = 'none' | 'available' | 'effective' | 'pending' | 'rejected' | 'alternative';

export interface OtherPartyRequestBadge {
    id: string;
    label: string;
    shortLabel: string;
    hintAr: string;
    outcome: OtherPartyRequestOutcome;
    statusShort: string;
    decisionId: string | null;
    hasRequest: boolean;
}

export interface OtherPartyCatalogInput {
    claimType: string;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    remainingBalanceIqd?: number;
    executionData?: ExecutionFile | null;
    activeDebtorIsDeceased?: boolean;
    /** وكيل المدين — إظهار ما يظهر لوكيل الدائن فقط (بدون خيارات فارغة) */
    mirrorWorkflow?: CreditorMirrorWorkflowContext;
    /** وكيل المدين — لا قراءة تلقائية من قرارات المنفذ؛ تتبع يدوي فقط */
    debtorAgentManualTrack?: boolean;
}

export interface CatalogEntry {
    id: string;
    label: string;
    shortLabel: string;
    hintAr: string;
    resolve: (decisions: Record<string, unknown>[]) => Record<string, unknown> | null;
}

export type OtherPartyExecutorTabBadge = {
    label: string;
    tone: 'amber' | 'emerald' | 'rose' | 'violet' | 'slate';
};

export type { HiddenPersonalCoerciveRequestKey };
