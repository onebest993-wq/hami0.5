import type { CriminalCaseDraft, CriminalDefendant } from './criminalCaseModel';
import { formatCriminalStageLabel } from './criminalStageUtils';
import { getIdentifiedDefendants } from './criminalUnknownDefendant';
import {
    JUVENILE_INVESTIGATION_COURT_NAME,
    resolveInvestigationDefendantsPartyMix,
    type InvestigationDefendantsPartyMix,
} from './juvenileInvestigationRules';

/** اسم محكمة التحقيق الافتراضي للمسار العام (بالغ / قضية مشتركة). */
export const STANDARD_INVESTIGATION_COURT_NAME = 'محكمة التحقيق';

/** أسماء محكمة قديمة/افتراضية — تُستبدل بعنوان «محكمة + المرحلة» في الترويسة. */
export const GENERIC_INVESTIGATION_COURT_NAMES = new Set([
    STANDARD_INVESTIGATION_COURT_NAME,
    'محكمة التحقيق العادية',
]);

export function formatInvestigationCourtHeaderTitle(
    stage: string,
    investigationCourtName: string,
    hasJuvenileDefendant: boolean,
): string {
    const custom = String(investigationCourtName ?? '').trim();
    const stageLabel = formatCriminalStageLabel(stage, hasJuvenileDefendant) || 'مرحلة التحقيق';
    if (!custom || GENERIC_INVESTIGATION_COURT_NAMES.has(custom)) {
        return `محكمة ${stageLabel}`;
    }
    return custom;
}

/** @deprecated لا تفريق تلقائي عند الحفظ — إضبارة واحدة للجميع. */
export function shouldAutoSplitJuvenileMixedDraft(
    _defendants: CriminalDefendant[],
    _stage: string,
): boolean {
    return false;
}

export function defendantsJuvenileMonitorFingerprint(
    defendants: CriminalDefendant[],
): string {
    return getIdentifiedDefendants(defendants)
        .map((d) => `${d.id}:${d.isJuvenile ? '1' : '0'}`)
        .join('|');
}

/** ضبط حقول محكمة/إيداع التحقيق حسب تركيب المتهمين — null = لا تغيير تلقائي. */
export function resolveInvestigationLocationPatchForPartyMix(
    mix: InvestigationDefendantsPartyMix,
): {
    investigationCourtName?: string;
    investigationPapersAt?: CriminalCaseDraft['location']['investigationPapersAt'];
} | null {
    if (mix === 'juveniles_only') {
        return {
            investigationCourtName: JUVENILE_INVESTIGATION_COURT_NAME,
            investigationPapersAt: 'مكتب تحقيق قضائي',
        };
    }
    if (mix === 'mixed') {
        return {
            investigationCourtName: STANDARD_INVESTIGATION_COURT_NAME,
        };
    }
    return null;
}

/** لشطر يدوي لاحق — لا يُستدعى عند createCaseFromDraft. */
export function buildJuvenileMixedSplitDraftSnapshots(source: CriminalCaseDraft): {
    adultDraft: CriminalCaseDraft;
    juvenileDraft: CriminalCaseDraft;
} {
    const identified = getIdentifiedDefendants(source.defendants);
    const adults = identified.filter((d) => !d.isJuvenile);
    const juveniles = identified.filter((d) => Boolean(d.isJuvenile));
    const sharedRegister = String(source.location.baseRegisterNumberAndDate ?? '').trim();
    const sharedDossier = String(source.location.investigationDossierNumber ?? '').trim();
    const adultStage =
        source.basics.stage === 'تحقيق الأحداث' ? 'مرحلة التحقيق' : source.basics.stage;

    const adultDraft: CriminalCaseDraft = {
        ...source,
        basics: { ...source.basics, stage: adultStage },
        defendants: adults.length ? adults : source.defendants,
        location: {
            ...source.location,
            investigationCourtName: STANDARD_INVESTIGATION_COURT_NAME,
            baseRegisterNumberAndDate: sharedRegister,
            investigationDossierNumber: sharedDossier,
        },
    };

    const juvenileDraft: CriminalCaseDraft = {
        ...source,
        basics: { ...source.basics, stage: 'تحقيق الأحداث' },
        defendants: juveniles,
        unknownDefendant: false,
        location: {
            ...source.location,
            investigationCourtName: JUVENILE_INVESTIGATION_COURT_NAME,
            investigationPapersAt: 'مكتب تحقيق قضائي',
            baseRegisterNumberAndDate: sharedRegister,
            investigationDossierNumber: sharedDossier,
        },
    };

    return { adultDraft, juvenileDraft };
}
