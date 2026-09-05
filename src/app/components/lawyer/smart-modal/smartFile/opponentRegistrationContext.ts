import type { CaseStage } from '../../LawyerShared';
import {
    remainingGhayabiObjectionPartyIds,
    remainingPresentAppealPartyIds,
    resolveRemainingOpponentChallengeMethods,
} from '@/app/domain/lawsuit/opponentChallengeTracks';
import {
    JUDGMENT_FORM_GHIABI,
    isPresentLikeJudgmentForm,
    normalizePartyJudgmentDispositions,
    partyDispositionId,
    resolveClientDefendantJudgmentForm,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    filterPersonalStatusAppealMethods,
    isPersonalStatusAppealContext,
    isPersonalStatusDossierFromStages,
} from '@/app/components/lawyer/personal-status/personalStatusAppealStageHelpers';
import { findPriorFirstInstanceJudgmentIndex } from './art172AppealStay';
import { isAppealStageName, isCassationStageName } from './judgmentStageNames';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';
import { isGhayabiObjectionAppealType } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import { resolveClientMarkedParty } from './clientMarkedParty';
import { isDefendantRepresentedParty, isPlaintiffRepresentedParty } from './representedPartySide';

export function resolveOpponentChallengeHopSource(
    stages: CaseStage[],
    activeIndex: number,
    appealType: string,
): { index: number; stage: CaseStage } {
    const current = stages[activeIndex];
    if (!current) return { index: Math.max(0, activeIndex), stage: current as CaseStage };
    const fiIndex = findPriorFirstInstanceJudgmentIndex(stages);
    const fi = fiIndex >= 0 ? stages[fiIndex] : undefined;
    const currentName = String(current.stageName ?? current.name ?? '');
    const onChallenge =
        isAppealStageName(currentName)
        || isAbsentObjectionStageName(currentName)
        || isCassationStageName(currentName);

    if (!onChallenge || fiIndex < 0 || !fi) {
        return { index: activeIndex, stage: current };
    }

    if (isGhayabiObjectionAppealType(appealType) && fiIndex !== activeIndex) {
        return { index: fiIndex, stage: fi };
    }

    if (
        !isGhayabiObjectionAppealType(appealType)
        && isAbsentObjectionStageName(currentName)
        && remainingPresentAppealPartyIds(fi.partyChallengeLanes, fi.partyJudgmentDispositions).length > 0
    ) {
        return { index: fiIndex, stage: fi };
    }

    return { index: activeIndex, stage: current };
}

export function firstInstanceHasAppealStage(stages?: CaseStage[] | null): boolean {
    return (stages ?? []).some((stage) => isAppealStageName(String(stage.stageName ?? '')));
}

export function firstInstanceHasObjectionStage(stages?: CaseStage[] | null): boolean {
    return (stages ?? []).some((stage) => isAbsentObjectionStageName(String(stage.stageName ?? '')));
}

export function resolveRemainingOpponentChallengeFooter(params: {
    stages: CaseStage[];
    currentStageName?: string | null;
    representedParty?: string | null;
    /** لتمييز إضبارة الأحوال — بلا استئناف مطلقاً */
    file?: { lawsuitJurisdiction?: string; selectedType?: string; type?: string } | null;
}): { show: boolean; methods: string[]; label: string } {
    const fiIndex = findPriorFirstInstanceJudgmentIndex(params.stages);
    const fi = fiIndex >= 0 ? params.stages[fiIndex] : undefined;
    const currentName = String(params.currentStageName ?? '');
    const onChallenge =
        isAppealStageName(currentName)
        || isAbsentObjectionStageName(currentName)
        || isCassationStageName(currentName);
    if (!fi || !onChallenge) {
        return { show: false, methods: [], label: 'قام الخصم بالطعن' };
    }
    const personal =
        isPersonalStatusAppealContext(currentName, params.stages, params.file)
        || isPersonalStatusDossierFromStages(params.stages);
    const hasObjectionStage = firstInstanceHasObjectionStage(params.stages);
    const hasAppealStageFromFirstInstance = firstInstanceHasAppealStage(params.stages);
    let methods = resolveRemainingOpponentChallengeMethods({
        lanes: fi.partyChallengeLanes,
        dispositions: fi.partyJudgmentDispositions,
        hasObjectionStage,
        hasAppealStageFromFirstInstance,
    });
    if (isDefendantRepresentedParty(params.representedParty)) {
        const client = resolveClientMarkedParty(fi.parties);
        const clientId = partyDispositionId(client);
        const clientForm = resolveClientDefendantJudgmentForm(
            fi.parties,
            normalizePartyJudgmentDispositions(fi.partyJudgmentDispositions),
        );
        const scoped: string[] = [];
        const ghayabiPending =
            clientForm === JUDGMENT_FORM_GHIABI
            && Boolean(clientId)
            && remainingGhayabiObjectionPartyIds(fi.partyChallengeLanes, fi.partyJudgmentDispositions).includes(clientId);
        if (ghayabiPending) {
            if (methods.includes('اعتراض غيابي')) scoped.push('اعتراض غيابي');
            if (methods.includes('استئناف')) scoped.push('استئناف');
            if (methods.includes('تمييز')) scoped.push('تمييز');
        }
        if (
            isPresentLikeJudgmentForm(clientForm)
            && clientId
            && remainingPresentAppealPartyIds(fi.partyChallengeLanes, fi.partyJudgmentDispositions).includes(clientId)
        ) {
            if (methods.includes('استئناف') && !scoped.includes('استئناف')) scoped.push('استئناف');
            if (methods.includes('تمييز') && !scoped.includes('تمييز')) scoped.push('تمييز');
        }
        methods = scoped;
    } else if (!isPlaintiffRepresentedParty(params.representedParty) && params.representedParty) {
        methods = [];
    }
    if (personal) {
        methods = filterPersonalStatusAppealMethods(methods);
    }
    const label =
        methods.length === 1 && methods[0] === 'اعتراض غيابي'
            ? 'قام الغائب بالاعتراض'
            : methods.length === 1 && methods[0] === 'تمييز'
              ? 'قام الخصم بالتمييز'
              : methods.includes('استئناف') && !methods.includes('اعتراض غيابي')
                ? 'قام الحاضر بالاستئناف'
                : 'قام الخصم بالطعن';
    return {
        show: methods.length > 0,
        methods,
        label,
    };
}

export function resolveFirstInstanceActionSource(
    stages: CaseStage[],
    currentStage: CaseStage,
): { index: number; stage: CaseStage } {
    const fiIndex = findPriorFirstInstanceJudgmentIndex(stages);
    if (fiIndex >= 0 && stages[fiIndex]) {
        return { index: fiIndex, stage: stages[fiIndex] };
    }
    const fallback = stages.findIndex((stage) => stage.id === currentStage.id);
    return {
        index: fallback >= 0 ? fallback : 0,
        stage: currentStage,
    };
}

export function resolveOpponentRegistrationModalSource(
    stages: CaseStage[],
    currentStage: CaseStage,
): CaseStage {
    const remaining = resolveRemainingOpponentChallengeFooter({
        stages,
        currentStageName: currentStage.stageName ?? currentStage.name,
    });
    if (!remaining.show) return currentStage;
    return resolveFirstInstanceActionSource(stages, currentStage).stage;
}
