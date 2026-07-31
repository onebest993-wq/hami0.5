import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    isPersonalStatusCoreStage,
    isPersonalStatusStageName,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import type { CaseStage, IncidentalCase, Party, TimelineEvent } from '../../LawyerShared';
import type { SmartFileAttachment } from './judgmentTypes';
import { isAppealStageName, isFirstInstanceStageName, resolveLawyerSide } from './judgmentTypes';
import { buildAppealStageParties } from './appealPartyEngine';
import { INTERPLEADER_APPELLANT_SIDE } from './interpleaderAppealEngine';
import {
    extractParentheticalUnderlyingSide,
    isAppellantAppealRole,
    isDefendantSideRole,
    isPlaintiffSideRole,
    isThirdPartyRole,
    isInterpleaderThirdPartyRole,
} from './partyRoleClassification';
import { resolveRetrialTargetStageIndex } from './extraordinaryAppealGateway';

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
};

function underlyingSideLabel(role: string): 'المدعي' | 'المدعى عليه' | null {
    const fromParens = extractParentheticalUnderlyingSide(role);
    if (fromParens) return fromParens;
    if (isDefendantSideRole(role)) return 'المدعى عليه';
    if (isPlaintiffSideRole(role)) return 'المدعي';
    return null;
}

export function resolveAppealRoleTitles(appealType: string): { appellantTitle: string; appelleeTitle: string } {
    const t = String(appealType ?? '').trim();
    if (t === 'تمييز') return { appellantTitle: 'المميز', appelleeTitle: 'المميز عليه' };
    if (t.includes('إعادة محاكمة')) {
        return { appellantTitle: 'طالب إعادة المحاكمة', appelleeTitle: 'المطلوب إعادة محاكمته' };
    }
    if (t.includes('اعتراض')) {
        return {
            appellantTitle: 'المعترض على الحكم الغيابي',
            appelleeTitle: 'المعترض عليه بالحكم الغيابي',
        };
    }
    return { appellantTitle: 'المستأنف', appelleeTitle: 'المستأنف عليه' };
}

export function resolveAppealStageName(
    appealType: string,
    options?: { sourceStageName?: string | null },
): string {
    const t = String(appealType ?? '').trim();
    const personal = isPersonalStatusStageName(options?.sourceStageName);

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

export function resolveOpponentAsAppellant(
    representedParty?: string | null,
    parties?: Array<{ role?: string; isClient?: boolean }>,
): 'المدعي' | 'المدعى عليه' {
    const side = resolveLawyerSide(representedParty, parties);
    if (side === 'المدعي') return 'المدعى عليه';
    if (side === 'المدعى عليه') return 'المدعي';
    return 'المدعى عليه';
}

function findIncidentalForParty(party: Party, incidentalCases?: IncidentalCase[]): IncidentalCase | undefined {
    if (!Array.isArray(incidentalCases)) return undefined;
    const name = String(party.name ?? '').trim();
    return incidentalCases.find(
        (c) =>
            c.type === 'thirdParty'
            && c.status === 'active'
            && c.entryDecision !== 'rejected'
            && String(c.partyName ?? '').trim() === name,
    );
}

function normalizePartyIdKey(id: number | string | null | undefined): string {
    return String(id ?? '').trim();
}

function partyIdInSelectionList(
    ids: Array<number | string> | undefined,
    partyId: number | string | null | undefined,
): boolean {
    if (!ids?.length) return false;
    const key = normalizePartyIdKey(partyId);
    return ids.some((id) => normalizePartyIdKey(id) === key);
}

export type AppealPartyFlipSelection = {
    includedAppellantPartyIds?: Array<number | string>;
    includedOpponentPartyIds?: Array<number | string>;
};

/** true = جانب الطاعن، false = جانب المخاصَم، null = استخدم منطق الجانب الأصلي */
function resolvePartyAppealSideFromSelection(
    party: Party,
    selection?: AppealPartyFlipSelection,
    appellant?: string,
): boolean | null {
    if (!selection) return null;
    const hasAppellantList = Boolean(selection.includedAppellantPartyIds?.length);
    const hasOpponentList = Boolean(selection.includedOpponentPartyIds?.length);
    if (!hasAppellantList && !hasOpponentList) return null;

    if (partyIdInSelectionList(selection.includedAppellantPartyIds, party.id)) return true;
    if (partyIdInSelectionList(selection.includedOpponentPartyIds, party.id)) return false;

    if (hasAppellantList && appellant && !String(appellant).includes('اختصام')) {
        const appellantIsPlaintiff = appellant === 'المدعي' || appellant.includes('مدعي');
        const appellantLegalSide: 'المدعي' | 'المدعى عليه' | null = appellantIsPlaintiff
            ? 'المدعي'
            : appellant.includes('مدعى')
              ? 'المدعى عليه'
              : null;
        const partyLegalSide = underlyingSideLabel(String(party.role ?? ''));
        if (appellantLegalSide && partyLegalSide === appellantLegalSide) {
            return false;
        }
    }

    return null;
}

export function flipPartiesForAppealStage(
    parties: Party[],
    appellant: string,
    appealType: string,
    incidentalCases?: IncidentalCase[],
    selection?: AppealPartyFlipSelection,
): Party[] {
    const { appellantTitle, appelleeTitle } = resolveAppealRoleTitles(appealType);
    const appellantIsPlaintiff = appellant === 'المدعي' || appellant.includes('مدعي');
    const appellantIsInterpleader =
        appellant === INTERPLEADER_APPELLANT_SIDE || appellant.includes('اختصامي');

    const seen = new Set<number | string>();
    const result: Party[] = [];

    for (const party of parties) {
        if (seen.has(party.id)) continue;
        seen.add(party.id);

        const selectedSide = resolvePartyAppealSideFromSelection(party, selection, appellant);

        if (isThirdPartyRole(party.role)) {
            const inc = findIncidentalForParty(party, incidentalCases);
            if (inc?.thirdPartyEntryMode === 'affiliative') {
                const withPlaintiff = inc.affiliationSide === 'plaintiff';
                const onAppellantSide =
                    selectedSide !== null
                        ? selectedSide
                        : appellantIsInterpleader
                          ? false
                          : appellantIsPlaintiff
                            ? withPlaintiff
                            : !withPlaintiff;
                result.push({
                    ...party,
                    role: onAppellantSide
                        ? `${appellantTitle} (شخص ثالث — انضمامي)`
                        : `${appelleeTitle} (شخص ثالث — انضمامي)`,
                    side: onAppellantSide ? 'right' : 'left',
                    originalRole: party.role,
                } as Party & { originalRole?: string });
            } else if (isInterpleaderThirdPartyRole(party.role) || inc?.thirdPartyEntryMode === 'interpleader') {
                const onAppellantSide =
                    selectedSide !== null ? selectedSide : appellantIsInterpleader;
                result.push({
                    ...party,
                    role: onAppellantSide
                        ? `${appellantTitle} (شخص ثالث اختصامي)`
                        : `${appelleeTitle} (شخص ثالث اختصامي)`,
                    side: onAppellantSide ? 'right' : 'left',
                    originalRole: party.role,
                } as Party & { originalRole?: string });
            } else {
                const onAppellantSide = selectedSide === true;
                result.push({
                    ...party,
                    role: onAppellantSide
                        ? `${appellantTitle} (شخص ثالث)`
                        : `${appelleeTitle} (شخص ثالث)`,
                    side: onAppellantSide ? 'right' : 'left',
                    originalRole: party.role,
                } as Party & { originalRole?: string });
            }
            continue;
        }

        const side = underlyingSideLabel(party.role);
        let newRole = party.role;
        let newSide = party.side;

        if (side === 'المدعي') {
            const isAppellant =
                selectedSide !== null ? selectedSide : appellantIsPlaintiff;
            newRole = isAppellant
                ? `${appellantTitle} (المدعي)`
                : `${appelleeTitle} (المدعي)`;
            newSide = isAppellant ? 'right' : 'left';
        } else if (side === 'المدعى عليه') {
            const isAppellant =
                selectedSide !== null ? selectedSide : !appellantIsPlaintiff;
            newRole = isAppellant
                ? `${appellantTitle} (المدعى عليه)`
                : `${appelleeTitle} (المدعى عليه)`;
            newSide = isAppellant ? 'right' : 'left';
        }

        result.push({
            ...party,
            role: newRole,
            side: newSide,
            originalRole: party.role,
        } as Party & { originalRole?: string });
    }

    return result;
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

export function collectTransferableAttachments(attachments: unknown[] | undefined): SmartFileAttachment[] {
    const stamp = Date.now();
    if (!Array.isArray(attachments)) return [];
    return attachments.map((raw, index) => {
        const item = raw as SmartFileAttachment;
        return {
            ...item,
            id: item.id ? `xfer_${item.id}_${stamp}_${index}` : `xfer_att_${stamp}_${index}`,
        };
    });
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

    const updatedStages = [...stages];
    const stageName = String(currentStage.stageName ?? currentStage.name ?? '');
    const appealStageName = resolveAppealStageName(appealType, { sourceStageName: stageName });
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
        details: `تم قفل إضبارة المرحلة السابقة مع الإبقاء على سجلها.\n\n➡️ الانتقال إلى: ${appealStageName}\nرقم الدعوى: ${newCaseNumber || '—'}\n${newCourt ? `المحكمة: ${newCourt}\n` : ''}${notes ? `\nملاحظات: ${notes}` : ''}`,
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
        details: `تم تقديم ${appealType} برقم ${newCaseNumber || '—'}\n\nمقدم الطعن: ${appellant}\n${notes ? `\nملاحظات: ${notes}` : ''}\n\n📎 المستندات المنقولة متاحة في طلبات الإضبارة.`,
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
        caseNo: newCaseNumber,
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
    if (!isFirstInstanceStageName(stageName)) return false;
    if (isPleadingsClosed) return false;
    return String(stageName ?? '') !== 'التمييز';
}

export type CassationRemandTarget = {
    stageName: string;
    sourceStageIndex: number;
    remandLayer: 'appeal' | 'first_instance';
};

function stageLabel(stage: CaseStage | undefined): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

/** بعد نقض التمييز: استئناف إن وُجدت مرحلة استئناف سابقة، وإلا البداءة/أول درجة. */
export function resolveCassationRemandTarget(
    stages: CaseStage[],
    cassationStageIndex: number,
): CassationRemandTarget {
    const prior = stages.slice(0, Math.max(0, cassationStageIndex));

    for (let i = prior.length - 1; i >= 0; i--) {
        const name = stageLabel(prior[i]);
        if (isAppealStageName(name)) {
            return {
                stageName: name || 'الاستئناف',
                sourceStageIndex: i,
                remandLayer: 'appeal',
            };
        }
    }

    for (let i = prior.length - 1; i >= 0; i--) {
        const name = stageLabel(prior[i]);
        if (isPersonalStatusStageName(name) && isPersonalStatusCoreStage(name)) {
            return {
                stageName: name || 'أحوال شخصية',
                sourceStageIndex: i,
                remandLayer: 'first_instance',
            };
        }
    }

    let firstInstanceIdx = 0;
    for (let i = prior.length - 1; i >= 0; i--) {
        const name = stageLabel(prior[i]);
        if (isFirstInstanceStageName(name)) {
            firstInstanceIdx = i;
            break;
        }
    }

    const source = prior[firstInstanceIdx] ?? prior[0];
    return {
        stageName: stageLabel(source) || 'البداءة',
        sourceStageIndex: prior.length > 0 ? firstInstanceIdx : 0,
        remandLayer: 'first_instance',
    };
}

export type CassationRemandParams = {
    remandDate?: string;
    notes?: string;
    cassationTimelineEvent?: TimelineEvent;
    cassationFinalDecision?: string;
};

export function applyCassationRemand(
    stages: CaseStage[],
    cassationStageIndex: number,
    params?: CassationRemandParams,
): { updatedStages: CaseStage[]; newActiveIndex: number; target: CassationRemandTarget } {
    const updatedStages = [...stages];
    const currentStage = updatedStages[cassationStageIndex];
    if (!currentStage) {
        throw new Error('applyCassationRemand: cassation stage not found');
    }

    const now = params?.remandDate ?? getLocalTodayYmd();
    const target = resolveCassationRemandTarget(stages, cassationStageIndex);
    if (target.sourceStageIndex === cassationStageIndex) {
        throw new Error('applyCassationRemand: no distinct prior stage to remand to');
    }
    const sourceStage = stages[target.sourceStageIndex];
    if (!sourceStage) {
        throw new Error('applyCassationRemand: remand source stage missing');
    }

    const cassationTimeline = params?.cassationTimelineEvent
        ? [params.cassationTimelineEvent, ...(currentStage.timeline ?? [])]
        : currentStage.timeline;

    updatedStages[cassationStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: params?.cassationFinalDecision ?? 'منقوض (إعادة للمحاكمة)',
        decisionDate: currentStage.decisionDate ?? now,
        isPleadingsClosed: true,
        timeline: cassationTimeline,
    };

    const remandNotes = String(params?.notes ?? '').trim();
    const remandTimelineEvent: TimelineEvent = {
        id: `cass_remand_open_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: `↩️ نقض التمييز — استئناف السير في ${target.stageName}`,
        details: remandNotes
            ? `${remandNotes}\n\nبعد نقض محكمة التمييز للحكم، تُستأنف الإضبارة نفسها في مرحلة ${target.stageName} دون فتح سجل منفصل.`
            : `بعد نقض محكمة التمييز للحكم، تُستأنف الإضبارة نفسها في مرحلة ${target.stageName} دون فتح سجل منفصل.`,
        isNew: true,
        color: 'red',
    };

    const priorTimeline = sourceStage.timeline ?? [];
    updatedStages[target.sourceStageIndex] = {
        ...sourceStage,
        status: 'active',
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        awaitingAbsentJudgmentNotification: false,
        isUnderObjection: false,
        finalDecision: null,
        decisionDate: null,
        wasReopened: true,
        timeline: [remandTimelineEvent, ...priorTimeline],
        firstInstanceCaseNumber:
            sourceStage.firstInstanceCaseNumber
            ?? currentStage.firstInstanceCaseNumber
            ?? (target.remandLayer === 'first_instance' ? sourceStage.caseNo : undefined),
        firstInstanceCourt:
            sourceStage.firstInstanceCourt
            ?? currentStage.firstInstanceCourt
            ?? (target.remandLayer === 'first_instance' ? sourceStage.court : undefined),
    };

    return {
        updatedStages,
        newActiveIndex: target.sourceStageIndex,
        target,
    };
}

export function cassationRemandSuccessMessage(target: CassationRemandTarget): string {
    if (target.remandLayer === 'appeal') {
        return 'تم نقض الحكم وإعادة الإضبارة لمرحلة الاستئناف';
    }
    return `تم نقض الحكم وإعادة الإضبارة لمرحلة ${target.stageName}`;
}

export type CassationCorrectionOpenParams = {
    judgmentDate: string;
    judgmentType?: string;
    notes?: string;
};

/** فتح مرحلة «تصحيح قرار» بعد قفل التمييز — مرة واحدة. */
export function applyCassationCorrectionOpen(
    stages: CaseStage[],
    cassationStageIndex: number,
    params: CassationCorrectionOpenParams,
): { updatedStages: CaseStage[]; newActiveIndex: number } {
    const updatedStages = [...stages];
    const currentStage = updatedStages[cassationStageIndex];
    if (!currentStage) {
        throw new Error('applyCassationCorrectionOpen: cassation stage not found');
    }

    const now = params.judgmentDate || getLocalTodayYmd();
    const notes = String(params.notes ?? '').trim();
    const stageName = stageLabel(currentStage);
    const finalDecision =
        String(params.judgmentType ?? '').trim()
        || String(currentStage.finalDecision ?? '').trim()
        || 'مكتسبة الدرجة القطعية';

    const archiveEvent: TimelineEvent = {
        id: `cassation_correction_archive_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: `🔒 أُقفلت إضبارة ${stageName} — طلب تصحيح القرار`,
        details: notes
            ? `${notes}\n\n➡️ فتح مرحلة تصحيح قرار تمييزي.`
            : '➡️ فتح مرحلة تصحيح قرار تمييزي.',
        isSystemLog: true,
        isNew: true,
    };

    updatedStages[cassationStageIndex] = {
        ...currentStage,
        status: 'completed',
        isPleadingsClosed: true,
        awaitingOpponentAppeal: false,
        finalDecision,
        decisionDate: now,
        timeline: [archiveEvent, ...(currentStage.timeline ?? [])],
    };

    const openingEvent: TimelineEvent = {
        id: `cassation_correction_open_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: '📝 فتح مرحلة تصحيح قرار تمييزي',
        details: notes
            ? `${notes}\n\n⏳ بانتظار نتيجة التدقيق في محكمة التمييز.`
            : '⏳ بانتظار نتيجة التدقيق في محكمة التمييز.',
        isNew: true,
    };

    const transferredAttachments = collectTransferableAttachments(currentStage.attachments);
    const correctionStageName = 'تصحيح قرار';
    const newStage: CaseStage = {
        id: `stage_correction_${Date.now()}`,
        name: correctionStageName,
        stageName: correctionStageName,
        type: currentStage.type,
        docType: currentStage.docType,
        claimValue: currentStage.claimValue,
        caseNo: currentStage.caseNo,
        court: currentStage.court || 'محكمة التمييز الاتحادية',
        judge: '',
        parties: currentStage.parties ?? [],
        timeline: [openingEvent],
        attachments: transferredAttachments,
        tasks: [],
        incidentalCases: currentStage.incidentalCases,
        provisionalOrders: [],
        thirdParties: [],
        createdDate: now,
        finalDecision: null,
        decisionDate: null,
        status: 'active',
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        wasReopened: false,
        extraordinaryAppealType: 'تصحيح القرار التمييزي',
        firstInstanceCaseNumber: currentStage.firstInstanceCaseNumber,
        firstInstanceCourt: currentStage.firstInstanceCourt,
    };

    updatedStages.push(newStage);

    return {
        updatedStages,
        newActiveIndex: updatedStages.length - 1,
    };
}

export type CorrectionCompleteParams = {
    completionDate?: string;
    notes?: string;
    outcome?: string;
};

/** إتمام مرحلة التصحيح والعودة لآخر مرحلة تقاضٍ (استئناف أو بداءة). */
export function applyCorrectionComplete(
    stages: CaseStage[],
    correctionStageIndex: number,
    params?: CorrectionCompleteParams,
): { updatedStages: CaseStage[]; newActiveIndex: number; targetStageName: string } {
    const updatedStages = [...stages];
    const correctionStage = updatedStages[correctionStageIndex];
    if (!correctionStage) {
        throw new Error('applyCorrectionComplete: correction stage not found');
    }

    const now = params?.completionDate ?? getLocalTodayYmd();
    const notes = String(params?.notes ?? '').trim();
    const outcome = String(params?.outcome ?? '').trim() || 'تم البت في طلب التصحيح';

    const completeEvent: TimelineEvent = {
        id: `correction_complete_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: '✅ اكتملت مرحلة تصحيح القرار',
        details: notes ? `${outcome}\n\n${notes}` : outcome,
        isNew: true,
    };

    updatedStages[correctionStageIndex] = {
        ...correctionStage,
        status: 'completed',
        isPleadingsClosed: true,
        finalDecision: outcome,
        decisionDate: now,
        timeline: [completeEvent, ...(correctionStage.timeline ?? [])],
    };

    const targetIndex = resolveRetrialTargetStageIndex(updatedStages);
    const targetStage = updatedStages[targetIndex];
    if (!targetStage) {
        throw new Error('applyCorrectionComplete: litigation target stage missing');
    }

    const targetName = stageLabel(targetStage);
    const returnEvent: TimelineEvent = {
        id: `correction_return_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: `↩️ العودة لمرحلة ${targetName} بعد التصحيح`,
        details: `استئناف السير في مرحلة ${targetName} وفق نتيجة طلب التصحيح.`,
        isNew: true,
    };

    updatedStages[targetIndex] = {
        ...targetStage,
        status: 'active',
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        finalDecision: null,
        decisionDate: null,
        wasReopened: true,
        timeline: [returnEvent, ...(targetStage.timeline ?? [])],
    };

    return {
        updatedStages,
        newActiveIndex: targetIndex,
        targetStageName: targetName,
    };
}

function isQuashedCassationStage(stage: CaseStage | undefined): boolean {
    if (!stage) return false;
    const name = stageLabel(stage);
    if (name !== 'التمييز' && !name.includes('تمييز')) return false;
    const fd = String(stage.finalDecision ?? '');
    return fd.includes('منقوض') || fd.includes('إعادة');
}

/** دمج إضبارات النقض القديمة التي فُتحت كمرحلة مستقلة */
export function normalizeLegacyCassationRemandStages(stages: CaseStage[]): CaseStage[] {
    if (stages.length < 3) return stages;

    const result = [...stages];
    for (let i = result.length - 1; i >= 0; i--) {
        const dup = result[i];
        if (!dup?.wasReopened || dup.status !== 'active') continue;

        const name = stageLabel(dup);
        const isRemandTarget = isAppealStageName(name) || isFirstInstanceStageName(name);
        if (!isRemandTarget) continue;

        let priorIdx = -1;
        for (let j = i - 1; j >= 0; j--) {
            if (stageLabel(result[j]) !== name) continue;
            const st = result[j]?.status;
            if (st === 'locked' || st === 'completed') {
                priorIdx = j;
                break;
            }
        }
        if (priorIdx < 0) continue;

        const between = result.slice(priorIdx + 1, i);
        if (!between.some((s) => isQuashedCassationStage(s))) continue;

        const prior = result[priorIdx]!;
        const seenIds = new Set<string>();
        const mergedTimeline = [...(dup.timeline ?? []), ...(prior.timeline ?? [])].filter((ev) => {
            const id = String(ev.id ?? '');
            if (!id || seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        result[priorIdx] = {
            ...prior,
            ...dup,
            id: prior.id,
            status: 'active',
            wasReopened: true,
            isPleadingsClosed: dup.isPleadingsClosed ?? false,
            finalDecision: dup.finalDecision ?? null,
            decisionDate: dup.decisionDate ?? null,
            timeline: mergedTimeline,
            parties: dup.parties ?? prior.parties,
            attachments: dup.attachments ?? prior.attachments,
            incidentalCases: dup.incidentalCases ?? prior.incidentalCases,
            tasks: dup.tasks ?? prior.tasks,
        };
        result.splice(i, 1);
    }

    return result;
}
