import {
    INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_REFERRAL_BLOCKED_MESSAGE,
} from '../../investigationPhaseGuidance';
import { isMisdemeanorType } from '../../caseClassificationEngine';
import type { InvestigationReferralTargetStage } from '../../juvenileInvestigationRules';
import type { StageConclusion } from '../../criminalStore';

type DefendantStatus = StageConclusion['defendantStatusAtDecision'];

export const isDefendantStatus = (v: string): v is DefendantStatus =>
    v === 'detained' || v === 'bailed' || v === 'fugitive';

export function investigationDecisionValidationError(input: {
    decisionDate: string;
    referralTarget: InvestigationReferralTargetStage | '';
    misdemeanorType?: string;
    courtName: string;
    scopedDefendantIds: string[];
    scopedAllJuvenile?: boolean;
    scopedIncludesJuvenile?: boolean;
    dossierMixesUnknownAndIdentified?: boolean;
}): string | null {
    if (input.dossierMixesUnknownAndIdentified) {
        return INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_REFERRAL_BLOCKED_MESSAGE;
    }
    if (!input.decisionDate.trim()) return 'أدخل تاريخ صدور القرار.';
    if (!input.scopedDefendantIds.length) {
        return 'حدّد متهماً واحداً على الأقل مشمولاً بالقرار.';
    }
    if (input.scopedIncludesJuvenile && !input.scopedAllJuvenile) {
        return 'لا يمكن إحالة المتهم الحدث مع المتهم البالغ في قرار واحد — استخدم «تفريق الإضبارة» أولاً.';
    }
    if (input.scopedAllJuvenile) {
        if (input.referralTarget !== 'juvenile') return 'مسار إحالة الأحداث غير مُهيّأ.';
        if (!input.courtName.trim()) return 'أدخل اسم محكمة الموضوع.';
        return null;
    }
    if (!input.referralTarget) return 'اختر جهة الإحالة (جنح أو جنايات).';
    if (input.referralTarget === 'misdemeanor' && !isMisdemeanorType(input.misdemeanorType)) {
        return 'اختر نوع الدعوى (موجزة أو غير موجزة).';
    }
    if (!input.courtName.trim()) return 'أدخل اسم محكمة الموضوع.';
    return null;
}

