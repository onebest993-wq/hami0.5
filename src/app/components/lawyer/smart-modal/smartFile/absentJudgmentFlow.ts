import { addDaysYmd } from './judgmentDateUtils';
import type { CaseStage } from '../../LawyerShared';
import { isCassationCorrectionStageName } from './extraordinaryAppealGateway';
import { isBeginningPleadingStageName } from './pleadingStageClassification';
import { isPersonalStatusCoreStage } from '@/app/components/lawyer/personal-status/personalStatusAppealStageHelpers';
import { resolveClientMarkedParty } from './clientMarkedParty';
import {
    isAbsentObjectedRole,
    isAbsentObjectorRole,
    extractParentheticalUnderlyingSide,
    hasAbsentObjectionPartyRoles,
    resolveAbsentObjectionOriginalSide,
} from './partyRoleClassification';
import {
    isDefendantRepresentedParty,
} from './representedPartySide';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';

export { isAbsentObjectionStageName } from './absentJudgmentStageNames';

/** مدة الاعتراض على الحكم الغيابي من تاريخ التبليغ (أيام) */
export const ABSENT_JUDGMENT_OBJECTION_DAYS = 10;

export function isAbsentJudgmentForm(
    judgmentForm?: string | null,
    lastJudgmentType?: string | null,
): boolean {
    const raw = String(judgmentForm ?? lastJudgmentType ?? '').trim();
    return raw === 'غيابي' || raw.startsWith('غيابي');
}

/** مرحلة نظر الاعتراض على الحكم الغيابي (بعد فتح إضبارة الاعتراض). */
// isAbsentObjectionStageName — see absentJudgmentStageNames.ts (re-exported above)

function looksLikeAppealStageLabel(stageName: string): boolean {
    return stageName.includes('استئناف') && !stageName.includes('التمييز');
}

function looksLikeCassationStageLabel(stageName: string): boolean {
    return stageName === 'التمييز' || (stageName.includes('تمييز') && !stageName.includes('استئناف'));
}

/** هل سبق فتح مرحلة اعتراض غيابي في الإضبارة؟ — الاعتراض يُسمح مرة واحدة فقط. */
export function hasAbsentObjectionStageInDossier(
    stages?: Array<Pick<CaseStage, 'stageName'> | { stageName?: string | null }> | null,
): boolean {
    if (!Array.isArray(stages)) return false;
    return stages.some((stage) => isAbsentObjectionStageName(stage.stageName));
}

/**
 * اعتراض الغيابي والتبليغ — مرحلة البداءة (بنوعيها) أو مرحلة الاعتراض على الغيابي فقط.
 * لا يُطبَّق في الاستئناف، التمييز، التصحيح، ولا أي مرحلة طعن لاحقة.
 */
export function isAbsentGhayabiWorkflowStage(stageName?: string | null): boolean {
    const s = String(stageName ?? '').trim();
    if (!s) return false;
    if (looksLikeAppealStageLabel(s) || looksLikeCassationStageLabel(s) || isCassationCorrectionStageName(s)) {
        return false;
    }
    if (s.includes('أحوال شخصية') || s === 'الأحوال الشخصية') return true;
    if (isPersonalStatusCoreStage(s)) return true;
    if (isAbsentObjectionStageName(s)) return true;
    return isBeginningPleadingStageName(s);
}

/** حكم غيابي لصالح المدعى عليه — لا يُعرض اعتراض الغيابي. */
function isDefendantFavorableAbsentOutcome(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '').trim();
    if (!fd) return false;
    if (fd.includes('رد الدعوى كلياً') || fd.includes('رد الدعوى كليا')) return true;
    if (fd.includes('ضد الموكل') && fd.includes('المدعى عليه')) return true;
    if (fd.includes('رد الدعوى') && fd.includes('المدعى عليه')) return true;
    return false;
}

/** حكم غيابي لصالح المدعي — يحق للمدعى عليه الاعتراض (وليس عند رد الدعوى للمدعى عليه). */
export function isDefendantAdverseAbsentOutcome(finalDecision?: string | null): boolean {
    const fd = String(finalDecision ?? '').trim();
    if (!fd) return true;
    if (isDefendantFavorableAbsentOutcome(fd)) return false;
    if (fd.includes('غيابي')) return true;
    if (fd.includes('بانتظار')) return true;
    if (fd.includes('لصالح الموكل') || fd.includes('محسومة')) return true;
    if (fd.includes('إجابة الدعوى') || fd.includes('إجابة بالكامل')) return true;
    if (fd.includes('جزئياً')) return true;
    return true;
}

/**
 * هل يُعرض للمدعى عليه خيار «اعتراض غيابي» أو «ترك الحكم غيابياً»؟
 * لا — على مرحلة الاعتراض نفسها، ولا بعد فتح مرحلة اعتراض سابقة، ولا خارج البداءة.
 */
export function canOfferAbsentObjectionToDefendant(params: {
    currentStage?: string | null;
    stages?: Array<Pick<CaseStage, 'stageName'> | { stageName?: string | null }> | null;
    judgmentForm?: string | null;
    lastJudgmentType?: string | null;
    finalDecision?: string | null;
    representedParty?: string | null;
    /** تسجيل طعن الخصم — لا يُقيَّد بجانب الموكل */
    opponentRegistration?: boolean;
}): boolean {
    if (!isAbsentJudgmentForm(params.judgmentForm, params.lastJudgmentType)) return false;
    if (!isAbsentGhayabiWorkflowStage(params.currentStage)) return false;
    if (isAbsentObjectionStageName(params.currentStage)) return false;
    if (hasAbsentObjectionStageInDossier(params.stages)) return false;
    if (params.opponentRegistration) {
        if (isDefendantFavorableAbsentOutcome(params.finalDecision)) return false;
    } else if (!isDefendantAdverseAbsentOutcome(params.finalDecision)) {
        return false;
    }
    if (!params.opponentRegistration && params.representedParty) {
        if (!isDefendantRepresentedParty(params.representedParty)) return false;
    }
    return true;
}

type AbsentObjectionJudgmentOption = { value: string; label: string; hint?: string };

type AbsentObjectionClientRole = 'objector' | 'objected' | null;

/** الجانب الأصلي لموكلك في دعوى الاعتراض على الحكم الغيابي (مدعي/مدعى عليه) */
export function resolveLawyerOriginalSideInAbsentObjection(
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }> | null,
): 'المدعي' | 'المدعى عليه' | null {
    if (!hasAbsentObjectionPartyRoles(parties)) return null;
    const client = resolveClientMarkedParty(parties);
    if (!client) return null;
    return resolveAbsentObjectionOriginalSide(client);
}

/** يحدد موقف موكلك في مرحلة الاعتراض — المعترض أو المعترض عليه */
export function resolveAbsentObjectionClientRole(
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }> | null,
): AbsentObjectionClientRole {
    const client = resolveClientMarkedParty(parties);
    if (!client) return null;
    const role = String(client.role ?? '').trim();
    if (isAbsentObjectorRole(role)) return 'objector';
    if (isAbsentObjectedRole(role)) return 'objected';
    const underlying = extractParentheticalUnderlyingSide(role);
    if (underlying === 'المدعى عليه') return 'objector';
    if (underlying === 'المدعي') return 'objected';
    return null;
}

/** خيارات قرار الحكم في مرحلة الاعتراض — مع سياق موكلك والمدعي الأصلي */
export function absentObjectionJudgmentOptionsForClient(
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }> | null,
): AbsentObjectionJudgmentOption[] {
    const clientRole = resolveAbsentObjectionClientRole(parties);
    const clientTag = clientRole === 'objected' ? 'موكلك: المعترض عليه' : clientRole === 'objector' ? 'موكلك: المعترض' : null;

    return [
        {
            value: 'إجابة الدعوى بالكامل',
            label:
                clientRole === 'objected'
                    ? 'تأييد الحكم الغيابي — موكلك ربح الاعتراض'
                    : clientRole === 'objector'
                      ? 'تأييد الحكم الغيابي — موكلك خسر الاعتراض'
                      : 'تأييد الحكم الغيابي (المعترض عليه ربح الاعتراض)',
            hint: clientTag
                ? `${clientTag} · المدعي الأصلي يربح دعواه`
                : 'المدعي الأصلي يربح دعواه الأصلية',
        },
        {
            value: 'رد الدعوى كلياً',
            label:
                clientRole === 'objector'
                    ? 'تعديل الحكم الغيابي — موكلك ربح الاعتراض'
                    : clientRole === 'objected'
                      ? 'تعديل الحكم الغيابي — موكلك خسر الاعتراض'
                      : 'تعديل الحكم الغيابي بالكامل',
            hint: clientTag
                ? `${clientTag} · المدعي الأصلي يخسر دعواه`
                : 'المدعي الأصلي يخسر دعواه الأصلية',
        },
        {
            value: 'رد الدعوى جزئياً',
            label: 'تعديل جزئي للحكم الغيابي',
            hint: clientTag ? `${clientTag} · تعديل جزئي — يحق للطرفين الطعن` : 'تعديل جزئي — يحق للطرفين الطعن',
        },
    ];
}

/** خيارات قرار الحكم في مرحلة الاعتراض — القيم الداخلية تبقى لتوافق منطق الأحكام. */
export function absentObjectionJudgmentOptions(): AbsentObjectionJudgmentOption[] {
    return absentObjectionJudgmentOptionsForClient();
}

export function computeAbsentObjectionDeadline(notificationDateYmd: string): string {
    return addDaysYmd(notificationDateYmd, ABSENT_JUDGMENT_OBJECTION_DAYS);
}

export function daysRemainingUntil(deadlineYmd: string, today = new Date()): number {
    const deadline = new Date(deadlineYmd);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function shouldShowAbsentJudgmentFooter(
    stage?: {
        stageName?: string | null;
        judgmentForm?: string | null;
        lastJudgmentType?: string | null;
        isPleadingsClosed?: boolean;
        isUnderObjection?: boolean;
        finalDecision?: string | null;
    } | null,
    stages?: Array<Pick<CaseStage, 'stageName'> | { stageName?: string | null }> | null,
    representedParty?: string | null,
): boolean {
    if (!stage?.isPleadingsClosed) return false;
    if (stage.isUnderObjection) return false;
    if (hasAbsentObjectionStageInDossier(stages)) return false;
    if (!isAbsentGhayabiWorkflowStage(stage.stageName)) return false;
    if (!isAbsentJudgmentForm(stage.judgmentForm, stage.lastJudgmentType)) return false;
    if (!isDefendantAdverseAbsentOutcome(stage.finalDecision)) return false;
    const fd = String(stage.finalDecision ?? '');
    if (fd.includes('رد الدعوى كلياً') || fd.includes('ضد الموكل')) return false;
    if (representedParty && !isDefendantRepresentedParty(representedParty)) return false;
    return true;
}

export function isAwaitingAbsentJudgmentNotification(
    stage?: {
        stageName?: string | null;
        judgmentForm?: string | null;
        lastJudgmentType?: string | null;
        isPleadingsClosed?: boolean;
        absentJudgmentNotificationDate?: string | null;
        awaitingAbsentJudgmentNotification?: boolean;
        finalDecision?: string | null;
    } | null,
    stages?: Array<Pick<CaseStage, 'stageName'> | { stageName?: string | null }> | null,
): boolean {
    if (!shouldShowAbsentJudgmentFooter(stage, stages)) return false;
    if (hasAbsentJudgmentNotificationRecorded(stage)) return false;
    return true;
}

export function hasAbsentJudgmentNotificationRecorded(stage?: {
    absentJudgmentNotificationDate?: string | null;
} | null): boolean {
    return Boolean(String(stage?.absentJudgmentNotificationDate ?? '').trim());
}

export function resolveAbsentObjectionDeadline(stage?: {
    absentJudgmentNotificationDate?: string | null;
    appealDeadline?: string | null;
    legalTimers?: { defaultObjectionDeadline?: string };
} | null): string | null {
    if (stage?.legalTimers?.defaultObjectionDeadline) {
        return stage.legalTimers.defaultObjectionDeadline;
    }
    if (stage?.appealDeadline) return stage.appealDeadline;
    if (stage?.absentJudgmentNotificationDate) {
        return computeAbsentObjectionDeadline(stage.absentJudgmentNotificationDate);
    }
    return null;
}
