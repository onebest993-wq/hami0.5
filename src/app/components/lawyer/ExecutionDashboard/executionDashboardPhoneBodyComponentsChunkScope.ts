// @ts-nocheck
/** مكونات PhoneBody المُمرَّرة عبر chunk scope */
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { DossierSwitcher } from './components/DossierSwitcher';
import { ExecutionToast } from './components/ExecutionToast';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
} from './components/ExecutionInlineAccordion';
import { GuarantorExternalHub } from './components/GuarantorExternalHub';
import { InlineActionGate } from './components/InlineActionGate';
import { UnifiedSeizureLogHost } from './components/UnifiedSeizureLogHost';

export const EXECUTION_DASHBOARD_PHONE_BODY_COMPONENTS_CHUNK_SCOPE = {
    DebtorSeizureCategoryBadges,
    DossierSwitcher,
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    ExecutionPartyInteractiveBadges,
    ExecutionToast,
    FollowupSectionLinkCheckbox,
    GuarantorExternalHub,
    InlineActionGate,
    UnifiedSeizureLogHost,
} as const;

export function spreadExecutionDashboardPhoneBodyComponentsChunkScope(): Record<string, unknown> {
    return EXECUTION_DASHBOARD_PHONE_BODY_COMPONENTS_CHUNK_SCOPE as unknown as Record<string, unknown>;
}
