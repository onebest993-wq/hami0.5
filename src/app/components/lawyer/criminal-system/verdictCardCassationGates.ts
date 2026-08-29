import {
    hasCassationCorrectionPartyInterest,
    isCassationIssuedByGeneralAssembly,
    resolveCassationCorrectionRemainingDaysForAnchor,
    type CassationCorrectionUserRole,
} from './decisionAppealPeriodEngine';
import {
    isVerdictCassationCorrectionBlockedResult,
    isVerdictCassationCorrectionEligibleResult,
} from './verdictCassationResultEngine';
import type { VerdictCard } from './verdictCardTypes';

export function isVerdictCassationFilingComplete(card: VerdictCard): boolean {
    const oa = card.ordinaryAppeal;
    return Boolean(card.cassationAppealFiled || String(oa?.filedAt ?? '').trim());
}

/** طعن مسجّل وإرسال الإضبارة — بانتظار قرار التمييز (بدون نتيجة). */
export function isVerdictCassationUnderReview(card: VerdictCard): boolean {
    return isVerdictCassationFilingComplete(card) && !String(card.ordinaryAppeal?.result ?? '').trim();
}

/** طلب تصحيح م 266 مُسجَّل على البطاقة. */
export function isVerdictCorrectionAppealFiled(card: VerdictCard): boolean {
    const ca = card.correctionAppeal;
    return Boolean(
        String(ca?.filedAt ?? '').trim() || String(ca?.correctionRequestNumber ?? '').trim(),
    );
}

/** طلب تصحيح مُسجَّل — بانتظار نتيجة التمييز. */
export function isVerdictCorrectionAppealPending(card: VerdictCard): boolean {
    if (!isVerdictCorrectionAppealFiled(card)) return false;
    const status = String(card.correctionAppeal?.status ?? 'pending').trim();
    return status !== 'concluded';
}

export function isVerdictOrdinaryCassationConsumed(card: VerdictCard): boolean {
    const oa = card.ordinaryAppeal;
    const filed = Boolean(
        card.cassationAppealFiled ||
            String(oa?.filedAt ?? '').trim() ||
            String(oa?.cassationDossierNumber ?? '').trim(),
    );
    const result = String(oa?.result ?? '').trim();
    return filed && Boolean(result);
}

export function resolveVerdictCassationCorrectionOutcome(card: VerdictCard): 'conviction' | 'acquittal' | '' {
    if (card.outcome === 'conviction' || card.finalDecisionKind === 'conviction_penalty') {
        return 'conviction';
    }
    if (
        card.outcome === 'acquittal' ||
        card.outcome === 'release' ||
        card.finalDecisionKind === 'acquittal' ||
        card.finalDecisionKind === 'release'
    ) {
        return 'acquittal';
    }
    return '';
}

export function resolveVerdictCassationIssuedBy(card: VerdictCard): string {
    const oa = card.ordinaryAppeal;
    const issuedBy = String(oa?.issuedBy ?? '').trim() || String(oa?.courtLabel ?? '').trim();
    if (isCassationIssuedByGeneralAssembly(issuedBy)) return issuedBy;
    const combined = `${oa?.courtLabel ?? ''} ${oa?.issuedBy ?? ''}`;
    if (/الهيئة\s*العامة/i.test(combined)) return 'الهيئة العامة';
    return issuedBy;
}

/** يُتاح طلب التصحيح (م 266) وفق م 266/267 ومصلحة الطرف ومهلة 30 يوماً. */
export function canShowVerdictCassationCorrection(
    card: VerdictCard,
    context?: {
        userRole?: CassationCorrectionUserRole;
        referenceDate?: Date;
    },
): boolean {
    if (!isVerdictOrdinaryCassationConsumed(card)) return false;

    const correction = card.correctionAppeal;
    const correctionFiled = Boolean(
        String(correction?.correctionRequestNumber ?? '').trim() ||
            String(correction?.filedAt ?? '').trim(),
    );
    if (correctionFiled) return false;

    const resultRaw = String(card.ordinaryAppeal?.result ?? '').trim();
    if (!resultRaw) return false;
    if (isVerdictCassationCorrectionBlockedResult(resultRaw)) return false;
    if (!isVerdictCassationCorrectionEligibleResult(resultRaw)) return false;
    if (isCassationIssuedByGeneralAssembly(resolveVerdictCassationIssuedBy(card))) return false;
    if (
        !hasCassationCorrectionPartyInterest(
            context?.userRole,
            resolveVerdictCassationCorrectionOutcome(card),
        )
    ) {
        return false;
    }

    const recordedAt = String(card.ordinaryAppeal?.resultRecordedAt ?? '').trim();
    if (!recordedAt) return false;
    return resolveCassationCorrectionRemainingDaysForAnchor(recordedAt, context?.referenceDate) > 0;
}
