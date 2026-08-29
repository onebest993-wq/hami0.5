import type { HamiIcon } from '@/app/components/ui/icons/hamiIcon';
import { Building2 } from 'lucide-react';
import { Shield } from '@/app/components/ui/icons/Shield';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { Package } from '@/app/components/ui/icons/Package';
import type { ExecutionFile } from '@/app/types/execution';
import type { InlineActionGateKey } from '../types';
import type {
    HiddenFollowupVisibilityInput,
    HiddenGuarantorContext,
    HiddenGuarantorRequestKey,
} from './hiddenFollowupRequestsUtils';
import type { ExecutionDomainContext } from '@/app/utils/executionDomainIsolation';

export const GUARANTOR_ICONS: Record<
    HiddenGuarantorRequestKey,
    HamiIcon
> = {
    guarantor_request: Shield,
    guarantor_seizure_salary: Wallet,
    guarantor_seizure_property: Building2,
    guarantor_seizure_movable: Package,
};

export function gateKeyForGuarantor(key: HiddenGuarantorRequestKey): InlineActionGateKey {
    if (key === 'guarantor_request') return 'hidden_guarantor_amount';
    if (key === 'guarantor_seizure_salary') return 'hidden_guarantor_salary';
    if (key === 'guarantor_seizure_property') return 'hidden_guarantor_property';
    return 'hidden_guarantor_movable';
}

export function seizureKindForKey(
    key: HiddenGuarantorRequestKey,
): 'salary' | 'property' | 'movable' | null {
    if (key === 'guarantor_seizure_salary') return 'salary';
    if (key === 'guarantor_seizure_property') return 'property';
    if (key === 'guarantor_seizure_movable') return 'movable';
    return null;
}

export interface HiddenGuarantorRequestOptionsProps {
    executionId: string;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
    domainContext?: ExecutionDomainContext | null;
    executionData: ExecutionFile | null;
    /** عند التضمين من قائمة موحّدة — يُعرض لوحة التفاصيل فقط */
    embeddedSelectedKey?: HiddenGuarantorRequestKey;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    handleGuarantorRequestFromFollowup: () => void;
    requestGuarantorSeizure: (
        kind: 'salary' | 'movable' | 'property',
        opts?: { inline?: boolean },
    ) => void;
    onOpenDecisions: (opts?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}
