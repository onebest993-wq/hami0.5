import { useMemo } from 'react';
import {
    actionTypeOptions,
    isIqrarRequest,
    JUDICIAL_ACKNOWLEDGMENT_PRIMARY,
    URGENT_PETITION_PRIMARY,
} from '@/app/domain/urgent/formPathwayConstants';
import { getDynamicPartyLabels } from '../utils/partyLabels';
import type { JudgeDecision } from '../types';

export type OrderFilePartyEntry = Record<string, unknown> & {
    name: string;
    isRepresented?: boolean;
};

export type UseOrderFilePartyWorkspaceArgs = {
    caseData: any;
    judgeDecision: JudgeDecision;
    guaranteeSubmitted: boolean;
    resolvedWorkspaceRequestType: string;
    isIqrarContext: boolean;
    isStateOrder: boolean;
    isOrderOnPetition: boolean;
    isUrgentLawsuit: boolean;
    isUrgentJustice: boolean;
};

export function useOrderFilePartyWorkspace({
    caseData,
    judgeDecision,
    guaranteeSubmitted,
    resolvedWorkspaceRequestType,
    isIqrarContext,
    isStateOrder,
    isOrderOnPetition,
    isUrgentLawsuit,
    isUrgentJustice,
}: UseOrderFilePartyWorkspaceArgs) {
    const rawParty1Entries = Array.isArray(caseData?.allParty1) ? (caseData.allParty1 as any[]) : [];
    const rawParty2Entries = Array.isArray(caseData?.allParty2) ? (caseData.allParty2 as any[]) : [];
    const legacyRepresentedSide =
        caseData?.representedParty === 'client' || caseData?.representedParty === 'opponent'
            ? caseData.representedParty
            : null;
    const party1HasRepresentedFlag = rawParty1Entries.some((p) => typeof p?.isRepresented === 'boolean');
    const party2HasRepresentedFlag = rawParty2Entries.some((p) => typeof p?.isRepresented === 'boolean');

    const party1Entries: OrderFilePartyEntry[] = (
        rawParty1Entries.length
            ? rawParty1Entries
            : [{ name: caseData?.party1Name ?? '', phone: caseData?.party1Phone ?? '' }]
    ).map((p, index) => ({
        ...p,
        name: String(p?.name ?? '').trim(),
        isRepresented:
            typeof p?.isRepresented === 'boolean'
                ? p.isRepresented
                : !party1HasRepresentedFlag && legacyRepresentedSide === 'client' && index === 0,
    }));

    const party2Entries: OrderFilePartyEntry[] = (
        rawParty2Entries.length
            ? rawParty2Entries
            : [{ name: caseData?.party2Name ?? '', address: caseData?.party2Address ?? '' }]
    ).map((p, index) => ({
        ...p,
        name: String(p?.name ?? '').trim(),
        isRepresented:
            typeof p?.isRepresented === 'boolean'
                ? p.isRepresented
                : !party2HasRepresentedFlag && legacyRepresentedSide === 'opponent' && index === 0,
    }));

    const isDefendantClient = party2Entries.some((p) => !!(p as any)?.isClient || !!(p as any)?.isRepresented);
    const representedSide =
        party1Entries.some((p) => !!p?.isRepresented) && !party2Entries.some((p) => !!p?.isRepresented)
            ? 'client'
            : party2Entries.some((p) => !!p?.isRepresented) && !party1Entries.some((p) => !!p?.isRepresented)
              ? 'opponent'
              : null;

    const defenderEntryPhase = useMemo(() => {
        if (!isDefendantClient || !isStateOrder) return 1;
        const v = Number((caseData as any)?.defenderEntryPhase);
        return v === 2 || v === 3 ? v : 1;
    }, [caseData, isDefendantClient, isStateOrder]);

    const defenderPhase1ReadOnly = defenderEntryPhase >= 2 && isDefendantClient && isStateOrder;
    const defenderPhase2ReadOnly = defenderEntryPhase >= 3 && isDefendantClient && isStateOrder;

    const procedureTypeTitle = useMemo(() => {
        const raw = String(caseData?.specificActionType || '').trim();
        if (isIqrarRequest(raw)) return 'إقرار قضائي / حجة إقرار';
        if (!raw) return 'أمر ولائي';
        const primary = raw.split('/')[0]?.trim();
        return primary || raw;
    }, [caseData?.specificActionType]);

    const khulasaText = useMemo(() => {
        return String((caseData as any)?.khulasatAlTalab ?? (caseData as any)?.khulasa ?? '').trim();
    }, [caseData]);

    const partyLabels = useMemo(
        () => getDynamicPartyLabels(String(caseData?.specificActionType ?? '').trim()),
        [caseData?.specificActionType],
    );

    const guaranteeGateActive =
        (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') &&
        judgeDecision.requiresGuarantee &&
        !guaranteeSubmitted;

    const finalityReason = String((caseData as any)?.finalityReason || '').trim();
    const isFinalityNoGrievance = finalityReason === 'no_grievance';
    const isFinalityTerminatedRequest = finalityReason === 'terminated_request';
    const isFinalized =
        !!caseData?.archived ||
        (caseData as any)?.status === 'completed' ||
        (caseData as any)?.status === 'closed' ||
        (caseData as any)?.phase === 'completed';

    const workspaceTypeDetail = useMemo(() => {
        const raw = String(caseData?.specificActionType ?? resolvedWorkspaceRequestType ?? '').trim();
        const leafOptions = [
            ...actionTypeOptions.state_order,
            ...actionTypeOptions.urgent_discovery,
            ...actionTypeOptions.acknowledgment,
        ];
        if (leafOptions.includes(raw)) return raw;
        if (!raw || raw === URGENT_PETITION_PRIMARY || raw === JUDICIAL_ACKNOWLEDGMENT_PRIMARY) {
            const fallback = String((caseData as any)?.requestSubject ?? '').trim();
            return fallback || '—';
        }
        if (raw.includes('/')) {
            const parts = raw.split('/').map((p) => p.trim()).filter(Boolean);
            return parts[0] || raw;
        }
        return raw;
    }, [caseData, resolvedWorkspaceRequestType]);

    const workspaceHeaderTitle = useMemo(() => {
        const detail = workspaceTypeDetail;
        if (isIqrarContext) {
            if (isFinalized && !!caseData?.archived) return `إقرار مؤرشف: ${detail}`;
            return `إقرار: ${detail}`;
        }
        if (isStateOrder || isOrderOnPetition) return `أمر ولائي: ${detail}`;
        if (isUrgentLawsuit || isUrgentJustice) return `طلب مستعجل: ${detail}`;
        return `مسار قضائي: ${detail}`;
    }, [
        workspaceTypeDetail,
        isIqrarContext,
        isFinalized,
        caseData?.archived,
        isStateOrder,
        isOrderOnPetition,
        isUrgentLawsuit,
        isUrgentJustice,
    ]);

    return {
        party1Entries,
        party2Entries,
        isDefendantClient,
        representedSide,
        defenderEntryPhase,
        defenderPhase1ReadOnly,
        defenderPhase2ReadOnly,
        procedureTypeTitle,
        khulasaText,
        partyLabels,
        guaranteeGateActive,
        isFinalityNoGrievance,
        isFinalityTerminatedRequest,
        isFinalized,
        workspaceTypeDetail,
        workspaceHeaderTitle,
    };
}
