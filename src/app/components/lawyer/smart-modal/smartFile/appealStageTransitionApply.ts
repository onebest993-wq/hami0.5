import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { isPersonalStatusAppealContext } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { isBeginningPleadingStageName } from './pleadingStageClassification';
import type { CaseStage, IncidentalCase, TimelineEvent } from '../../LawyerShared';
import { isFirstInstanceStageName } from './judgmentTypes';
import { isAppellantAppealRole } from './partyRoleClassification';
import { buildAppealStageParties } from './appealPartyEngine';
import { collectTransferableAttachments } from './appealStageTransitionShared';
import { resolveAppealStageCaseNumber } from './absentObjectionCaseNumber';

type AppealTransitionParams = {
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
    if (t.includes('إعادة محاكمة')) return 'إعادة المحاكمة';
    if (t.includes('اعتراض')) return 'الاعتراض على الحكم الغيابي';
    return t || 'مرحلة الطعن';
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

export function applyAppealStageTransition(
    stages: CaseStage[],
    activeStageIndex: number,
    currentStage: CaseStage,
    params: AppealTransitionParams,
): { updatedStages: CaseStage[]; newActiveIndex: number } {
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
    );
    const appealIncidentalCases = migrateAppealIncidentalCases(currentStage.incidentalCases);

    const archiveEvent: TimelineEvent = archiveTimelineEvent ?? {
        id: `appeal_archive_${Date.now()}`,
        type: 'milestone',
        date: filingDate || getLocalTodayYmd(),
        title: `🔒 أُقفلت إضبارة ${stageName} — انتقال لمرحلة ${appealType}`,
        details: `تم قفل إضبارة المرحلة السابقة مع الإبقاء على سجلها.\n\n➡️ الانتقال إلى: ${appealStageName}\nرقم الدعوى: ${resolvedCaseNumber || '—'}\n${newCourt ? `المحكمة: ${newCourt}\n` : ''}${notes ? `\nملاحظات: ${notes}` : ''}`,
        isSystemLog: true,
        isNew: true,
    };

    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'locked',
        isPleadingsClosed: true,
        awaitingOpponentAppeal: false,
        finalDecision: archiveFinalDecision ?? currentStage.finalDecision,
        decisionDate: archiveDecisionDate ?? currentStage.decisionDate,
        previousCaseNumber: currentStage.caseNo,
        timeline: [archiveEvent, ...(currentStage.timeline ?? [])],
    };

    const openingEvent: TimelineEvent = {
        id: `appeal_open_${Date.now()}`,
        type: 'milestone',
        date: filingDate || getLocalTodayYmd(),
        title: `🚀 فتح إضبارة ${appealStageName}`,
        details: `تم تقديم ${appealType} برقم ${resolvedCaseNumber || '—'}\nمقدم الطعن: ${appellant}${notes ? `\nملاحظات: ${notes}` : ''}`,
        isNew: true,
    };

    const newStageId = `stage_${Date.now()}`;
    const newStage: CaseStage = {
        id: newStageId,
        name: appealStageName,
        stageName: appealStageName,
        type: currentStage.type,
        docType: currentStage.docType,
        claimValue: currentStage.claimValue,
        caseNo: resolvedCaseNumber,
        court: newCourt || '',
        judge: '',
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
        appealMetadata: {
            appealType,
            appellant,
            filingDate: filingDate || getLocalTodayYmd(),
            previousCaseNumber: currentStage.caseNo,
            previousStage: stageName,
            priorJudgmentType: priorJudgmentType ?? undefined,
            initialAppellantPartyIds:
                includedAppellantPartyIds?.length
                    ? includedAppellantPartyIds
                    : flippedParties
                          .filter((p) => isAppellantAppealRole(String(p.role ?? '')))
                          .map((p) => p.id)
                          .filter((id) => id != null) as Array<number | string>,
            hasCrossAppeal: false,
            crossAppealPartyIds: [],
        },
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
