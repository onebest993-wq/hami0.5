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
import { filterOpponentMethodsAfterLapse } from './appealWindowLapseEngine';
import {
    judgmentFormHasGhayabi,
    hasAnyReleasedDisposition,
    areAllDispositionsReleased,
    normalizePartyJudgmentDispositions,
    type PartyJudgmentDisposition,
} from '@/app/domain/lawsuit/partyJudgmentDisposition';

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
    dispositions?: PartyJudgmentDisposition[] | unknown,
): 'حضوري' | 'غيابي' {
    return judgmentFormHasGhayabi(judgmentForm, lastJudgmentType, dispositions) ? 'غيابي' : 'حضوري';
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
    appealWindowLapsed?: boolean;
    cassationWindowLapsed?: boolean;
    partyJudgmentDispositions?: PartyJudgmentDisposition[] | unknown;
}): string[] {
    const stage = String(ctx.stageName ?? '');
    const form = resolveJudgmentFormLabel(
        ctx.judgmentForm,
        ctx.lastJudgmentType,
        ctx.partyJudgmentDispositions,
    );

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
                partyJudgmentDispositions: ctx.partyJudgmentDispositions,
            })
        ) {
            methods = methods.filter((method) => method !== 'اعتراض غيابي');
        }
        return filterOpponentMethodsAfterLapse(methods, ctx);
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
            partyJudgmentDispositions: ctx.partyJudgmentDispositions,
        })
    ) {
        methods = methods.filter((method) => method !== 'اعتراض غيابي');
    }

    if (ctx.appealRoute && !isAppellateAppealAllowed(ctx.appealRoute)) {
        return filterOpponentMethodsAfterLapse(methods, ctx);
    }

    const appellateAllowed = methods.includes('استئناف');
    if (appellateAllowed) {
        return filterOpponentMethodsAfterLapse(
            methods.filter((m) => m !== 'اعتراض الغير' && m !== 'إعادة محاكمة'),
            ctx,
        );
    }

    if (isAppealStageName(stage) || isCassationStageName(stage)) {
        return filterOpponentMethodsAfterLapse(methods, ctx);
    }

    return filterOpponentMethodsAfterLapse(
        [...methods, 'اعتراض الغير', 'إعادة محاكمة'],
        ctx,
    );
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
        pleadingDoorReopened?: boolean;
        awaitingOpponentAppeal?: boolean;
        stageName?: string | null;
        status?: string | null;
        cassationWindowLapsed?: boolean;
    } | null,
    fileStatus?: string | null,
    representedParty?: string | null,
): boolean {
    if (!stage?.isPleadingsClosed) return false;
    if (stage.pleadingDoorReopened) return false;
    if (stage.stageName && isAppealStageName(stage.stageName)) return false;
    if (stage.status === 'locked' || stage.status === 'completed') return false;
    if (stage.cassationWindowLapsed) return false;
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
    clientStageOutcome?: string | null;
    partyJudgmentDispositions?: unknown;
} | null;

/**
 * تذييل انتظار طعن الخصم — بعد كسب الموكل (مدعياً كان أو مدعى عليه).
 * لا يعتمد على «صفة المدعي» وحدها: الخاسر فقط يطعن.
 * الجزئي يُعالَج في لوحة مزدوجة (طعن الموكل + طعن الخصم) — لا يُحصر هنا.
 */
export function shouldShowOpponentAppealWatchPostJudgmentFooter(
    _representedParty: string | null | undefined,
    finalDecision: string | null | undefined,
    stage?: AppealFooterStageHint,
): boolean {
    if (
        isPartialBothInterestStage({
            finalDecision: finalDecision ?? stage?.finalDecision,
            clientStageOutcome: stage?.clientStageOutcome,
            partyJudgmentDispositions: stage?.partyJudgmentDispositions,
        })
    ) {
        return false;
    }
    if (stage?.awaitingOpponentAppeal === true) return true;
    return isClientWonAwaitingOpponentFinalDecision(finalDecision);
}

/**
 * حكم جزئي / يحق للطرفين — مصلحة طعن للموكل والخصم معاً.
 */
export function isPartialBothInterestFinalDecision(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '').trim();
    if (!fd) return false;
    return fd.includes('جزئياً') || fd.includes('يحق للطرفين');
}

/**
 * متى تُحكم النتيجة الجزئية (مساران في التذييل)؟
 * 1) نص المنطوق فيه جزئياً / يحق للطرفين
 * 2) clientStageOutcome = PARTIAL
 * 3) تعدد خصوم: إلزام بحق بعضهم ورد بحق آخرين (حتى لو نُصّ القرار خطأً «لصالح الموكل»)
 */
export function isPartialBothInterestStage(stage?: {
    finalDecision?: string | null;
    clientStageOutcome?: string | null;
    partyJudgmentDispositions?: unknown;
} | null): boolean {
    if (!stage) return false;
    if (String(stage.clientStageOutcome ?? '').trim() === 'PARTIAL') return true;
    if (isPartialBothInterestFinalDecision(stage.finalDecision)) return true;
    const rows = normalizePartyJudgmentDispositions(stage.partyJudgmentDispositions);
    if (rows.length < 2) return false;
    return hasAnyReleasedDisposition(rows) && !areAllDispositionsReleased(rows);
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
    if (
        isPartialBothInterestStage({
            finalDecision: finalDecision ?? stage?.finalDecision,
            clientStageOutcome: stage?.clientStageOutcome,
            partyJudgmentDispositions: stage?.partyJudgmentDispositions,
        })
    ) {
        return true;
    }
    if (stage?.awaitingOpponentAppeal === true) return false;
    if (isClientWonAwaitingOpponentFinalDecision(finalDecision)) return false;
    if (isClientSelfAppealFinalDecision(finalDecision)) return true;
    /*
     * مسار احتياطي: إجابة الدعوى + وكيل المدعى عليه = المدعى عليه خسر موضوعاً.
     * لا يُستخدم إن وُجد «لصالح الموكل» (موكل مدعى عليه كسب بالرد الكلي).
     */
    const fd = String(finalDecision ?? '').trim();
    if (fd.includes('لصالح الموكل')) return false;
    return isDefendantRepresentedParty(representedParty) && fd.includes('إجابة الدعوى');
}
