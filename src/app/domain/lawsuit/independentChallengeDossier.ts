/**
 * تفريع الأضابير (قرار المنتج):
 * - أول طعن من نوعه (اعتراض / استئناف) يمتد داخل الإضبارة الأساس.
 * - طعن لاحق من طرف آخر مؤهل → إضبارة مخزن مستقلة (بطاقة + رقم مرتبط) — يختار المستخدم الأطراف.
 * - لا ضمّ معترض لاحق لنفس المرحلة، ولا مسار «استئناف متقابل» كبديل عن الاستقلال.
 *
 * مسار إضافي سابق: انقلاب المراكز بعد اعتراض مع رول استئناف مستخرج.
 */
import type {
    CaseLinkRecord,
    FileData,
    IndependentChallengeLink,
} from '@/app/components/lawyer/lawyerShared/fileDataTypes';
import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/lawyerShared/stageTimelineTypes';
import { isGhayabiObjectionAppealType } from '@/app/domain/lawsuit/challengeAppellantEligibility';
import {
    classifyAbsentObjectionOutcome,
    plaintiffMustFileNewOriginalAppeal,
} from '@/app/domain/lawsuit/objectionAppealConsequence';
import { getLocalTodayYmd } from '@/app/utils/localYmd';

export const INDEPENDENT_CHALLENGE_LINK_REASON = 'طعن مستقل — طرف لاحق';

export type { IndependentChallengeLink };

function stageNameOf(stage?: CaseStage | null): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

export function isAbsentObjectionStageName(name: string): boolean {
    const n = String(name ?? '').trim();
    if (!n || n.includes('اعتراض الغير')) return false;
    return (
        n.includes('اعتراض على الحكم الغيابي')
        || n.includes('الاعتراض على الحكم الغيابي')
        || n.includes('اعتراض غيابي')
        || (n.includes('اعتراض') && n.includes('غيابي'))
    );
}

function isExtractedAppealStageName(name: string): boolean {
    if (!name) return false;
    if (name.includes('اعتراض الغير') || name.includes('حكم الغير')) return false;
    if (name.includes('إعادة المحاكمة') || name.includes('إعادة محاكمة')) return false;
    if (isAbsentObjectionStageName(name)) return false;
    return name.includes('استئناف') && !name.includes('التمييز');
}

function isCassationStageName(name: string): boolean {
    return name === 'التمييز' || (name.includes('تمييز') && !name.includes('استئناف'));
}

function isSequentialHopSource(name: string): boolean {
    return isExtractedAppealStageName(name) || isCassationStageName(name);
}

function isOpenChallengeStage(stage?: CaseStage | null): boolean {
    if (!stage) return false;
    if (stage.status === 'locked' || stage.status === 'completed') return false;
    if (String(stage.finalDecision ?? '').trim()) return false;
    return true;
}

export function findExtractedAppealStageIndex(stages?: CaseStage[] | null): number {
    if (!Array.isArray(stages)) return -1;
    return stages.findIndex((stage) => isExtractedAppealStageName(stageNameOf(stage)));
}

export function findOpenAbsentObjectionStageIndex(stages?: CaseStage[] | null): number {
    if (!Array.isArray(stages)) return -1;
    return stages.findIndex((stage) => {
        if (!isAbsentObjectionStageName(stageNameOf(stage))) return false;
        return isOpenChallengeStage(stage);
    });
}

export function findOpenExtractedAppealStageIndex(stages?: CaseStage[] | null): number {
    if (!Array.isArray(stages)) return -1;
    return stages.findIndex((stage) => {
        if (!isExtractedAppealStageName(stageNameOf(stage))) return false;
        return isOpenChallengeStage(stage);
    });
}

/**
 * انقلاب المراكز: من مرحلة الاعتراض بعد إبطال الحكم الغيابي
 * يصبح المدعي مستأنفاً ضد المعترض بينما يبقى مستأنفاً عليه في الرول المستخرج.
 */
export function hasIndependentChallengeCenterInversion(params: {
    sourceStage?: CaseStage | null;
}): boolean {
    const source = params.sourceStage;
    if (!source || !isAbsentObjectionStageName(stageNameOf(source))) return false;
    const outcome = classifyAbsentObjectionOutcome(
        source.finalDecision ?? source.lastJudgmentType ?? null,
    );
    return plaintiffMustFileNewOriginalAppeal(outcome);
}

/**
 * هل يجب فتح إضبارة مستقلة بدل الامتداد/الضم؟
 * - اعتراض غيابي لاحق وأخرى قائمة مفتوحة
 * - استئناف لاحق ورول استئناف مفتوح قائم
 * - انقلاب مراكز الاعتراض مع رول مستخرج (السلوك السابق)
 */
export function shouldSpawnIndependentChallengeDossier(params: {
    stages?: CaseStage[] | null;
    sourceStage?: CaseStage | null;
    appealType?: string | null;
}): boolean {
    const appealType = String(params.appealType ?? '').trim();
    if (!appealType) return false;
    if (appealType.includes('إعادة محاكمة') || appealType.includes('إعادة المحاكمة')) {
        return false;
    }

    const isObjection =
        isGhayabiObjectionAppealType(appealType)
        || (appealType.includes('اعتراض') && !appealType.includes('استئناف'));

    if (isObjection) {
        return findOpenAbsentObjectionStageIndex(params.stages) >= 0;
    }

    if (appealType.includes('تمييز')) {
        return false;
    }

    if (appealType.includes('استئناف')) {
        const openAppeal = findOpenExtractedAppealStageIndex(params.stages);
        if (openAppeal >= 0) {
            const sourceId = String(params.sourceStage?.id ?? '');
            const open = params.stages?.[openAppeal];
            if (!sourceId || !open || String(open.id) !== sourceId) {
                return true;
            }
        }
        const sourceName = stageNameOf(params.sourceStage);
        if (isSequentialHopSource(sourceName)) return false;
        const extractedIndex = findExtractedAppealStageIndex(params.stages);
        if (extractedIndex < 0) return false;
        const extracted = params.stages?.[extractedIndex];
        const sourceId = String(params.sourceStage?.id ?? '');
        if (sourceId && extracted && String(extracted.id) === sourceId) return false;
        return hasIndependentChallengeCenterInversion({ sourceStage: params.sourceStage });
    }

    return false;
}

export function allocateLawsuitFileId(existing: Array<{ id?: number | string }>, now = Date.now()): number {
    const ids = new Set(
        existing
            .map((file) => Number(file.id))
            .filter((id) => Number.isFinite(id)),
    );
    let id = now;
    while (ids.has(id)) id += 1;
    return id;
}

function fileIdOf(file: FileData): number {
    const id = Number(file.id);
    return Number.isFinite(id) ? id : 0;
}

function buildLinkRecord(params: {
    originFileId: number;
    peerFileId: number;
    peerCaseNo: string;
    date: string;
}): CaseLinkRecord {
    return {
        id: `ind_ch_${params.originFileId}_${params.peerFileId}_${params.date}`,
        peerFileId: params.peerFileId,
        peerCaseNo: params.peerCaseNo,
        linkDate: params.date,
        reason: INDEPENDENT_CHALLENGE_LINK_REASON,
        isExternal: false,
        originFileId: params.originFileId,
        peerDossierKind: 'lawsuit',
    };
}

function lockSourceStage(params: {
    sourceStage: CaseStage;
    filingDate: string;
    newCaseNumber: string;
    appealType: string;
    createdFileId: number;
}): CaseStage {
    const event: TimelineEvent = {
        id: `independent_challenge_${params.createdFileId}_${params.filingDate}`,
        type: 'milestone',
        date: params.filingDate,
        title: 'إنشاء طعن استئنافي مستقل',
        details: `أُنشئت إضبارة ${params.appealType} مستقلة برقم ${params.newCaseNumber || '—'} دون تعديل رول الاستئناف المستخرج في هذا الملف.`,
        isSystemLog: true,
        isNew: true,
    };
    return {
        ...params.sourceStage,
        status: 'locked',
        isPleadingsClosed: true,
        awaitingOpponentAppeal: false,
        timeline: [event, ...(params.sourceStage.timeline ?? [])],
    };
}

export function applyIndependentChallengeSpawn(params: {
    sourceFile: FileData;
    sourceStageIndex: number;
    createdId: number;
    appealStage: CaseStage;
    appealType: string;
    filingDate: string;
    newCaseNumber: string;
    newCourt?: string;
}): { sourceFile: FileData; createdFile: FileData } {
    const filingDate = params.filingDate || getLocalTodayYmd();
    const sourceId = fileIdOf(params.sourceFile);
    const sourceStages = [...(params.sourceFile.stages ?? [])];
    const sourceStage = sourceStages[params.sourceStageIndex];
    if (!sourceStage) {
        throw new Error('applyIndependentChallengeSpawn: source stage missing');
    }

    const relatedAppealIndex = findExtractedAppealStageIndex(sourceStages);
    const relatedAppealStageId =
        relatedAppealIndex >= 0 ? String(sourceStages[relatedAppealIndex]?.id ?? '') : undefined;

    sourceStages[params.sourceStageIndex] = lockSourceStage({
        sourceStage,
        filingDate,
        newCaseNumber: params.newCaseNumber,
        appealType: params.appealType,
        createdFileId: params.createdId,
    });

    const sourceCaseNo = String(params.sourceFile.caseNo ?? '').trim();
    const createdCaseNo = String(params.newCaseNumber || params.appealStage.caseNo || '').trim();
    const sourceLink = buildLinkRecord({
        originFileId: sourceId,
        peerFileId: params.createdId,
        peerCaseNo: createdCaseNo || '—',
        date: filingDate,
    });
    const createdLink = buildLinkRecord({
        originFileId: params.createdId,
        peerFileId: sourceId,
        peerCaseNo: sourceCaseNo,
        date: filingDate,
    });

    const sourceFile: FileData = {
        ...params.sourceFile,
        stages: sourceStages,
        activeStageIndex: params.sourceStageIndex,
        caseLinks: [...(params.sourceFile.caseLinks ?? []), sourceLink],
    };

    const link: IndependentChallengeLink = {
        sourceFileId: sourceId,
        sourceCaseNo,
        sourceStageName: stageNameOf(sourceStage),
        ...(relatedAppealStageId ? { relatedAppealStageId } : {}),
    };

    const appealStageName = stageNameOf(params.appealStage) || 'الاستئناف';
    const appealCourt = String(params.newCourt ?? '').trim();
    const createdFile: FileData = {
        id: params.createdId,
        type: 'lawsuit',
        status: 'active',
        caseNo: createdCaseNo,
        court: appealCourt,
        judge: params.appealStage.judge,
        docType: params.appealStage.docType ?? params.sourceFile.docType,
        parties: params.appealStage.parties ?? [],
        representedParty: params.sourceFile.representedParty ?? undefined,
        currentStage: appealStageName,
        history: [
            {
                id: `ind_open_${params.createdId}`,
                type: 'milestone',
                date: filingDate,
                title: `فتح إضبارة ${appealStageName}`,
                details: `طعن مستقل عن الإضبارة ${sourceCaseNo || '—'} — رول الاستئناف المستخرج لم يُعدَّل.`,
                isNew: true,
            },
        ],
        notes: [],
        images: [],
        date: filingDate,
        parentId: sourceId,
        independentChallengeLink: link,
        caseLinks: [createdLink],
        stages: [
            {
                ...params.appealStage,
                caseNo: createdCaseNo,
                court: appealCourt,
            },
        ],
        activeStageIndex: 0,
        lawsuitJurisdiction: params.sourceFile.lawsuitJurisdiction,
        applicableLaw: params.sourceFile.applicableLaw,
        disputeIntegrity: params.sourceFile.disputeIntegrity,
        claimValue: params.sourceFile.claimValue,
        isUndeterminedValue: params.sourceFile.isUndeterminedValue,
        isFixedFee: params.sourceFile.isFixedFee,
        clientPhone: params.sourceFile.clientPhone,
        feesTotal: '0',
        feesPaid: '0',
    };

    return { sourceFile, createdFile };
}

export function readIndependentChallengeLink(
    file: FileData | Record<string, unknown> | null | undefined,
): IndependentChallengeLink | null {
    const raw = file && typeof file === 'object' ? (file as FileData).independentChallengeLink : undefined;
    if (!raw || typeof raw !== 'object') return null;
    const sourceFileId = Number(raw.sourceFileId);
    if (!Number.isFinite(sourceFileId)) return null;
    return {
        sourceFileId,
        sourceCaseNo: String(raw.sourceCaseNo ?? '').trim(),
        sourceStageName: String(raw.sourceStageName ?? '').trim(),
        relatedAppealStageId: raw.relatedAppealStageId ? String(raw.relatedAppealStageId) : undefined,
    };
}

export function areIndependentChallengePeers(
    left?: FileData | null,
    right?: FileData | null,
): boolean {
    if (!left || !right) return false;
    const leftId = Number(left.id);
    const rightId = Number(right.id);
    if (!Number.isFinite(leftId) || !Number.isFinite(rightId) || leftId === rightId) return false;
    const leftLink = readIndependentChallengeLink(left);
    const rightLink = readIndependentChallengeLink(right);
    if (leftLink && Number(leftLink.sourceFileId) === rightId) return true;
    if (rightLink && Number(rightLink.sourceFileId) === leftId) return true;
    return false;
}

export type IndependentChallengeSpawnInput = {
    sourceFileId: number;
    sourceStages: CaseStage[];
    sourceStageIndex: number;
    appealStage: CaseStage;
    appealType: string;
    filingDate: string;
    newCaseNumber: string;
    newCourt?: string;
    /** نسخة الإضبارة المفتوحة — لا يعتمد الإنشاء على قائمة مخزن قد تكون متأخرة */
    sourceFile?: FileData;
};

