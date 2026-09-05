import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { isPersonalStatusAppealContext } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { isBeginningPleadingStageName } from './pleadingStageClassification';
import { qualifyExtraordinaryPleadingStageName } from './extraordinaryPleadingStageName';
import type { CaseStage, IncidentalCase, StageOutcome, TimelineEvent } from '../../LawyerShared';
import { isCassationStageName, isFirstInstanceStageName } from './judgmentTypes';
import { isGhayabiObjectionAppealType } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import { isAppellantAppealRole } from './partyRoleClassification';
import { buildAppealStageParties } from './appealPartyEngine';
import { collectTransferableAttachments } from './appealStageTransitionShared';
import {
    buildStageTransitionMetadata,
    mergeAppealStageMetadata,
} from './judgmentStageMetadataTypes';
import {
    resolveChallengeTruthSource,
    resolveHopPriorJudgmentForm,
} from './appealChallengeTruth';
import { resolveCourtJurisdiction, resolveFirstInstanceDegree } from './stageJurisdictionResolution';
import { resolveAppealStageCaseNumber } from './absentObjectionCaseNumber';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';
import { tryUnifyObjectionAppealIntoExisting } from './unifyObjectionAppealIntoExisting';

/** عنوان فتح مرحلة الطعن في السجل — التمييز بتاريخ القرار لا «فتح إضبارة» */
export function resolveAppealStageOpeningTimelineTitle(appealStageName: string): string {
    if (isCassationStageName(appealStageName)) return 'تاريخ تمييز القرار';
    return `فتح إضبارة ${appealStageName}`;
}

export type AppealTransitionParams = {
    appealType: string;
    appellant: string;
    filingDate: string;
    newCaseNumber: string;
    newCourt?: string;
    notes?: string;
    archiveTimelineEvent?: TimelineEvent;
    archiveFinalDecision?: string | null;
    archiveDecisionDate?: string | null;
    /** عند التعدد: معرّفات الخصوم المختارين للمخاصمة في الطعن */
    includedOpponentPartyIds?: Array<number | string>;
    /** عند التعدد: معرّفات الطاعنين المختارين في الطعن */
    includedAppellantPartyIds?: Array<number | string>;
    appealDossierMode?: 'standard' | 'interpleader_appellant' | 'against_interpleader';
    dossierLayout?: import('./interpleaderAppealEngine').AppealDossierLayout;
    priorJudgmentType?: string;
    /** نتيجة الموكل في المرحلة المُقفَلة — مصدر structured pipeline */
    priorStageOutcome?: StageOutcome;
};

export function resolveAppealStageName(
    appealType: string,
    options?: {
        sourceStageName?: string | null;
        stages?: Array<{ stageName?: string | null; name?: string | null }> | null;
        file?: { lawsuitJurisdiction?: string; selectedType?: string } | null;
    },
): string {
    const t = String(appealType ?? '').trim();
    const personal = isPersonalStatusAppealContext(
        options?.sourceStageName,
        options?.stages,
        options?.file,
    );

    if (personal) {
        if (t === 'تمييز') return 'تمييز';
        if (t.includes('إعادة محاكمة')) return 'إعادة المحاكمة';
        if (t.includes('اعتراض')) return 'اعتراض على الحكم الغيابي';
        if (t === 'استئناف') return 'تمييز';
        return t || 'تمييز';
    }

    if (t === 'استئناف') return 'الاستئناف';
    if (t === 'تمييز') return 'التمييز';
    if (t.includes('إعادة محاكمة') || t.includes('إعادة المحاكمة') || t.includes('اعتراض')) {
        return qualifyExtraordinaryPleadingStageName(t, options?.sourceStageName);
    }
    return t || 'مرحلة الطعن';
}

export function buildOpponentAppealArchiveDetails(opts: {
    appealType: string;
    caseNo?: string;
    court?: string;
}): string {
    const caseNo = String(opts.caseNo ?? '').trim();
    const court = String(opts.court ?? '').trim();
    const caseLine = `رقم دعوى الطعن: ${caseNo || 'غير محدد'}`;
    const courtLine = court ? `\nالمحكمة المختصة: ${court}` : '';
    return `قام الخصم بالطعن في القرار بطريق (${opts.appealType}).\n\n${caseLine}${courtLine}\n\nبقيت إضبارة هذه المرحلة محفوظة ومقفولة، ويمكن الرجوع إليها من شريط المراحل.`;
}

export function migrateAppealIncidentalCases(incidentalCases?: IncidentalCase[]): IncidentalCase[] {
    return (Array.isArray(incidentalCases) ? incidentalCases : [])
        .filter(
            (c) =>
                c.type === 'thirdParty'
                && c.status === 'active'
                && c.entryDecision !== 'rejected',
        )
        .map((c) => ({
            ...c,
            type: 'joinder_appeal' as const,
        }));
}

export type AppealStageTransitionResult = {
    updatedStages: CaseStage[];
    newActiveIndex: number;
    independentRequired?: boolean;
};

export function applyAppealStageTransition(
    stages: CaseStage[],
    activeStageIndex: number,
    currentStage: CaseStage,
    params: AppealTransitionParams,
): AppealStageTransitionResult {
    if (
        shouldSpawnIndependentChallengeDossier({
            stages,
            sourceStage: currentStage,
            appealType: params.appealType,
        })
    ) {
        return {
            updatedStages: stages,
            newActiveIndex: activeStageIndex,
            independentRequired: true,
        };
    }

    const unified = tryUnifyObjectionAppealIntoExisting(stages, activeStageIndex, currentStage, {
        appealType: params.appealType,
        appellant: params.appellant,
        filingDate: params.filingDate,
        newCaseNumber: params.newCaseNumber,
        notes: params.notes,
        archiveTimelineEvent: params.archiveTimelineEvent,
        archiveFinalDecision: params.archiveFinalDecision,
        archiveDecisionDate: params.archiveDecisionDate,
        includedAppellantPartyIds: params.includedAppellantPartyIds,
        includedOpponentPartyIds: params.includedOpponentPartyIds,
    });
    if (unified) {
        return {
            updatedStages: unified.updatedStages,
            newActiveIndex: unified.newActiveIndex,
        };
    }

    const {
        appealType,
        appellant,
        filingDate,
        newCaseNumber,
        newCourt = '',
        notes,
        archiveTimelineEvent,
        archiveFinalDecision,
        archiveDecisionDate,
        includedOpponentPartyIds,
        includedAppellantPartyIds,
        dossierLayout,
        priorJudgmentType,
        priorStageOutcome,
    } = params;

    const resolvedCaseNumber = resolveAppealStageCaseNumber(
        appealType,
        newCaseNumber,
        currentStage.caseNo,
    );

    const updatedStages = [...stages];
    const stageName = String(currentStage.stageName ?? currentStage.name ?? '');
    const appealStageName = resolveAppealStageName(appealType, {
        sourceStageName: stageName,
        stages: updatedStages,
    });
    const transferredAttachments = collectTransferableAttachments(currentStage.attachments);
    const flippedParties = buildAppealStageParties(
        currentStage.parties ?? [],
        dossierLayout?.appellantLegalSide ?? appellant,
        appealType,
        currentStage.incidentalCases,
        includedOpponentPartyIds,
        includedAppellantPartyIds,
        dossierLayout,
        currentStage.disputeIntegrity,
    );
    const appealIncidentalCases = migrateAppealIncidentalCases(currentStage.incidentalCases);

    const archiveEvent: TimelineEvent = archiveTimelineEvent ?? {
        id: `appeal_archive_${Date.now()}`,
        type: 'milestone',
        date: filingDate || getLocalTodayYmd(),
        title: `أُقفلت إضبارة ${stageName} — انتقال لمرحلة ${appealType}`,
        details: `تم قفل إضبارة المرحلة السابقة مع الإبقاء على سجلها.\n\nالانتقال إلى: ${appealStageName}\nرقم الدعوى: ${resolvedCaseNumber || '—'}\n${newCourt ? `المحكمة: ${newCourt}\n` : ''}${notes ? `\nملاحظات: ${notes}` : ''}`,
        isSystemLog: true,
        isNew: true,
    };

    if (!priorStageOutcome && !currentStage.clientStageOutcome) {
        throw new Error(
            'applyAppealStageTransition: priorStageOutcome or currentStage.clientStageOutcome is required',
        );
    }
    const resolvedPriorOutcome = priorStageOutcome ?? currentStage.clientStageOutcome!;

    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'locked',
        isPleadingsClosed: true,
        awaitingOpponentAppeal: false,
        clientStageOutcome: resolvedPriorOutcome,
        finalDecision: archiveFinalDecision ?? currentStage.finalDecision,
        decisionDate: archiveDecisionDate ?? currentStage.decisionDate,
        previousCaseNumber: currentStage.caseNo,
        timeline: [archiveEvent, ...(currentStage.timeline ?? [])],
    };

    const openingEvent: TimelineEvent = {
        id: `appeal_open_${Date.now()}`,
        type: 'milestone',
        date: filingDate || getLocalTodayYmd(),
        title: resolveAppealStageOpeningTimelineTitle(appealStageName),
        details: `تم تقديم ${appealType} برقم ${resolvedCaseNumber || '—'}\nمقدم الطعن: ${appellant}${notes ? `\nملاحظات: ${notes}` : ''}`,
        isNew: true,
    };

    const challengeSource = resolveChallengeTruthSource(updatedStages, currentStage, appealStageName);
    const newStageId = `stage_${Date.now()}`;
    const inheritFirstInstanceVenue = isGhayabiObjectionAppealType(appealType);
    const firstInstanceStage = updatedStages.find((stage) =>
        isFirstInstanceStageName(String(stage.stageName ?? stage.name ?? '')),
    );
    const inheritedCourt = inheritFirstInstanceVenue
        ? (
            [newCourt, currentStage.court, currentStage.firstInstanceCourt, firstInstanceStage?.court]
                .map((value) => String(value ?? '').trim())
                .find(Boolean) ?? ''
        )
        : (String(newCourt ?? '').trim() || '');
    const inheritedJudge = inheritFirstInstanceVenue
        ? (
            [currentStage.judge, firstInstanceStage?.judge]
                .map((value) => String(value ?? '').trim())
                .find(Boolean) ?? ''
        )
        : '';
    const newStage: CaseStage = {
        id: newStageId,
        name: appealStageName,
        stageName: appealStageName,
        type: currentStage.type,
        docType: currentStage.docType,
        claimValue: currentStage.claimValue,
        isUndeterminedValue: currentStage.isUndeterminedValue,
        isFixedFee: currentStage.isFixedFee,
        disputeIntegrity: currentStage.disputeIntegrity,
        caseNo: resolvedCaseNumber,
        court: inheritedCourt,
        judge: inheritedJudge,
        parties: flippedParties,
        timeline: [openingEvent],
        attachments: transferredAttachments,
        tasks: [],
        incidentalCases: appealIncidentalCases,
        provisionalOrders: [],
        thirdParties: [],
        createdDate: filingDate || getLocalTodayYmd(),
        finalDecision: null,
        decisionDate: null,
        status: 'active',
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        wasReopened: false,
        isUnderObjection: appealType.includes('اعتراض'),
        appealDeadline: undefined,
        appealMetadata: mergeAppealStageMetadata(undefined, {
            ...buildStageTransitionMetadata({
                appellantPartyIds:
                    includedAppellantPartyIds?.length
                        ? includedAppellantPartyIds
                        : flippedParties
                              .filter((p) => isAppellantAppealRole(String(p.role ?? '')))
                              .map((p) => p.id)
                              .filter((id) => id != null) as Array<number | string>,
                appelleePartyIds:
                    includedOpponentPartyIds?.length
                        ? includedOpponentPartyIds
                        : flippedParties
                              .filter((p) => !isAppellantAppealRole(String(p.role ?? '')))
                              .map((p) => p.id)
                              .filter((id) => id != null) as Array<number | string>,
                priorStageOutcome: resolvedPriorOutcome,
                priorJudgmentForm: resolveHopPriorJudgmentForm(challengeSource, stageName),
                priorJudgmentType: priorJudgmentType ?? undefined,
                isCrossAppeal: false,
                jurisdiction: resolveCourtJurisdiction(currentStage),
                firstInstanceDegree: resolveFirstInstanceDegree({
                    claimValue: currentStage.claimValue,
                    isUndeterminedValue: currentStage.isUndeterminedValue,
                    isFixedFee: currentStage.isFixedFee,
                    docType: currentStage.docType,
                    type: currentStage.type,
                    stageName,
                }),
            }),
            appealType,
            appellant,
            filingDate: filingDate || getLocalTodayYmd(),
            previousCaseNumber: currentStage.caseNo,
            previousStage: stageName,
            hasCrossAppeal: false,
            crossAppealPartyIds: [],
        }),
        firstInstanceCaseNumber:
            currentStage.firstInstanceCaseNumber
            || (isFirstInstanceStageName(stageName) ? currentStage.caseNo : undefined),
        firstInstanceCourt:
            currentStage.firstInstanceCourt
            || (isFirstInstanceStageName(stageName) ? currentStage.court : undefined),
        legalTimers: undefined,
    };

    updatedStages.push(newStage);

    return {
        updatedStages,
        newActiveIndex: updatedStages.length - 1,
    };
}

export function shouldShowFirstInstanceIncidentalUi(
    stageName?: string | null,
    isPleadingsClosed?: boolean,
): boolean {
    if (isPleadingsClosed) return false;
    return isBeginningPleadingStageName(stageName);
}
