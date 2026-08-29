import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { CaseStage } from '../../LawyerShared';
import { isAwaitingOpponentAppeal } from './judgmentTypes';
import {
    isAbsentObjectionStageName,
} from './absentJudgmentFlow';
import {
    isBeginningPleadingStageName,
    isRetrialPleadingStageName,
    isThirdPartyObjectionStageName,
    resolvePleadingStageLabel,
} from './pleadingStageClassification';
import { normalizeLegacyCassationRemandStages } from './appealStageTransition';
import { repairAbsentObjectionAppealStages } from './absentObjectionAppealRepair';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import { isPersonalStatusCoreStage } from '@/app/components/lawyer/personal-status/personalStatusAppealStageHelpers';

/** يستنتج مرحلة العمل الفعّالة من حالة المراحل عند غياب activeStageIndex على الملف. */
export function inferActiveStageIndexFromStages(stages: CaseStage[]): number | null {
    if (!Array.isArray(stages) || stages.length === 0) return null;

    const activeIdx = stages.findIndex((stage) => stage?.status === 'active');
    if (activeIdx >= 0) return activeIdx;

    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        if (!stage) continue;
        if (stage.awaitingOpponentAppeal) return i;
        if (
            stage.isPleadingsClosed
            && stage.status !== 'completed'
            && stage.status !== 'locked'
        ) {
            return i;
        }
    }

    for (let i = stages.length - 1; i >= 0; i--) {
        const stage = stages[i];
        if (!stage || stage.isVoided) continue;
        if (stage.status !== 'completed' && stage.status !== 'locked') return i;
    }

    return null;
}

function resolvePersonalStatusFallbackIndex(stages: CaseStage[], stagesLength: number): number {
    const coreIdx = stages.findIndex((stage) =>
        isPersonalStatusCoreStage(String(stage?.stageName ?? stage?.name ?? '')),
    );
    if (coreIdx >= 0) return coreIdx;
    return stagesLength > 0 ? 0 : 0;
}

/** توحيد سجلات المراحل القديمة عند فتح الإضبارة */
function normalizeLegacyLawsuitStages(stages: CaseStage[]): CaseStage[] {
    const remanded = normalizeLegacyCassationRemandStages(stages);
    return repairAbsentObjectionAppealStages(remanded);
}

/** بناء المراحل الأولية من ملف الدعوى عند فتح Smart File Modal. */
export function buildInitialStagesFromFile(file: Record<string, unknown> | null | undefined): CaseStage[] {
    const stagesRaw = file?.stages;
    if (Array.isArray(stagesRaw) && stagesRaw.length > 0) {
        const stages = normalizeLegacyLawsuitStages(stagesRaw as CaseStage[]);
        const activeIdx = resolveInitialStageIndex(file, stages.length, stages);
        const active = stages[activeIdx];
        if (active) {
            const fileParties = Array.isArray(file?.parties) ? file.parties : [];
            const activeParties = Array.isArray(active.parties) ? active.parties : [];
            let resolvedParties = activeParties.length > 0 ? activeParties : fileParties;
            if (resolvedParties.length === 0) {
                for (let i = stages.length - 1; i >= 0; i--) {
                    const stageParties = (stages[i] as CaseStage | undefined)?.parties;
                    if (Array.isArray(stageParties) && stageParties.length > 0) {
                        resolvedParties = stageParties;
                        break;
                    }
                }
            }
            const patched = [...stages];
            const fileJudge =
                (typeof file?.judge === 'string' ? file.judge : '') ||
                (typeof (file?.details as Record<string, unknown> | undefined)?.judge === 'string'
                    ? String((file?.details as Record<string, unknown>).judge)
                    : '');
            const fileStageName =
                typeof file?.currentStage === 'string' && file.currentStage.trim()
                    ? file.currentStage.trim()
                    : '';
            const activeStageName = String(active.stageName ?? active.name ?? '').trim();
            let normalizedActive = {
                ...active,
                caseNo: active.caseNo || (typeof file?.caseNo === 'string' ? file.caseNo : ''),
                court: active.court || (typeof file?.court === 'string' ? file.court : ''),
                judge: active.judge || fileJudge,
                stageName: activeStageName || fileStageName,
                name: String(active.name ?? '').trim() || activeStageName || fileStageName,
                docType: active.docType || (typeof file?.docType === 'string' ? file.docType : ''),
                claimValue: active.claimValue || (typeof file?.claimValue === 'string' ? file.claimValue : ''),
                parties: resolvedParties,
                isUndeterminedValue:
                    active.isUndeterminedValue === true || file?.isUndeterminedValue === true,
                isFixedFee: active.isFixedFee === true || file?.isFixedFee === true,
            };
            // إصلاح سجلات قديمة: انتظار الطعن لا يُعامل كأرشيف
            const fd = String(normalizedActive.finalDecision ?? '');
            const plaintiffAwaiting =
                normalizedActive.awaitingOpponentAppeal === true
                || (isAwaitingOpponentAppeal(fd) && !fd.includes('ضد الموكل') && !fd.includes('رد الدعوى كلياً'));

            if (
                normalizedActive.status === 'completed'
                && normalizedActive.isPleadingsClosed
                && (plaintiffAwaiting || isAwaitingOpponentAppeal(fd))
            ) {
                normalizedActive = {
                    ...normalizedActive,
                    status: 'active',
                    awaitingOpponentAppeal: plaintiffAwaiting,
                };
            }
            patched[activeIdx] = normalizedActive;
            return patched;
        }
        return stages;
    }

    const parties = Array.isArray(file?.parties) ? file.parties : [];
    const history = Array.isArray(file?.history) ? file.history : [];
    const tasks = Array.isArray(file?.tasks) ? file.tasks : [];
    const incidentalCases = Array.isArray(file?.incidentalCases) ? file.incidentalCases : [];

    const stageName =
        typeof file?.currentStage === 'string' && file.currentStage.trim()
            ? file.currentStage.trim()
            : isPersonalStatusFile(file ?? {})
              ? 'أحوال شخصية'
              : 'البداءة';
    const docType = typeof file?.docType === 'string' ? file.docType : '';
    const claimValue = typeof file?.claimValue === 'string' ? file.claimValue : '';

    return [
        {
            id: `stage_${Date.now()}`,
            name: stageName,
            stageName,
            caseNo: typeof file?.caseNo === 'string' ? file.caseNo : '',
            court: typeof file?.court === 'string' ? file.court : '',
            judge: typeof file?.judge === 'string' ? file.judge : '',
            ...(docType ? { docType, type: docType } : {}),
            ...(claimValue ? { claimValue } : {}),
            ...(file?.isUndeterminedValue ? { isUndeterminedValue: true } : {}),
            ...(file?.isFixedFee ? { isFixedFee: true } : {}),
            parties,
            timeline: history,
            tasks,
            incidentalCases,
            createdDate: typeof file?.date === 'string' ? file.date : getLocalTodayYmd(),
            finalDecision: null,
            decisionDate: null,
            status: 'active',
        } as unknown as CaseStage,
    ];
}

export function resolveInitialStageIndex(
    file: Record<string, unknown> | null | undefined,
    stagesLength: number,
    stagesInput?: CaseStage[],
): number {
    if (stagesLength <= 0) return 0;
    const idx = file?.activeStageIndex;
    if (typeof idx === 'number' && idx >= 0 && idx < stagesLength) {
        return idx;
    }

    const stages =
        stagesInput
        ?? (Array.isArray(file?.stages) ? (file.stages as CaseStage[]) : []);

    const inferred = inferActiveStageIndexFromStages(stages);
    if (inferred !== null && inferred >= 0 && inferred < stagesLength) {
        return inferred;
    }

    if (isPersonalStatusFile(file ?? {})) {
        return resolvePersonalStatusFallbackIndex(stages, stagesLength);
    }

    return stagesLength - 1;
}

export function isViewingArchivedStage(stage: CaseStage | undefined): boolean {
    if (!stage) return false;
    if (stage.isVoided) return true;
    if (
        stage.awaitingOpponentAppeal
        || (stage.isPleadingsClosed && isAwaitingOpponentAppeal(stage.finalDecision))
    ) {
        return false;
    }
    return stage.status === 'completed' || stage.status === 'locked';
}

/** مرحلة سابقة مُقفلة بعد الانتقال لطعن — لا تُعرض عدّاد المهلة ولا فك القفل */
export function isLockedPriorStage(stage: CaseStage | undefined | null): boolean {
    return stage?.status === 'locked';
}

/** واجهة انتظار/قفل المرافعة قبل الطعن — مراحل البداءة فقط (وليس تمييز/تصحيح). */
export function shouldShowFirstInstancePleadingLockUi(stage: CaseStage | undefined | null): boolean {
    if (!stage?.isPleadingsClosed) return false;
    if (isLockedPriorStage(stage)) return false;
    if (!isBeginningPleadingStageName(resolvePleadingStageLabel(stage))) return false;
    return stage.status === 'active' || stage.awaitingOpponentAppeal === true;
}

/** واجهة الطعن بعد ختام المرافعة — اعتراض غيابي / اعتراض الغير / إعادة محاكمة. */
export function shouldShowExtraordinaryPleadingPostJudgmentUi(
    stage: CaseStage | undefined | null,
): boolean {
    if (!stage?.isPleadingsClosed) return false;
    if (isLockedPriorStage(stage)) return false;
    const name = resolvePleadingStageLabel(stage);
    if (
        !isThirdPartyObjectionStageName(name)
        && !isAbsentObjectionStageName(name)
        && !isRetrialPleadingStageName(name)
    ) {
        return false;
    }
    return stage.status === 'active' || stage.awaitingOpponentAppeal === true;
}

export function getDisplayTimelineFromStage(stage: CaseStage | undefined) {
    const timeline = stage?.timeline ?? [];
    const active = timeline.filter((e) => !(e as { isDeleted?: boolean }).isDeleted);
    const deleted = timeline.filter((e) => (e as { isDeleted?: boolean }).isDeleted);
    return { displayTimeline: active, deletedEvents: deleted };
}
