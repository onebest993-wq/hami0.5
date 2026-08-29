import type {
    JudicialAppellantType,
    JudicialDecision,
    JudicialDecisionDisposition,
    JudicialDecisionKind,
} from '@/app/types/criminal';
import {
    canComplainantLawyerFileCassationAppeal,
    type CassationAppealAudienceContext,
} from './complainantCassationGovernance';
import { decisionAlreadyHasCassationAppeal } from './judicialDecisionCassationHelpers';
import {
    BAIL_RELEASE_TEMPLATE,
    isAssetSeizureTemplate,
    isDecisionCassationAppealable,
    isDetentionDecisionTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';

const DISPOSITIVE_KEYWORDS =
    /إفراج|براءة|إدانة|عقوبة|حكم|توحيد|تفريق|غلق|انقضاء|سقوط|تنازل|صلح|إيقاف تنفيذ|إعدام/i;
const DEFENDANT_FAVOR_KEYWORDS = /إفراج|براءة|إخلاء سبيل|كفالة|إيقاف|تنازل|صلح/i;
const COMPLAINANT_FAVOR_KEYWORDS = /إدانة|إعدام|توقيف|حبس|مصادرة/i;

export function inferJudicialDecisionKind(title: string, summary: string): JudicialDecisionKind {
    const text = `${title} ${summary}`;
    return DISPOSITIVE_KEYWORDS.test(text) ? 'dispositive' : 'preparatory';
}

export function inferJudicialDisposition(
    title: string,
    summary: string,
    beneficiaryPartyIds?: string[],
    appellantHint?: JudicialAppellantType,
): JudicialDecisionDisposition {
    const text = `${title} ${summary}`;
    if (DEFENDANT_FAVOR_KEYWORDS.test(text) && !COMPLAINANT_FAVOR_KEYWORDS.test(text)) {
        return 'favors_defendant';
    }
    if (COMPLAINANT_FAVOR_KEYWORDS.test(text) && !DEFENDANT_FAVOR_KEYWORDS.test(text)) {
        return 'favors_complainant';
    }
    if (appellantHint === 'defendant') return 'favors_defendant';
    if (appellantHint === 'complainant') return 'favors_complainant';
    if (Array.isArray(beneficiaryPartyIds) && beneficiaryPartyIds.length) return 'neutral';
    return 'neutral';
}

/** قرار حاسم لصالح المتهم بنسبة 100% — يحجب طعن المتهم (يبقى طعن المشتكي/الادعاء). */
export function isDecisionFullyFavorableToDefendants(decision: JudicialDecision): boolean {
    if (decision.decisionType !== 'dispositive') return false;
    if (decision.disposition !== 'favors_defendant') return false;
    const text = `${decision.title} ${decision.summary}`;
    return DEFENDANT_FAVOR_KEYWORDS.test(text);
}

export function canFileDefendantCassationAppeal(decision: JudicialDecision): boolean {
    if (isDecisionFullyFavorableToDefendants(decision)) return false;
    return true;
}

function canFileComplainantCassationAppeal(decision: JudicialDecision): boolean {
    return canComplainantLawyerFileCassationAppeal(decision);
}

export function canOpenCassationAppealModal(decision: JudicialDecision): boolean {
    if (!isDecisionCassationAppealable(decision)) {
        return false;
    }
    if (decision.decisionType === 'dispositive') {
        return true;
    }
    return canFileDefendantCassationAppeal(decision) || canFileComplainantCassationAppeal(decision);
}

function resolveDecisionScopedDefendantPartyIds(
    decision: JudicialDecision | null | undefined,
): string[] | null {
    if (!decision) return null;
    const fromDef = (Array.isArray(decision.defendantIds) ? decision.defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (fromDef.length) return fromDef;
    const fromBeneficiary = (Array.isArray(decision.beneficiaryPartyIds) ? decision.beneficiaryPartyIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (fromBeneficiary.length) return fromBeneficiary;
    return null;
}

/** يقيّد قائمة المتهمين في مودال الطعن لمن شملهم القرار فقط — أو الجميع إن كان قراراً عاماً. */
export function filterDefendantPartiesForDecision<
    T extends { id: string; source: 'defendant' | 'complainant' },
>(parties: T[], decision: JudicialDecision | null | undefined): T[] {
    const defendants = parties.filter((p) => p.source === 'defendant');
    const scope = resolveDecisionScopedDefendantPartyIds(decision);
    if (!scope) return defendants;
    const allowed = new Set(scope);
    return defendants.filter((p) => allowed.has(p.id));
}

export function resolveAutoAppellantSideForDecision(
    decision: JudicialDecision | null | undefined,
): JudicialAppellantType | null {
    if (!decision) return null;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isDetentionDecisionTemplate(template)) return 'defendant';
    if (isAssetSeizureTemplate(template)) return 'defendant';
    /**
     * ⚖️ إخلاء السبيل / الكفالة: الطاعن المُتوقَّع هو «المشتكي» (يَطعن في الإفراج).
     *    نَتوقَّعه كاقتراح ذكي — مع إبقاء حقّ المحامي في تَغيير الصفة (مثلاً عند طعن
     *    الادعاء العام أو حين يُريد الدفاع رفع طعن مضاد).
     */
    if (template === BAIL_RELEASE_TEMPLATE) return 'complainant';
    return null;
}

/**
 * 🎯 (Smart Pre-fill) — الطاعن المرشَّح تلقائياً ضمن الجانب المُحدَّد:
 *   • قرار توقيف ⇒ المتهم/المتهمون المشمولون بالقرار (decision.defendantIds).
 *   • قرار إخلاء السبيل / تكفيل ⇒ المشتكي (المشتكون كلهم بشكل تَلقائي).
 *   • سواه ⇒ بدون اقتراح (يَختار المحامي يدوياً).
 */
export function resolveAutoAppellantPartyIds(
    decision: JudicialDecision | null | undefined,
    appellantSide: JudicialAppellantType,
    parties: { id: string; source: 'defendant' | 'complainant' }[],
): string[] {
    if (!decision) return [];
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (appellantSide === 'defendant' && isDetentionDecisionTemplate(template)) {
        const detained = (decision.defendantIds ?? []).filter((id) =>
            parties.some((p) => p.source === 'defendant' && p.id === id),
        );
        return detained;
    }
    if (appellantSide === 'complainant' && template === BAIL_RELEASE_TEMPLATE) {
        return parties.filter((p) => p.source === 'complainant').map((p) => p.id);
    }
    return [];
}

/** زر الطعن التمييزي — يُخفى بعد تسجيل طعن على نفس القرار (لا تكرار). */
export function canShowCassationAppealFileButton(
    decision?: JudicialDecision,
    _context?: CassationAppealAudienceContext,
): boolean {
    if (!decision) return false;
    return !decisionAlreadyHasCassationAppeal(decision);
}
