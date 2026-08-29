import { resolveAppealPeriodStartExclusive } from './decisionAppealPeriodEngine';
import { computeAppealDeadline } from './trialSessionsEngine';
import {
    resolveAbsentiaObjectionDeadline,
    startOfLocalDayMs,
} from './absentiaObjectionSchedule';

/** شكل البطاقة اللازم لانقضاء مهلة الاعتراض الغيابي — بلا استيراد verdictCardsEngine */
type AbsentiaExpiryVerdictCard = {
    presenceType?: 'وجاهي' | 'غيابي';
    absentiaPublicationDate?: string;
    absentiaObjectionFiled?: boolean;
    absentiaObjectionDeadline?: string;
    caseCrimeType?: 'جناية' | 'جنحة' | 'مخالفة';
    absentiaTreatedAsInPerson?: boolean;
    appealDeadline?: string;
};

/** بعد انقضاء مهلة الاعتراض الغيابي دون إجراء — يُفعَّل عداد الـ 30 يوماً. */
export function applyAbsentiaObjectionExpiry<T extends AbsentiaExpiryVerdictCard>(
    card: T,
    referenceDate = new Date(),
): T {
    if (card.presenceType !== 'غيابي') return card;
    const pub = String(card.absentiaPublicationDate ?? '').trim();
    if (!pub || card.absentiaObjectionFiled) return card;
    const deadline =
        String(card.absentiaObjectionDeadline ?? '').trim() ||
        resolveAbsentiaObjectionDeadline(pub, card.caseCrimeType ?? 'جنحة');
    const todayMs = Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate(),
    );
    const deadlineMs = startOfLocalDayMs(deadline);
    if (!Number.isFinite(deadlineMs) || todayMs <= deadlineMs) return card;
    const anchor = resolveAppealPeriodStartExclusive(deadline);
    return {
        ...card,
        absentiaTreatedAsInPerson: true,
        appealDeadline: computeAppealDeadline(anchor || deadline),
    };
}
