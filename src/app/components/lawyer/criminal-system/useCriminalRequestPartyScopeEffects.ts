import { useEffect } from 'react';
import type { CriminalDefendant } from './criminalStore';
import { filterSelectableDefendantsForScope } from './partyPersonalStage';
import { isDefendantTargetRequestTemplate } from './requestPartySelection';
import type { CriminalActionParty } from './criminalStagePresentationCore';

export type CriminalRequestPartyScopeEffectsArgs = {
    isRequestsModalOpen: boolean;
    isRequestModalViewOnly: boolean;
    reqNeedsPurgeDefendantScope: boolean;
    isJuvenileJudgeDecisionEntry: boolean;
    isAdultInvestigationJudicialEntry: boolean;
    showRequestPartySection: boolean;
    defendants: CriminalDefendant[];
    reqTypeTemplate: string;
    requestEligibleParties: CriminalActionParty[];
    reqDefendantIds: string[];
    setReqDefendantIds: (ids: string[] | ((prev: string[]) => string[])) => void;
};

export function useCriminalRequestPartyScopeEffects(args: CriminalRequestPartyScopeEffectsArgs): void {
    const {
        isRequestsModalOpen,
        isRequestModalViewOnly,
        reqNeedsPurgeDefendantScope,
        isJuvenileJudgeDecisionEntry,
        isAdultInvestigationJudicialEntry,
        showRequestPartySection,
        defendants,
        reqTypeTemplate,
        requestEligibleParties,
        reqDefendantIds,
        setReqDefendantIds,
    } = args;

    useEffect(() => {
        if (!isRequestsModalOpen || !reqNeedsPurgeDefendantScope || isRequestModalViewOnly) return;
        const selectable = filterSelectableDefendantsForScope(defendants);
        if (selectable.length === 1) {
            setReqDefendantIds([selectable[0]!.id]);
        }
    }, [isRequestsModalOpen, reqNeedsPurgeDefendantScope, isRequestModalViewOnly, defendants, reqTypeTemplate, setReqDefendantIds]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly || !isJuvenileJudgeDecisionEntry) return;
        if (requestEligibleParties.length !== 1) return;
        const soleId = requestEligibleParties[0]!.id;
        if (reqDefendantIds[0] !== soleId) setReqDefendantIds([soleId]);
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        isJuvenileJudgeDecisionEntry,
        requestEligibleParties,
        reqDefendantIds,
        setReqDefendantIds,
    ]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly || !isAdultInvestigationJudicialEntry) return;
        if (!isDefendantTargetRequestTemplate(reqTypeTemplate)) return;
        if (requestEligibleParties.length !== 1) return;
        const soleId = requestEligibleParties[0]!.id;
        if (reqDefendantIds[0] !== soleId) setReqDefendantIds([soleId]);
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        isAdultInvestigationJudicialEntry,
        reqTypeTemplate,
        requestEligibleParties,
        reqDefendantIds,
        setReqDefendantIds,
    ]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly) return;
        if (!showRequestPartySection) return;
        if (requestEligibleParties.length === 1 && reqDefendantIds.length === 0) {
            setReqDefendantIds([requestEligibleParties[0]!.id]);
        }
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        showRequestPartySection,
        reqTypeTemplate,
        requestEligibleParties,
        reqDefendantIds.length,
        setReqDefendantIds,
    ]);

}
