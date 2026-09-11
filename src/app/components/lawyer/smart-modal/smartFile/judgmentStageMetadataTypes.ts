/**
 * مساعدات قراءة/كتابة metadata الطعn — smart-modal layer.
 * الأنواع الأساسية في domain/lawsuit/stageTransitionMetadataTypes.ts
 */
export type {
    StageOutcome,
    JudgmentFormType,
    CourtJurisdiction,
    FirstInstanceDegree,
    StageTransitionMetadata,
    AppealStageMetadata,
} from '@/app/domain/lawsuit/stageTransitionMetadataTypes';

export {
    STAGE_OUTCOMES,
    JUDGMENT_FORM_TYPES,
    COURT_JURISDICTIONS,
    FIRST_INSTANCE_DEGREES,
    isStageOutcome,
    isJudgmentFormType,
    isCourtJurisdiction,
    isFirstInstanceDegree,
} from '@/app/domain/lawsuit/stageTransitionMetadataTypes';

import type {
    AppealStageMetadata,
    CourtJurisdiction,
    FirstInstanceDegree,
    JudgmentFormType,
    StageOutcome,
    StageTransitionMetadata,
} from '@/app/domain/lawsuit/stageTransitionMetadataTypes';
import {
    normalizePartyJudgmentDispositions,
    summarizePartyJudgmentForm,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';

/** توحيد معرف طرف إلى string للمقارنة الآمنة */
export function normalizePartyId(id: unknown): string | null {
    if (id == null) return null;
    const s = String(id).trim();
    return s || null;
}

export function normalizePartyIdList(
    ids?: Array<number | string> | null,
): string[] {
    if (!Array.isArray(ids)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of ids) {
        const id = normalizePartyId(raw);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

/** تحويل legacy Arabic judgment form → JudgmentFormType */
export function parseJudgmentFormType(raw: unknown): JudgmentFormType | null {
    const t = String(raw ?? '').trim();
    if (!t) return null;
    const upper = t.toUpperCase();
    if (t.includes('مختلط') || upper === 'MIXED') return 'MIXED';
    if (t.includes('غياب') || upper === 'GHAYABI') return 'GHAYABI';
    if (t.includes('حضور') || t.includes('بمثابة') || upper === 'HADORI') return 'HADORI';
    return null;
}

/**
 * شكل الحكم السابق من الصفات الفردية ثم الملخص السُلّمي.
 * المختلط لا يُختم حضورياً؛ بمثابة الحضوري حضور-مثل.
 */
export function resolveStructuredJudgmentForm(source?: {
    judgmentForm?: unknown;
    lastJudgmentType?: unknown;
    partyJudgmentDispositions?: unknown;
} | null): JudgmentFormType {
    if (!source) return 'HADORI';
    const summary = summarizePartyJudgmentForm(
        normalizePartyJudgmentDispositions(source.partyJudgmentDispositions),
        String(source.judgmentForm ?? source.lastJudgmentType ?? ''),
    );
    return parseJudgmentFormType(summary) ?? 'HADORI';
}

/** تحويل legacy client outcome (win/loss/partial) → StageOutcome */
export function legacyAppealOutcomeToStageOutcome(
    outcome: 'win' | 'loss' | 'partial' | 'unknown' | null | undefined,
): StageOutcome | null {
    if (outcome === 'win') return 'WIN';
    if (outcome === 'loss') return 'LOSS';
    if (outcome === 'partial') return 'PARTIAL';
    return null;
}

export function stageOutcomeToLegacyAppealOutcome(
    outcome: StageOutcome | null | undefined,
): 'win' | 'loss' | 'partial' | 'unknown' {
    if (outcome === 'WIN') return 'win';
    if (outcome === 'LOSS') return 'loss';
    if (outcome === 'PARTIAL') return 'partial';
    return 'unknown';
}

/** يقرأ appellantPartyIds من metadata مهيكل أو legacy initialAppellantPartyIds */
export function readAppellantPartyIds(meta?: AppealStageMetadata | null): string[] {
    if (!meta) return [];
    if (Array.isArray(meta.appellantPartyIds) && meta.appellantPartyIds.length > 0) {
        return normalizePartyIdList(meta.appellantPartyIds);
    }
    return normalizePartyIdList(meta.initialAppellantPartyIds);
}

/** يقرأ appelleePartyIds أو يستنتجها من الأطراف */
export function readAppelleePartyIds(
    meta?: AppealStageMetadata | null,
    allPartyIds?: Array<number | string>,
): string[] {
    if (!meta) return [];
    if (Array.isArray(meta.appelleePartyIds) && meta.appelleePartyIds.length > 0) {
        return normalizePartyIdList(meta.appelleePartyIds);
    }
    const appellants = new Set(readAppellantPartyIds(meta));
    if (!allPartyIds?.length || appellants.size === 0) return [];
    return normalizePartyIdList(allPartyIds).filter((id) => !appellants.has(id));
}

/** بناء metadata مهيكل كامل للكتابة عند انتقال مرحلي */
export function buildStageTransitionMetadata(input: {
    appellantPartyIds: Array<number | string>;
    appelleePartyIds?: Array<number | string>;
    priorStageOutcome: StageOutcome;
    priorJudgmentForm: JudgmentFormType;
    priorJudgmentType?: string;
    isCrossAppeal?: boolean;
    jurisdiction?: CourtJurisdiction;
    firstInstanceDegree?: FirstInstanceDegree;
}): StageTransitionMetadata & Pick<AppealStageMetadata, 'jurisdiction' | 'firstInstanceDegree'> {
    return {
        appellantPartyIds: normalizePartyIdList(input.appellantPartyIds),
        appelleePartyIds: normalizePartyIdList(input.appelleePartyIds ?? []),
        priorStageOutcome: input.priorStageOutcome,
        priorJudgmentForm: input.priorJudgmentForm,
        priorJudgmentType: input.priorJudgmentType,
        isCrossAppeal: input.isCrossAppeal ?? false,
        jurisdiction: input.jurisdiction,
        firstInstanceDegree: input.firstInstanceDegree,
    };
}

/** دمج metadata جديد مع legacy موجود */
export function mergeAppealStageMetadata(
    existing: AppealStageMetadata | undefined | null,
    patch: Partial<AppealStageMetadata>,
): AppealStageMetadata {
    const appellantPartyIds =
        patch.appellantPartyIds?.length
            ? normalizePartyIdList(patch.appellantPartyIds)
            : readAppellantPartyIds(existing);
    const appelleePartyIds =
        patch.appelleePartyIds?.length
            ? normalizePartyIdList(patch.appelleePartyIds)
            : readAppelleePartyIds(existing);

    return {
        ...existing,
        ...patch,
        appellantPartyIds,
        appelleePartyIds,
        initialAppellantPartyIds:
            patch.initialAppellantPartyIds
            ?? existing?.initialAppellantPartyIds
            ?? appellantPartyIds,
        hasCrossAppeal: patch.isCrossAppeal ?? patch.hasCrossAppeal ?? existing?.hasCrossAppeal,
        isCrossAppeal: patch.isCrossAppeal ?? existing?.isCrossAppeal ?? existing?.hasCrossAppeal,
    };
}
