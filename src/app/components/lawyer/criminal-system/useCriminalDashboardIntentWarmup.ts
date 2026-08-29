import { useEffect, useRef } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import type { DecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import type { DecisionsScopeFilter } from './decisionsScopeCore';
import type { InvestigationDefendantsPartyMix } from './juvenileInvestigationRules';
import {
    prefetchCriminalJudicialDecisionsLedger,
    prefetchCriminalPartiesGrid,
    prefetchCriminalRequestsDecisionSurfaces,
    prefetchCriminalTrialsTab,
} from './criminalDashboardIntentPrefetch';
import { defaultDecisionsScopeForStage } from './decisionsScopeCore';

type UseCriminalDashboardIntentWarmupParams = {
    id: string;
    requestsTabActive: boolean;
    hasJuvenileInCase: boolean;
    effectiveUiStage: CaseStage;
    showTrialsTab: boolean;
    decisionsKindFilter: DecisionsLedgerKindFilter;
    setDecisionsKindFilter: (value: DecisionsLedgerKindFilter) => void;
    setDecisionsScopeFilter: (value: DecisionsScopeFilter) => void;
    isInvestigationPhase: boolean;
    investigationDefendantsPartyMix: InvestigationDefendantsPartyMix;
};

/**
 * تسخين استباقي (prefetch) لأثناء وقت الفراغ + مزامنة فلتر نوع القرارات مع مرحلة/تبويب القضية —
 * مستخرَج من الـ runtime دون أي تغيير في المنطق أو الترتيب. لا قيم تُرجَع (تأثيرات فقط).
 */
export function useCriminalDashboardIntentWarmup({
    id,
    requestsTabActive,
    hasJuvenileInCase,
    effectiveUiStage,
    showTrialsTab,
    decisionsKindFilter,
    setDecisionsKindFilter,
    setDecisionsScopeFilter,
    isInvestigationPhase,
    investigationDefendantsPartyMix,
}: UseCriminalDashboardIntentWarmupParams): void {
    useEffect(() => {
        prefetchCriminalPartiesGrid();
    }, [id]);

    useEffect(() => {
        if (!requestsTabActive) return;
        let cancelled = false;
        let idleHandle: number | null = null;
        let timeoutHandle: number | null = null;
        const warmDecisionSurfaces = () => {
            if (cancelled) return;
            prefetchCriminalRequestsDecisionSurfaces();
            prefetchCriminalTrialsTab();
            prefetchCriminalJudicialDecisionsLedger();
        };
        if (typeof requestIdleCallback !== 'undefined') {
            idleHandle = requestIdleCallback(warmDecisionSurfaces, { timeout: 3200 });
        } else {
            timeoutHandle = window.setTimeout(warmDecisionSurfaces, 900);
        }
        return () => {
            cancelled = true;
            if (idleHandle !== null && typeof cancelIdleCallback !== 'undefined') {
                cancelIdleCallback(idleHandle);
            }
            if (timeoutHandle !== null) {
                window.clearTimeout(timeoutHandle);
            }
        };
    }, [id, requestsTabActive]);

    useEffect(() => {
        let cancelled = false;
        let idleHandle: number | null = null;
        let timeoutHandle: number | null = null;
        const schedule = () => {
            if (cancelled) return;
            void import('./legalCodes/legalCodesDataCache').then(({ prefetchLegalCodeArticles }) => {
                if (cancelled) return;
                prefetchLegalCodeArticles(hasJuvenileInCase ? ['penal', 'procedure', 'juvenile'] : ['penal', 'procedure']);
            });
        };
        if (typeof requestIdleCallback !== 'undefined') {
            idleHandle = requestIdleCallback(schedule, { timeout: 2500 });
        } else {
            timeoutHandle = window.setTimeout(schedule, 900);
        }
        return () => {
            cancelled = true;
            if (idleHandle !== null && typeof cancelIdleCallback !== 'undefined') {
                cancelIdleCallback(idleHandle);
            }
            if (timeoutHandle !== null) {
                window.clearTimeout(timeoutHandle);
            }
        };
    }, [id, hasJuvenileInCase]);

    const prevTrialUiStageRef = useRef(effectiveUiStage);
    useEffect(() => {
        const prevStage = prevTrialUiStageRef.current;
        prevTrialUiStageRef.current = effectiveUiStage;
        if (!showTrialsTab && decisionsKindFilter === 'trial_sessions') {
            setDecisionsKindFilter('all');
        }
        if (prevStage !== effectiveUiStage) {
            setDecisionsScopeFilter(defaultDecisionsScopeForStage(effectiveUiStage));
        }
    }, [showTrialsTab, effectiveUiStage, decisionsKindFilter, setDecisionsKindFilter, setDecisionsScopeFilter]);

    useEffect(() => {
        if (isInvestigationPhase) {
            setDecisionsKindFilter(
                investigationDefendantsPartyMix === 'mixed'
                    ? 'all'
                    : investigationDefendantsPartyMix === 'juveniles_only'
                      ? 'juvenile_judicial'
                      : 'judicial',
            );
            return;
        }
        setDecisionsKindFilter(showTrialsTab ? 'trial_sessions' : 'all');
    }, [id, isInvestigationPhase, investigationDefendantsPartyMix, showTrialsTab, setDecisionsKindFilter]);
}
