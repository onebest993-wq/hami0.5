import {
    computeOrdinaryCassationWindow,
    formatAppealResultLabel,
    isCassationResultAffirmationUpheld,
    isCassationResultQuashRemand,
    resolveAppealPeriodStartExclusive,
    resolveCassationCorrectionRemainingDaysForAnchor,
} from './decisionAppealPeriodEngine';
import type { VerdictCard } from './verdictCardsEngine';
import {
    isVerdictCassationUnderReview,
    isVerdictOrdinaryCassationConsumed,
} from './verdictCardsEngine';
import {
    resolveAbsentiaObjectionDeadline,
    startOfLocalDayMs,
} from './absentiaObjectionSchedule';
import { MS_PER_DAY, type StageFinalDecisionBadge } from './stageFinalDecisionTypes';

export function resolveStageFinalDecisionBadge(
    card: VerdictCard,
    referenceDate = new Date(),
): StageFinalDecisionBadge {
    const presence = card.presenceType ?? 'وجاهي';
    const issuedAt = String(card.issuedAt ?? '').trim();

    if (presence === 'غيابي') {
        const pub = String(card.absentiaPublicationDate ?? '').trim();
        if (!pub) {
            return { label: 'حكم غيابي — بانتظار التبليغ بالنشر', tone: 'absentee_gray' };
        }
        if (card.absentiaObjectionFiled) {
            return { label: 'تم تسجيل اعتراض غيابي — قيد المتابعة', tone: 'absentee_objection' };
        }
        const caseType = card.caseCrimeType ?? 'جنحة';
        const deadline =
            String(card.absentiaObjectionDeadline ?? '').trim() ||
            resolveAbsentiaObjectionDeadline(pub, caseType);
        const todayMs = Date.UTC(
            referenceDate.getUTCFullYear(),
            referenceDate.getUTCMonth(),
            referenceDate.getUTCDate(),
        );
        const deadlineMs = startOfLocalDayMs(deadline);
        const remaining = Number.isFinite(deadlineMs)
            ? Math.ceil((deadlineMs - todayMs) / MS_PER_DAY)
            : 0;
        if (remaining > 0) {
            return {
                label: `غيابي — متبقي ${remaining} يوم للاعتراض`,
                tone: 'absentee_objection',
            };
        }
        if (!card.absentiaTreatedAsInPerson) {
            return { label: 'انقضت مهلة الاعتراض — يُعامل بمنزلة الوجاهي', tone: 'countdown_orange' };
        }
    }

    const anchor =
        card.absentiaTreatedAsInPerson && card.absentiaPublicationDate
            ? resolveAppealPeriodStartExclusive(
                  resolveAbsentiaObjectionDeadline(
                      card.absentiaPublicationDate,
                      card.caseCrimeType ?? 'جنحة',
                  ),
              )
            : resolveAppealPeriodStartExclusive(issuedAt);

    const window = computeOrdinaryCassationWindow(anchor || issuedAt, referenceDate);

    if (isVerdictCassationUnderReview(card)) {
        return { label: '🔵 طعن تمييزي - قيد التدقيق', tone: 'cassation_review' };
    }

    if (isVerdictOrdinaryCassationConsumed(card)) {
        const resultRaw = String(card.ordinaryAppeal?.result ?? '').trim();
        if (isCassationResultQuashRemand(resultRaw)) {
            return {
                label: `🔴 ${formatAppealResultLabel(resultRaw) || 'نقض القرار وإعادته'}`,
                tone: 'cassation_result',
            };
        }
        if (isCassationResultAffirmationUpheld(resultRaw)) {
            const recordedAt = String(card.ordinaryAppeal?.resultRecordedAt ?? '').trim();
            const correctionRemaining = recordedAt
                ? resolveCassationCorrectionRemainingDaysForAnchor(recordedAt, referenceDate)
                : 0;
            if (correctionRemaining > 0) {
                return {
                    label: `🟠 تأييد تمييزي — متبقي ${correctionRemaining} يوم للتصحيح`,
                    tone: 'countdown_orange',
                };
            }
            return { label: 'حكم بات نافذ — انقضت مهلة التصحيح', tone: 'final_green' };
        }
        return {
            label: formatAppealResultLabel(resultRaw) || 'نتيجة تمييز مسجّلة',
            tone: 'cassation_result',
        };
    }

    if (card.cassationAppealFiled) {
        return { label: '🔵 طعن تمييزي - قيد التدقيق', tone: 'cassation_review' };
    }
    if (window.isExpired) {
        return { label: 'حكم بات نافذ — لانقضاء مدة الطعن', tone: 'final_green' };
    }
    return {
        label: `متبقي ${window.remainingDays} يوم للتمييز العادي`,
        tone: 'countdown_orange',
    };
}
