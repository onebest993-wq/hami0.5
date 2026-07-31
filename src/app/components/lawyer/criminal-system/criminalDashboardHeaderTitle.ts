import type { CaseStage } from '@/app/types/criminal';
import type { CriminalCase } from './criminalStore';
import { sanitizeCaseReferenceField } from './criminalStore';
import {
    formatCriminalStageLabel,
    formatInvestigationDepositLocation,
    formatTrialCourtHeaderPrimary,
    hasJuvenileAccused,
    resolveCourtDisplayName,
} from './criminalStagePresentationCore';
import { JUVENILE_INVESTIGATION_COURT_NAME } from './juvenileInvestigationRules';
import {
    formatInvestigationCourtHeaderTitle,
    GENERIC_INVESTIGATION_COURT_NAMES,
} from './juvenileMixedCaseSplitEngine';

/**
 * عنوان ترويسة الإضبارة (رئيسي/ثانوي/سطر المحكمة) — مستخرَج من CriminalDashboardResolvedRuntime
 * كدالة نقيّة تُستدعى داخل useMemo، دون أي تغيير في القيم المُرجَعة.
 */
export function resolveCriminalDashboardHeaderTitle(
    criminalCase: CriminalCase | null | undefined,
    stage: string,
    caseStage: CaseStage,
    isInvestigationPhase: boolean,
    isTrialCourtStage: boolean,
) {
    if (!criminalCase) {
        return { primary: 'الإضبارة الجنائية' };
    }
    const loc = criminalCase.location;
    const buildCaseReferenceMetaParts = (): { label: string; value: string }[] => {
        const courtNum = String(criminalCase.courtCaseNumber ?? loc.caseNumber ?? '').trim();
        const pp = String(loc.publicProsecutionNumber ?? '').trim();
        const chunks: string[] = [];
        if (courtNum) chunks.push(`دعوى: ${courtNum}`);
        if (pp) chunks.push(`ادعاء: ${pp}`);
        return chunks.length ? [{ label: '', value: chunks.join(' · ') }] : [];
    };

    const caseDefendants = Array.isArray(criminalCase.defendants) ? criminalCase.defendants : [];
    const hasJuvenileDef = hasJuvenileAccused(caseDefendants);
    const stageFallback = formatCriminalStageLabel(stage, hasJuvenileDef) || 'الإضبارة الجنائية';

    if (isTrialCourtStage) {
        const courtName = loc.courtName.trim();
        const invCourtName = loc.investigationCourtName.trim();
        const effectiveCourtName = courtName || invCourtName;
        const invNum = String(criminalCase.investigationCaseNumber ?? '').trim();
        const metaParts = buildCaseReferenceMetaParts();
        const primary = formatTrialCourtHeaderPrimary(caseStage as 'misdemeanor' | 'felony', {
            courtName: effectiveCourtName,
            courtCaseNumber: criminalCase.courtCaseNumber,
            caseNumber: loc.caseNumber,
        });
        return {
            primary,
            ...(metaParts.length ? { metaParts } : {}),
            ...(!metaParts.length && invNum
                ? { secondary: invNum, secondaryLabel: 'رقم التحقيق السابق' }
                : {}),
        };
    }

    if (isInvestigationPhase) {
        const depositLabel = formatInvestigationDepositLocation(loc);
        const invCourtName = loc.investigationCourtName.trim();
        const entityAt =
            loc.investigationPapersAt === 'مكتب تحقيق قضائي'
                ? String(loc.investigationOfficeName ?? '').trim()
                : String(loc.policeStationName ?? '').trim();
        const registerRef = sanitizeCaseReferenceField(loc.baseRegisterNumberAndDate);
        const dossierRef = sanitizeCaseReferenceField(loc.investigationDossierNumber);
        const secondary = dossierRef || registerRef;
        if (hasJuvenileDef) {
            const courtTitle = formatInvestigationCourtHeaderTitle(
                stage,
                invCourtName || JUVENILE_INVESTIGATION_COURT_NAME,
                true,
            );
            const courtBase =
                entityAt && !courtTitle.includes(entityAt) ? `${courtTitle} — ${entityAt}` : courtTitle;
            return {
                primary: courtBase,
                ...(secondary ? { secondary, secondaryLabel: 'رقم الإضبارة / القيد' } : {}),
            };
        }
        return {
            primary: depositLabel || formatInvestigationCourtHeaderTitle(stage, invCourtName, hasJuvenileDef) || stageFallback,
            courtLine:
                depositLabel && invCourtName && !GENERIC_INVESTIGATION_COURT_NAMES.has(invCourtName)
                    ? invCourtName
                    : undefined,
            ...(secondary ? { secondary, secondaryLabel: 'رقم الإضبارة / القيد' } : {}),
        };
    }

    const courtLabel =
        resolveCourtDisplayName(stage, {
            hasJuvenileDefendant: hasJuvenileDef,
            storedCourtName: loc.courtName,
        }) || loc.courtName.trim() || stageFallback;
    return {
        primary: courtLabel,
    };
}
