import {
    filterPersonalStatusAppealMethods,
    isPersonalStatusStageName,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import {
    filterMethodsForAppealRoute,
    isAppellateAppealAllowed,
    type AppealRouteContext,
} from './appealRouteEligibility';
import type { CaseStage, TimelineEvent, Party } from '../../LawyerShared';
import { formatDateToLocalYmd, parseLocalNotificationDate } from '@/app/utils/executionStateMachine';
import {
    hasInterpleaderParties,
    isInterpleaderJudgmentType,
    resolveClientPartyBucket,
    resolveInterpleaderHadoriAppealRights,
    resolveLawyerJudgmentBucket,
} from './interpleaderJudgmentEngine';

/** Payload from SmartJudgmentModal / validation pipeline. */
export type JudgmentPayload = {
    date?: string;
    type?: string;
    form?: string;
    decision?: string;
    action?: string;
    judgmentType?: string;
    judgmentForm?: string;
    judgmentDate?: string;
    notes?: string;
    nextStage?: string;
    openAppealTransitionModal?: boolean;
    openObjectionModal?: boolean;
    /** بعد حفظ الحكم يفتح نافذة تسجيل طعن الخصم */
    openRegisterOpponentAppealModal?: boolean;
    [key: string]: unknown;
};

export type AppealTransitionPayload = {
    appealType: string;
    appellant: string;
    filingDate: string;
    newCaseNumber: string;
    notes: string;
    includedOpponentPartyIds?: Array<number | string>;
    includedAppellantPartyIds?: Array<number | string>;
    appealDossierMode?: 'standard' | 'interpleader_appellant' | 'against_interpleader';
};

export type CrossAppealPayload = {
    filingDate: string;
    receiptNumber: string;
    notes: string;
    crossAppealPartyIds?: Array<number | string>;
};

export type StageTransitionPayload = {
    newStage: string;
    newCourt: string;
    newCaseNo: string;
    appellant: string;
    result: string;
    date: string;
    [key: string]: unknown;
};

export type SmartFileAttachment = {
    id?: string;
    isActive?: boolean;
    status?: string;
    attachedProperty?: string;
    judgmentSyncDate?: string;
    judgmentSyncNote?: string;
    [key: string]: unknown;
};

export function str(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

export function parseJudgmentDateInput(judgmentDate: unknown): Date {
    const jdRaw = str(judgmentDate).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(jdRaw)) {
        return parseLocalNotificationDate(jdRaw);
    }
    if (judgmentDate instanceof Date && !Number.isNaN(judgmentDate.getTime())) {
        return judgmentDate;
    }
    if (typeof judgmentDate === 'number') {
        return new Date(judgmentDate);
    }
    const parsed = new Date(str(judgmentDate));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function addDaysYmd(base: Date | string, days: number): string {
    const parsed = typeof base === 'string' ? parseJudgmentDateInput(base) : base;
    const result = new Date(parsed);
    result.setDate(result.getDate() + days);
    return formatDateToLocalYmd(result);
}

export function prependTimeline(
    stage: CaseStage,
    event: TimelineEvent,
): TimelineEvent[] {
    return [event, ...(stage.timeline ?? [])];
}

export function stageAttachments(stage: CaseStage): SmartFileAttachment[] {
    if (!Array.isArray(stage.attachments)) return [];
    return stage.attachments as SmartFileAttachment[];
}

export const JUDGMENT_TYPE_SULH = 'الصلح';
export const JUDGMENT_TYPE_SULH_LEGACY = 'تصديق الصلح والتسوية';
export const JUDGMENT_TYPE_WAIVER = 'التنازل عن الدعوى';
/** @deprecated Legacy picker value — kept for existing saved records */
export const JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY = 'إبطال عريضة الدعوى';

export function isSulhJudgmentType(type: string): boolean {
    return type === JUDGMENT_TYPE_SULH || type === JUDGMENT_TYPE_SULH_LEGACY;
}

export function isNonMeritTerminationType(type: string): boolean {
    return (
        isSulhJudgmentType(type)
        || type === JUDGMENT_TYPE_WAIVER
        || type === JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY
    );
}

export const JUDGMENT_TYPE_FULL_WIN = 'إجابة الدعوى بالكامل';
export const JUDGMENT_TYPE_VOID = 'إبطال';

/** أحكام لصالح المدعي/إنهاء رضائي — الطعن التمييزي للمدعى عليه فقط (ما عدا الإبطال). */
export function isDefendantOnlyCassationJudgmentType(type: string): boolean {
    return (
        type === JUDGMENT_TYPE_FULL_WIN
        || type === 'إجابة الدعوى'
        || isSulhJudgmentType(type)
        || type === JUDGMENT_TYPE_WAIVER
    );
}

export type FirstInstanceAppealAction =
    | 'wait_opponent'
    | 'self_appeal'
    | 'finalize_non_merit'
    | 'archive_void'
    | 'both_paths'
    | 'none';

export type FirstInstanceAppealRights = {
    action: FirstInstanceAppealAction;
    hint: string;
};

/**
 * حقوق الطعن في البداءة (حكم حضوري) — حسب نوع المنطوق وجانب الموكل.
 * - إجابة كاملة: المدعي ينتظر طعن الخصم فقط؛ المدعى عليه يطعن.
 * - رد كلي: المدعي يطعن؛ المدعى عليه ينتظر فقط.
 * - رد جزئي: الطعن متاح للطرفين.
 */
export function resolveFirstInstanceHadoriAppealRights(
    judgmentType: string,
    lawyerSide: 'المدعي' | 'المدعى عليه' | null,
    context?: {
        parties?: Party[];
        representedParty?: string | null;
    },
): FirstInstanceAppealRights {
    const lawyerBucket =
        resolveClientPartyBucket(context?.parties)
        ?? resolveLawyerJudgmentBucket(context?.representedParty, context?.parties)
        ?? (lawyerSide === 'المدعي'
            ? 'plaintiff'
            : lawyerSide === 'المدعى عليه'
              ? 'defendant'
              : null);
    const effectiveSide: 'المدعي' | 'المدعى عليه' | null =
        lawyerSide
        ?? (lawyerBucket === 'plaintiff'
            ? 'المدعي'
            : lawyerBucket === 'defendant'
              ? 'المدعى عليه'
              : null);

    if (hasInterpleaderParties(context?.parties)) {
        if (judgmentType === JUDGMENT_TYPE_VOID || judgmentType === 'إبطال') {
            return { action: 'archive_void', hint: '' };
        }
        if (isNonMeritTerminationType(judgmentType)) {
            return {
                action: 'finalize_non_merit',
                hint: 'إنهاء نهائي — مكتسبة الدرجة القطعية (لا حق للطعن).',
            };
        }
    }

    if (isInterpleaderJudgmentType(judgmentType)) {
        return resolveInterpleaderHadoriAppealRights(judgmentType, lawyerBucket);
    }

    if (!effectiveSide) {
        if (judgmentType === JUDGMENT_TYPE_VOID || judgmentType === 'إبطال') {
            return { action: 'archive_void', hint: '' };
        }
        if (isNonMeritTerminationType(judgmentType)) {
            return {
                action: 'finalize_non_merit',
                hint: 'إنهاء نهائي — مكتسبة الدرجة القطعية (لا حق للطعن).',
            };
        }
        if (judgmentType === 'رد الدعوى جزئياً') {
            return {
                action: 'both_paths',
                hint: 'حكم جزئي — يحق لكلا الطرفين الطعن فيما حُسم عليه.',
            };
        }
        return {
            action: 'both_paths',
            hint: 'اختر الإجراء المناسب: انتظار طعن الخصم إن كنت الكاسب، أو الانتقال للطعن إن كنت الخاسر.',
        };
    }

    if (judgmentType === JUDGMENT_TYPE_VOID || judgmentType === 'إبطال') {
        return { action: 'archive_void', hint: '' };
    }

    if (isNonMeritTerminationType(judgmentType)) {
        return {
            action: 'finalize_non_merit',
            hint: 'إنهاء نهائي — مكتسبة الدرجة القطعية (لا حق للطعن).',
        };
    }

    const isFullWin = judgmentType === JUDGMENT_TYPE_FULL_WIN;
    const isFullLoss = judgmentType === 'رد الدعوى كلياً';
    const isPartial = judgmentType === 'رد الدعوى جزئياً';

    if (isFullWin) {
        if (effectiveSide === 'المدعي') {
            return {
                action: 'wait_opponent',
                hint: 'كسبتم الدعوى — لا يحق لموكلك الطعن. تُقفل المرافعة بانتظار طعن الخصم (المدعى عليه).',
            };
        }
        return {
            action: 'self_appeal',
            hint: 'صدر حكم بإجابة الدعوى — يحق لموكلك (المدعى عليه) الطعن بالاستئناف أو التمييز.',
        };
    }

    if (isFullLoss) {
        if (effectiveSide === 'المدعي') {
            return {
                action: 'self_appeal',
                hint: 'صدر حكم برفض الدعوى — يحق لموكلك (المدعي) الطعن.',
            };
        }
        return {
            action: 'wait_opponent',
            hint: 'كسبتم الدعوى — لا يحق لموكلك الطعن. بانتظار طعن المدعي إن رغب.',
        };
    }

    if (isPartial) {
        return {
            action: 'self_appeal',
            hint: 'حكم جزئي — يحق لموكلك وللخصم الطعن فيما حُسم عليه.',
        };
    }

    return { action: 'none', hint: '' };
}

/** تلميح ذكي لكل خيار حكم حسب صفة الموكل — يُعرض في قائمة المنطوق. */
export function resolveJudgmentAppealHintForLawyer(
    judgmentType: string,
    lawyerSide: 'المدعي' | 'المدعى عليه' | null,
    context?: {
        parties?: Party[];
        representedParty?: string | null;
    },
): string | undefined {
    const rights = resolveFirstInstanceHadoriAppealRights(judgmentType, lawyerSide, context);
    switch (rights.action) {
        case 'wait_opponent':
            return 'لا يحق لموكلك الطعن — بانتظار طعن الخصم';
        case 'self_appeal':
            return judgmentType === 'رد الدعوى جزئياً'
                ? 'يحق لموكلك الطعن (حكم جزئي)'
                : 'يحق لموكلك الطعن';
        case 'finalize_non_merit':
            return 'إنهاء نهائي — لا حق للطعن';
        case 'archive_void':
            return 'إبطال — أرشفة الإضبارة';
        default:
            return undefined;
    }
}

export function isFirstInstanceStageName(stageName?: string): boolean {
    const s = String(stageName ?? '');
    return !s.includes('استئناف') && !s.includes('التمييز') && s !== 'التمييز';
}

export function isAppealStageName(stageName?: string): boolean {
    const s = String(stageName ?? '');
    return s.includes('استئناف') && !s.includes('التمييز');
}

export function isCassationStageName(stageName?: string): boolean {
    const s = String(stageName ?? '');
    return s === 'التمييز' || (s.includes('تمييز') && !s.includes('استئناف'));
}

export function resolveJudgmentFormLabel(
    judgmentForm?: string | null,
    lastJudgmentType?: string | null,
): 'حضوري' | 'غيابي' {
    const raw = String(judgmentForm ?? lastJudgmentType ?? 'حضوري').trim();
    return raw.includes('غيابي') ? 'غيابي' : 'حضوري';
}

/**
 * طرق طعن الخصم المتاحة في نافذة «قام الخصم بالطعن».
 * - حضوري: لا اعتراض غيابي.
 * - إن وُجد الاستئناف كطريق مسموح: لا اعتراض الغير ولا إعادة محاكمة.
 */
export function resolveAllowedOpponentAppealMethods(ctx: {
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    stageName?: string | null;
    appealRoute?: AppealRouteContext | null;
}): string[] {
    const stage = String(ctx.stageName ?? '');
    const form = resolveJudgmentFormLabel(ctx.judgmentForm, ctx.lastJudgmentType);

    if (isCassationStageName(stage)) {
        return [];
    }

    let methods: string[];

    if (isPersonalStatusStageName(stage)) {
        methods = form === 'غيابي'
            ? ['اعتراض غيابي', 'تمييز']
            : ['تمييز'];
    } else if (isAppealStageName(stage)) {
        methods = ['تمييز'];
    } else if (isFirstInstanceStageName(stage)) {
        methods = form === 'غيابي'
            ? ['اعتراض غيابي', 'استئناف', 'تمييز']
            : ['استئناف', 'تمييز'];
    } else {
        methods = ['استئناف', 'تمييز'];
        if (form === 'غيابي') methods.unshift('اعتراض غيابي');
    }

    if (isPersonalStatusStageName(stage)) {
        methods = filterPersonalStatusAppealMethods(methods);
        if (ctx.appealRoute) {
            methods = filterMethodsForAppealRoute(methods, ctx.appealRoute);
        }
        return methods;
    }

    if (ctx.appealRoute) {
        methods = filterMethodsForAppealRoute(methods, ctx.appealRoute);
    }

    if (ctx.appealRoute && !isAppellateAppealAllowed(ctx.appealRoute)) {
        return methods;
    }

    const appellateAllowed = methods.includes('استئناف');
    if (appellateAllowed) {
        return methods.filter((m) => m !== 'اعتراض الغير' && m !== 'إعادة محاكمة');
    }

    if (isAppealStageName(stage) || isCassationStageName(stage)) {
        return methods;
    }

    return [...methods, 'اعتراض الغير', 'إعادة محاكمة'];
}

export function isAwaitingOpponentAppeal(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '');
    return fd.includes('بانتظار الطعن') || fd.includes('بانتظار التمييز') || fd.includes('بانتظار تمييز');
}

/** إظهار زر «قام المدين بالطعن» بعد حفظ انتظار طعن الخصم */
export function shouldShowOpponentAppealRegisterButton(
    stage?: {
        finalDecision?: string | null;
        isPleadingsClosed?: boolean;
        appealDeadline?: string | null;
        wasReopened?: boolean;
        awaitingOpponentAppeal?: boolean;
        stageName?: string | null;
        status?: string | null;
    } | null,
    fileStatus?: string | null,
): boolean {
    if (!stage?.isPleadingsClosed) return false;
    if (stage.wasReopened) return false;
    if (stage.status === 'locked' || stage.status === 'completed') return false;
    if (stage.stageName && !isFirstInstanceStageName(stage.stageName)) return false;

    if (stage.awaitingOpponentAppeal === true) return true;

    const fd = String(stage.finalDecision ?? '');
    const st = String(fileStatus ?? '');

    if (fd.includes('مكتسبة الدرجة القطعية') || fd.includes('مبطلة') || fd === 'منتهية') {
        return false;
    }

    if (fd.includes('محسومة ضد الموكل') || fd.includes('ضد الموكل') || fd.includes('رد الدعوى كلياً')) {
        return false;
    }

    if (isAwaitingOpponentAppeal(fd)) return true;
    if (st.includes('بانتظار')) return true;
    if (stage.appealDeadline && (fd.includes('لصالح الموكل') || fd.includes('بانتظار') || fd.includes('إجابة الدعوى'))) {
        return true;
    }

    return false;
}

export function isPlaintiffFavorableFinalDecision(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '');
    return (
        fd.includes('إجابة الدعوى')
        || fd.includes('لصالح الموكل')
        || fd.includes('مكتسبة الدرجة القطعية')
        || fd.includes('الصلح')
        || fd.includes('التنازل')
    );
}

/** يستنتج جانب الموكل من العلامة أو الإعدادات */
export function resolveLawyerSide(
    representedParty?: string | null,
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        side?: 'right' | 'left';
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }>,
): 'المدعي' | 'المدعى عليه' | null {
    const fromMarker = resolveClientPartyBucket(parties);
    if (fromMarker === 'plaintiff') return 'المدعي';
    if (fromMarker === 'defendant') return 'المدعى عليه';

    const rp = String(representedParty ?? '').trim();
    if (rp === 'المدعي' || rp === 'plaintiff' || rp === 'client') return 'المدعي';
    if (rp === 'المدعى عليه' || rp === 'defendant' || rp === 'opponent') return 'المدعى عليه';

    return null;
}
