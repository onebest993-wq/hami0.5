import {
    diffDaysBetween,
    type AlimonyCalculatorInsights,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/useAlimonyCalculator';
import type {
    AlimonyAnalysisFinding,
    AlimonyAnalysisInference,
} from './alimonyCreationAnalysisTypes';
import { formatYmdAr } from './alimonyCreationAnalysisFormat';

export function collectAlimonyTimelineFindings(input: {
    insights: AlimonyCalculatorInsights;
    judgmentYmd: string;
    lawsuitYmd: string;
    executionYmd: string;
    todayYmd: string;
    docType?: string;
}): { findings: AlimonyAnalysisFinding[]; inferences: AlimonyAnalysisInference[] } {
    const findings: AlimonyAnalysisFinding[] = [];
    const inferences: AlimonyAnalysisInference[] = [];
    const { insights, judgmentYmd, lawsuitYmd, executionYmd, todayYmd } = input;

    if (lawsuitYmd && executionYmd) {
        findings.push({
            id: 'timeline:range',
            category: 'timeline',
            severity: insights.status === 'execution_before_lawsuit' ? 'critical' : 'info',
            observation:
                insights.status === 'execution_before_lawsuit'
                    ? 'تسلسل التواريخ معكوس — لا يمكن بناء متراكم أساسي على هذا الأساس.'
                    : insights.status === 'same_day'
                      ? 'الإقامة والاحتساب في يوم واحد — المتراكم الأساسي صفر افتراضياً.'
                      : `الفترة بين الإقامة والاحتساب: ${insights.daysBetween} يوماً.`,
            evidence: [
                `إقامة الدعوى: ${formatYmdAr(lawsuitYmd)}`,
                `احتساب التنفيذ: ${formatYmdAr(executionYmd)}`,
            ],
        });
    }

    if (judgmentYmd && lawsuitYmd && judgmentYmd !== lawsuitYmd) {
        const gap = diffDaysBetween(
            judgmentYmd < lawsuitYmd ? judgmentYmd : lawsuitYmd,
            judgmentYmd < lawsuitYmd ? lawsuitYmd : judgmentYmd,
        );
        findings.push({
            id: 'cross:judgment-lawsuit',
            category: 'cross_field',
            severity: Math.abs(gap) > 365 ? 'warning' : 'info',
            observation: `تاريخ الحكم (${formatYmdAr(judgmentYmd)}) يختلف عن تاريخ إقامة الدعوى (${formatYmdAr(lawsuitYmd)}).`,
            evidence: [
                `الفارق: ${gap} يوماً`,
                input.docType ? `نوع السند: ${input.docType}` : 'نوع السند غير محدد',
            ],
        });
        inferences.push({
            id: 'inf:judgment-lawsuit',
            conclusion:
                'إقامة الدعوى وتاريخ الحكم يخدمان غرضاً مختلفاً — تأكد أن إقامة الدعوى تعكس بدء التقاضي لا صدور الحكم.',
            because: [
                'المتراكم الأساسي يُحسب من إقامة الدعوى إلى تاريخ الاحتساب.',
                'تاريخ الحكم يثبت الحق القضائي لا بالضرورة يوم رفع الدعوى.',
            ],
        });
    }

    if (executionYmd && executionYmd !== todayYmd) {
        const drift = diffDaysBetween(executionYmd, todayYmd);
        if (drift > 30) {
            findings.push({
                id: 'timeline:execution-stale',
                category: 'timeline',
                severity: 'warning',
                observation: `تاريخ الاحتساب (${formatYmdAr(executionYmd)}) أقدم من اليوم بـ ${drift} يوماً.`,
                evidence: [`اليوم: ${formatYmdAr(todayYmd)}`],
            });
        }
    }

    if (executionYmd && executionYmd > todayYmd) {
        findings.push({
            id: 'timeline:execution-future',
            category: 'timeline',
            severity: 'warning',
            observation: `تاريخ الاحتساب (${formatYmdAr(executionYmd)}) في المستقبل.`,
            evidence: [`اليوم: ${formatYmdAr(todayYmd)}`],
        });
    }

    if (judgmentYmd && executionYmd && executionYmd < judgmentYmd) {
        findings.push({
            id: 'cross:execution-before-judgment',
            category: 'cross_field',
            severity: 'info',
            observation: `تاريخ الاحتساب (${formatYmdAr(executionYmd)}) يسبق تاريخ الحكم (${formatYmdAr(judgmentYmd)}).`,
            evidence: ['الاحتساب عادةً يعكس فتح التنفيذ أو اليوم — ليس ما قبل صدور الحكم.'],
        });
    }

    return { findings, inferences };
}
