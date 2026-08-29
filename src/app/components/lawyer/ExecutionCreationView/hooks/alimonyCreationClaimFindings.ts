import { isPastAlimonyOnlyClaim } from '@/app/utils/alimonyFinancialBreakdown';
import type {
    AlimonyAnalysisFinding,
    AlimonyAnalysisInference,
} from './alimonyCreationAnalysisTypes';
import { extractYmd, formatYmdAr } from './alimonyCreationAnalysisFormat';

export function collectAlimonyClaimStructureFindings(input: {
    claimType?: string;
    effectiveTypes: string[];
    includesPastCalc?: boolean;
    alimonyPastStartDate?: string;
    lawsuitYmd: string;
    executionYmd: string;
}): { findings: AlimonyAnalysisFinding[]; inferences: AlimonyAnalysisInference[] } {
    const findings: AlimonyAnalysisFinding[] = [];
    const inferences: AlimonyAnalysisInference[] = [];
    const { effectiveTypes, lawsuitYmd, executionYmd } = input;

    const pastOnly = isPastAlimonyOnlyClaim(input.claimType, effectiveTypes);
    const hasOngoing = effectiveTypes.some((t) => t === 'نفقة' || t === 'حجة نفقة اتفاقية');
    const hasPast = effectiveTypes.includes('نفقة ماضية') || input.includesPastCalc;

    if (hasPast && hasOngoing) {
        inferences.push({
            id: 'inf:dual-track',
            conclusion:
                'الإضبارة تجمع مسارين: نفقة متراكمة مستمرة (إقامة → احتساب) ونفقة ماضية (استحقاق → إقامة) — كل مسار له منطق زمني مستقل.',
            because: [
                'المتراكم الأساسي لا يشمل النفقة الماضية.',
                'النفقة الماضية تُسجّل في مطالبة منفصلة أو قسم «نفقة ماضية».',
            ],
        });
    }

    if (hasPast && !extractYmd(input.alimonyPastStartDate)) {
        findings.push({
            id: 'claim:past-start-missing',
            category: 'claim_structure',
            severity: 'warning',
            observation: 'مطالبة النفقة الماضية مفعّلة دون تاريخ استحقاق.',
            evidence: effectiveTypes.length ? effectiveTypes : [input.claimType ?? ''],
        });
    }

    if (pastOnly && lawsuitYmd && executionYmd && lawsuitYmd !== executionYmd) {
        findings.push({
            id: 'claim:past-only-execution-date',
            category: 'claim_structure',
            severity: 'info',
            observation:
                'في مطالبة «نفقة ماضية» فقط، تاريخ احتساب التنفيذ لا يدخل صيغة النفقة الماضية — يبقى ذا صلة بالإجراء لا بالمبلغ الماضي.',
            evidence: [`إقامة الدعوى: ${formatYmdAr(lawsuitYmd)}`],
        });
    }

    const pastStartYmd = extractYmd(input.alimonyPastStartDate);
    if (hasPast && pastStartYmd && lawsuitYmd && pastStartYmd >= lawsuitYmd) {
        findings.push({
            id: 'claim:past-start-after-lawsuit',
            category: 'claim_structure',
            severity: 'warning',
            observation: 'تاريخ استحقاق النفقة الماضية لا يجب أن يكون بعد إقامة الدعوى.',
            evidence: [
                `استحقاق: ${formatYmdAr(pastStartYmd)}`,
                `إقامة: ${formatYmdAr(lawsuitYmd)}`,
            ],
        });
    }

    return { findings, inferences };
}
