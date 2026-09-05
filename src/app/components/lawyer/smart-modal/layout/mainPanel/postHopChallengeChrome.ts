/**
 * طعن متبقٍ بعد hop أول طعن — يُعرض في شريط المراحل العلوي لا في تذييل المرحلة.
 * الأحوال الشخصية: بلا استئناف مطلقاً (تمييز / اعتراض فقط).
 * تعدد المستحقين: أزرار مسمّاة من resolveTopBarChallengeActions.
 */
import type { CaseStage } from '../../../LawyerShared';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import { buildLitigationMatrixInputFromStage } from '@/app/domain/lawsuit/buildLitigationMatrixFromStage';
import {
    resolveCivilLitigationMatrixDecision,
    type TopBarAction,
} from '@/app/domain/lawsuit/litigationDecisionEngine';
import {
    isPersonalStatusAppealContext,
    isPersonalStatusDossierFromStages,
} from '@/app/components/lawyer/personal-status/personalStatusAppealStageHelpers';
import { findPriorFirstInstanceJudgmentIndex } from '../../smartFile/art172AppealStay';
import { isAbsentObjectionStageName } from '../../smartFile/absentJudgmentStageNames';
import { isAppealStageName, isCassationStageName } from '../../smartFile/judgmentStageNames';
import {
    hasMeritJudgmentRecorded,
    isFirstInstanceStageName,
    isPartialBothInterestStage,
} from '../../smartFile/opponentAppealMethods';
import { resolveClientAppealRole } from '../../smartFile/appealStageJudgmentEngine';
import { resolveRemainingOpponentChallengeFooter } from '../../smartFile/opponentRegistrationContext';

export type ChromeNamedChallengeAction = {
    challengerId: string;
    challengerName: string;
    label: string;
};

export type PostHopChallengeChromeActions = {
    showRemainingOpponentChallenge: boolean;
    remainingOpponentChallengeLabel: string;
    showIndependentClientChallenge: boolean;
    /** تعدد مؤهلين لم يستهلكوا طعنهم — من المحرك النقي */
    namedChallengeActions: ChromeNamedChallengeAction[];
};

function formatNamedActionLabel(action: TopBarAction, _personal: boolean): string {
    const name = action.challengerName || action.challengerId;
    return `طعن مستقل باسم: ${name}`;
}

export function resolvePostHopChallengeChromeActions(params: {
    stages: CaseStage[];
    displayStage?: CaseStage | null;
    displayStageLabel?: string | null;
    representedParty?: string | null;
    isViewingArchived?: boolean;
    viewingStageIndex: number;
    activeStageIndex: number;
    /** فك استئخار م/172 يأخذ أولوية على شريط الطعن المتبقي */
    suppressForArt172Resume?: boolean;
    file?: { lawsuitJurisdiction?: string; selectedType?: string; type?: string } | null;
    parentIntegrity?: string | null;
}): PostHopChallengeChromeActions {
    const idle: PostHopChallengeChromeActions = {
        showRemainingOpponentChallenge: false,
        remainingOpponentChallengeLabel: 'قام الخصم بالطعن',
        showIndependentClientChallenge: false,
        namedChallengeActions: [],
    };
    if (
        params.isViewingArchived
        || params.viewingStageIndex !== params.activeStageIndex
        || params.suppressForArt172Resume
    ) {
        return idle;
    }

    const label = String(
        params.displayStageLabel
        ?? params.displayStage?.stageName
        ?? params.displayStage?.name
        ?? '',
    );
    const personal =
        isPersonalStatusAppealContext(label, params.stages, params.file)
        || isPersonalStatusDossierFromStages(params.stages);

    const onChallenge =
        isAppealStageName(label)
        || isAbsentObjectionStageName(label)
        || isCassationStageName(label);

    const remainingOpponent = resolveRemainingOpponentChallengeFooter({
        stages: params.stages,
        currentStageName: label,
        representedParty: params.representedParty,
        file: params.file,
    });

    const showIndependentClientChallenge = (() => {
        /** الأحوال: لا استئناف — لا زر «طعن استئنافي مستقل» */
        if (personal) return false;
        if (!onChallenge) return false;
        const fiIndex = findPriorFirstInstanceJudgmentIndex(params.stages);
        const fi = fiIndex >= 0 ? params.stages[fiIndex] : undefined;
        if (!fi || !isPartialBothInterestStage(fi)) return false;
        if (
            resolveClientAppealRole(params.displayStage?.parties ?? fi.parties, {
                appealMetadata: params.displayStage?.appealMetadata ?? null,
            }) !== 'appellee'
        ) {
            return false;
        }
        return shouldSpawnIndependentChallengeDossier({
            stages: params.stages,
            sourceStage: fi,
            appealType: 'استئناف',
        });
    })();

    const namedChallengeActions = (() => {
        const fiIndex = findPriorFirstInstanceJudgmentIndex(params.stages);
        const fi = fiIndex >= 0 ? params.stages[fiIndex] : params.displayStage;
        if (!fi) return [] as ChromeNamedChallengeAction[];

        const fiLabel = String(fi.stageName ?? fi.name ?? '');
        const onFiWithJudgment =
            (isFirstInstanceStageName(fiLabel) || personal)
            && hasMeritJudgmentRecorded(fi);
        if (!onChallenge && !onFiWithJudgment) return [];
        /** على البداءة بعد الحكم فقط إن كنا نعرض مرحلة الحكم ذاتها */
        if (!onChallenge) {
            const viewingFi =
                params.viewingStageIndex === fiIndex
                || (
                    isFirstInstanceStageName(label)
                    && hasMeritJudgmentRecorded(params.displayStage)
                );
            if (!viewingFi) return [];
        }

        const matrix = buildLitigationMatrixInputFromStage({
            stage: fi,
            partiesFallback: params.displayStage?.parties ?? fi.parties,
            parentIntegrity: params.parentIntegrity ?? fi.disputeIntegrity,
        });
        if (!matrix) return [];
        const decision = resolveCivilLitigationMatrixDecision(matrix);
        return decision.topBarActions.map((action) => ({
            challengerId: action.challengerId,
            challengerName: action.challengerName,
            label: formatNamedActionLabel(action, personal),
        }));
    })();

    return {
        showRemainingOpponentChallenge: remainingOpponent.show,
        remainingOpponentChallengeLabel: remainingOpponent.label,
        showIndependentClientChallenge,
        namedChallengeActions,
    };
}
