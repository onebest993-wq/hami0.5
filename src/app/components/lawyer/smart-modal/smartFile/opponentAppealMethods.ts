import {
    filterPersonalStatusAppealMethods,
    isPersonalStatusAppealContext,
    isPersonalStatusCoreStage,
} from '@/app/components/lawyer/personal-status/personalStatusAppealStageHelpers';
import { canOfferAbsentObjectionToDefendant } from './absentJudgmentFlow';
import { isPlaintiffRepresentedParty, isDefendantRepresentedParty } from './representedPartySide';
import {
    filterMethodsForAppealRoute,
    isAppellateAppealAllowed,
    type AppealRouteContext,
} from './appealRouteEligibility';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';
import { isAppealStageName, isCassationCorrectionStageName, isCassationStageName } from './judgmentStageNames';
import {
    isBeginningPleadingStageName,
    isPleadingStageName,
    isRetrialPleadingStageName,
    isThirdPartyObjectionStageName,
} from './pleadingStageClassification';
import type { CaseStage } from '../../LawyerShared';

export function isFirstInstanceStageName(stageName?: string): boolean {
    const s = String(stageName ?? '');
    if (!s) return false;
    if (isAppealStageName(s) || isCassationStageName(s)) return false;
    if (isCassationCorrectionStageName(s)) return false;
    if (isAbsentObjectionStageName(s)) return false;
    if (isThirdPartyObjectionStageName(s)) return false;
    if (isRetrialPleadingStageName(s)) return false;
    if (s.includes('أحوال شخصية') || s === 'الأحوال الشخصية') return false;
    return !s.includes('استئناف') && !s.includes('التمييز') && s !== 'التمييز';
}

function resolveJudgmentFormLabel(
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
    finalDecision?: string | null;
    appealRoute?: AppealRouteContext | null;
    stages?: Array<Pick<CaseStage, 'stageName'> | { stageName?: string | null }> | null;
    file?: { lawsuitJurisdiction?: string; selectedType?: string } | null;
}): string[] {
    const stage = String(ctx.stageName ?? '');
    const form = resolveJudgmentFormLabel(ctx.judgmentForm, ctx.lastJudgmentType);

    if (isCassationStageName(stage)) {
        return [];
    }

    let methods: string[];

    if (isPersonalStatusAppealContext(stage, ctx.stages, ctx.file)) {
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

    if (isPersonalStatusAppealContext(stage, ctx.stages, ctx.file)) {
        methods = filterPersonalStatusAppealMethods(methods);
        if (ctx.appealRoute) {
            methods = filterMethodsForAppealRoute(methods, ctx.appealRoute);
        }
        if (
            !canOfferAbsentObjectionToDefendant({
                currentStage: ctx.stageName,
                stages: ctx.stages,
                judgmentForm: ctx.judgmentForm,
                lastJudgmentType: ctx.lastJudgmentType,
                finalDecision: ctx.finalDecision,
                opponentRegistration: true,
            })
        ) {
            methods = methods.filter((method) => method !== 'اعتراض غيابي');
        }
        return methods;
    }

    if (ctx.appealRoute) {
        methods = filterMethodsForAppealRoute(methods, ctx.appealRoute);
    }

    if (
        !canOfferAbsentObjectionToDefendant({
            currentStage: ctx.stageName,
            stages: ctx.stages,
            judgmentForm: ctx.judgmentForm,
            lastJudgmentType: ctx.lastJudgmentType,
            finalDecision: ctx.finalDecision,
            opponentRegistration: true,
        })
    ) {
        methods = methods.filter((method) => method !== 'اعتراض غيابي');
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
    return (
        fd.includes('بانتظار الطعن')
        || fd.includes('بانتظار طعن')
        || fd.includes('بانتظار التمييز')
        || fd.includes('بانتظار تمييز')
    );
}

/** إظهار زر «قام الخصم بالطعن» بعد حفظ انتظار طعن الخصم */
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
    representedParty?: string | null,
): boolean {
    if (!stage?.isPleadingsClosed) return false;
    if (stage.wasReopened) return false;
    if (stage.status === 'locked' || stage.status === 'completed') return false;
    if (stage.stageName && isAbsentObjectionStageName(stage.stageName)) {
        return stage.awaitingOpponentAppeal === true;
    }
    const stageName = String(stage.stageName ?? '').trim();
    const isPersonalCoreStage =
        isPersonalStatusCoreStage(stageName) && !isAbsentObjectionStageName(stageName);

    if (stageName && !isPleadingStageName(stageName) && !isPersonalCoreStage) return false;
    if (
        stageName
        && !isAppealStageName(stageName)
        && !isBeginningPleadingStageName(stageName)
        && !isPersonalCoreStage
    ) {
        return false;
    }

    if (stage.awaitingOpponentAppeal === true) return true;

    const fd = String(stage.finalDecision ?? '');
    const st = String(fileStatus ?? '');

    if (fd.includes('مكتسبة الدرجة القطعية') || fd.includes('مبطلة') || fd === 'منتهية') {
        return false;
    }

    /* خسارة الموكل أو رد كلي = الموكل يطعن، لا تسجيل طعن خصم كمسار أساسي */
    if (fd.includes('محسومة ضد الموكل') || fd.includes('ضد الموكل')) {
        return false;
    }
    if (fd.includes('يحق لموكلك الطعن') && !fd.includes('يحق للطرفين') && !fd.includes('جزئياً')) {
        return false;
    }

    /*
     * إجابة الدعوى + وكيل المدعى عليه = المدعى عليه خسر موضوعاً → لا زر «قام الخصم بالطعن».
     * أما «لصالح الموكل» فتعني كسب الموكل بغض النظر عن صفته.
     */
    if (
        fd.includes('إجابة الدعوى')
        && !fd.includes('لصالح الموكل')
        && representedParty
        && !isPlaintiffRepresentedParty(representedParty)
    ) {
        return false;
    }

    if (isAwaitingOpponentAppeal(fd)) return true;
    if (st.includes('بانتظار')) {
        if (fd.includes('ضد الموكل')) return false;
        if (fd.includes('يحق لموكلك الطعن') && !fd.includes('يحق للطرفين') && !fd.includes('جزئياً')) {
            return false;
        }
        return true;
    }
    if (stage.appealDeadline && (fd.includes('لصالح الموكل') || fd.includes('بانتظار'))) {
        return true;
    }

    return false;
}

/**
 * منطوق يشير إلى أن المدعي ربح موضوع الدعوى (إجابة) — وليس «لصالح الموكل».
 * «لصالح الموكل» يعتمد على صفة الموكل وقد يكون المدعى عليه الكاسب.
 */
export function isPlaintiffFavorableFinalDecision(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '');
    if (fd.includes('ضد الموكل')) return false;
    return (
        fd.includes('إجابة الدعوى')
        || fd.includes('مكتسبة الدرجة القطعية')
        || fd.includes('الصلح')
        || fd.includes('التنازل')
    );
}

/** الموكل كسب الحكم — انتظار طعن الخصم فقط (لا طعن ذاتي). */
export function isClientWonAwaitingOpponentFinalDecision(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '').trim();
    if (!fd) return false;
    if (fd.includes('ضد الموكل')) return false;
    if (fd.includes('جزئياً') || fd.includes('يحق للطرفين')) return false;
    if (fd.includes('يحق لموكلك الطعن')) return false;
    if (fd.includes('لصالح الموكل')) return true;
    if (isAwaitingOpponentAppeal(fd) && !fd.includes('محسومة - بانتظار')) return true;
    return false;
}

/** قرار يستوجب طعن الموكل (خسارة أو جزئي لكلا الطرفين). */
export function isClientSelfAppealFinalDecision(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '').trim();
    if (!fd) return false;
    if (fd.includes('لصالح الموكل') && !fd.includes('جزئياً') && !fd.includes('يحق للطرفين')) {
        return false;
    }
    return (
        fd.includes('ضد الموكل')
        || fd.includes('يحق لموكلك الطعن')
        || fd.includes('يحق للطرفين')
        || fd.includes('جزئياً')
    );
}

export function hasMeritJudgmentRecorded(
    stage?: {
        finalDecision?: string | null;
        decisionDate?: string | null;
        awaitingOpponentAppeal?: boolean;
    } | null,
): boolean {
    if (!stage) return false;
    if (stage.awaitingOpponentAppeal === true) return true;
    if (String(stage.finalDecision ?? '').trim()) return true;
    if (String(stage.decisionDate ?? '').trim()) return true;
    return false;
}

type AppealFooterStageHint = {
    awaitingOpponentAppeal?: boolean;
    finalDecision?: string | null;
} | null;

/**
 * تذييل انتظار طعن الخصم — بعد كسب الموكل (مدعياً كان أو مدعى عليه).
 * لا يعتمد على «صفة المدعي» وحدها: الخاسر فقط يطعن.
 */
export function shouldShowOpponentAppealWatchPostJudgmentFooter(
    _representedParty: string | null | undefined,
    finalDecision: string | null | undefined,
    stage?: AppealFooterStageHint,
): boolean {
    if (stage?.awaitingOpponentAppeal === true) {
        const fd = String(finalDecision ?? stage.finalDecision ?? '');
        if (fd.includes('جزئياً') || fd.includes('يحق للطرفين')) return false;
        return true;
    }
    return isClientWonAwaitingOpponentFinalDecision(finalDecision);
}

/**
 * تذييل تقديم طعن الموكل — بعد خسارته، أو حكم جزئي يحق فيه للطرفين.
 * لا يُعرض أبداً عندما يكون الموكل هو الكاسب وينتظر طعن الخصم.
 */
export function shouldShowClientAppealPostJudgmentFooter(
    representedParty: string | null | undefined,
    finalDecision: string | null | undefined,
    stage?: AppealFooterStageHint,
): boolean {
    const fd = String(finalDecision ?? '').trim();
    if (stage?.awaitingOpponentAppeal === true && !fd.includes('جزئياً') && !fd.includes('يحق للطرفين')) {
        return false;
    }
    if (isClientWonAwaitingOpponentFinalDecision(fd)) return false;
    if (isClientSelfAppealFinalDecision(fd)) return true;
    /*
     * مسار احتياطي: إجابة الدعوى + وكيل المدعى عليه = المدعى عليه خسر موضوعاً.
     * لا يُستخدم إن وُجد «لصالح الموكل» (موكل مدعى عليه كسب بالرد الكلي).
     */
    if (fd.includes('لصالح الموكل')) return false;
    return isDefendantRepresentedParty(representedParty) && fd.includes('إجابة الدعوى');
}
