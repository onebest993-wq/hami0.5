import { Bell, Calendar, MapPin, Phone, X } from '@/app/components/ui/lucideIcons';
import { ColleagueConsultationProvider } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import SecureStoreService from '@/app/services/SecureStoreService';
import { PerformanceMonitor } from '@/app/utils/performanceMonitor';
import { ExecutionDashboardSkeleton } from '@/app/components/ui/Skeleton';
import { ExecutionToast } from './ExecutionToast';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
} from './ExecutionInlineAccordion';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
} from '@/app/utils/executorApprovalWorkflow';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import {
    PUBLICATION_NOTICE_DURATION_DAYS,
    getPublicationNoticeForDebtorKey,
    publicationNoticeDeadlineYmd,
} from '@/app/utils/publicationNoticeDebtor';
import {
    HAMI_RESIDENTIAL_GRACE_CLEARED,
} from '@/app/utils/residentialEvictionGrace';
import * as PhoneBodyLazyFallback from '../executionDashboardLazyRegistry';
import {
    PartyOverflowToggle,
} from '../executionDashboardLazyShellUi';

export type ExecutionDashboardPhoneBodyProps = Record<string, unknown>;

export function withPhoneBodyScopeFallback(scope: Record<string, unknown>): Record<string, unknown> {
    const out = { ...scope };
    for (const [key, value] of Object.entries(PhoneBodyLazyFallback)) {
        if ((key.startsWith('Lazy') || key.startsWith('prefetch')) && out[key] == null && value != null) {
            out[key] = value;
        }
    }
    const componentFallbacks: Record<string, unknown> = {
        ColleagueConsultationProvider,
        ExecutionDashboardSkeleton,
        PerformanceMonitor,
        SecureStoreService,
        SmartDialog,
        Bell,
        Calendar,
        DebtorSeizureCategoryBadges,
        EVICTION_TIMELINE_ACTION_IDS,
        EVICTION_WORKFLOW_BY_ACTION_ID,
        ExecutionInlineAccordion,
        ExecutionInlineExecutorDecisionActions,
        ExecutionPartyInteractiveBadges,
        ExecutionToast,
        FollowupSectionLinkCheckbox,
        HAMI_RESIDENTIAL_GRACE_CLEARED,
        MapPin,
        PartyOverflowToggle,
        Phone,
        PUBLICATION_NOTICE_DURATION_DAYS,
        X,
        getPublicationNoticeForDebtorKey,
        publicationNoticeDeadlineYmd,
        dossierLifecyclePanelOpen: false,
        dossierLifecyclePanelPhase: 'menu',
        dossierPendingStatus: null,
        setDossierLifecyclePanelOpen: () => undefined,
        setDossierLifecyclePanelPhase: () => undefined,
        setDossierPendingStatus: () => undefined,
        seizedMovablesForSeizureLog: [],
        seizedPropertiesForSeizureLog: [],
        seizureLogExecutorDecisions: [],
    };
    for (const [key, value] of Object.entries(componentFallbacks)) {
        if (out[key] == null && value != null) {
            out[key] = value;
        }
    }
    if (typeof out.toggleHeaderExpanded !== 'function') {
        out.toggleHeaderExpanded = () => undefined;
    }
    return out;
}

export function phoneBodyPropsEqual(
    prev: ExecutionDashboardPhoneBodyProps,
    next: ExecutionDashboardPhoneBodyProps,
): boolean {
    const a = prev.renderFingerprint;
    const b = next.renderFingerprint;
    if (typeof a === 'string' && typeof b === 'string' && a.length > 0) {
        return a === b;
    }
    return false;
}
