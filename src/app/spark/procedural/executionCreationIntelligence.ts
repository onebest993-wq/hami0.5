import type { ExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import type { SparkNudge } from '@/app/spark/types';
import { EXECUTION_CREATION_DOSSIER_KEY } from '@/app/spark/context/executionCreationSparkContext';
import { isPersonalStatusClassification } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import type { ExecutionCreationSparkActionId } from '@/app/components/lawyer/ExecutionCreationView/hooks/useExecutionCreationSparkFocus';

export type ExecutionCreationIntelFinding = {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    observation: string;
    evidence: string[];
    actionId?: ExecutionCreationSparkActionId;
    actionLabel?: string;
};

const ALIMONY_CLAIMS = new Set(['نفقة', 'حجة نفقة اتفاقية', 'نفقة ماضية']);

function effectiveTypes(ctx: ExecutionCreationSparkContext): string[] {
    return ctx.activeClaimTypes.length > 0
        ? ctx.activeClaimTypes
        : ctx.claimType
          ? [ctx.claimType]
          : [];
}

function hasAlimonyClaim(ctx: ExecutionCreationSparkContext): boolean {
    return effectiveTypes(ctx).some((t) => ALIMONY_CLAIMS.has(t));
}

/** تحليل سياقي لإنشاء التنفيذ — خارج النفقة */
export function analyzeExecutionCreationIntelligence(
    ctx: ExecutionCreationSparkContext,
): ExecutionCreationIntelFinding[] {
    const findings: ExecutionCreationIntelFinding[] = [];
    const types = effectiveTypes(ctx);

    if (ctx.docType === 'قرارات وأحكام المحاكم') {
        if (!String(ctx.judgmentDate ?? '').trim()) {
            findings.push({
                id: 'instrument:judgment-date-missing',
                severity: 'warning',
                observation: 'سند من نوع حكم قضائي دون تاريخ حكم — يصعب ربط المتراكم بصدور الحكم.',
                evidence: [`نوع السند: ${ctx.docType}`],
                actionId: 'focus_judgment',
                actionLabel: 'إدخال تاريخ الحكم',
            });
        }
        if (!String(ctx.docNumber ?? '').trim()) {
            findings.push({
                id: 'instrument:judgment-number-missing',
                severity: 'info',
                observation: 'رقم الحكم غير مُدخل — قد يُطلب عند التبليغ أو الربط الأرشيفي.',
                evidence: [],
                actionId: 'focus_judgment',
                actionLabel: 'إكمال رقم الحكم',
            });
        }
    }

    if (hasAlimonyClaim(ctx) && !isPersonalStatusClassification(ctx.classification)) {
        findings.push({
            id: 'claim:alimony-classification-mismatch',
            severity: 'warning',
            observation: `مطالبة نفقة مع تصنيف «${ctx.classification || 'غير محدد'}» — النفقة عادةً ضمن أحوال شخصية.`,
            evidence: types.filter((t) => ALIMONY_CLAIMS.has(t)),
        });
    }

    if (ctx.isDocumentBlocked) {
        const hasAmount =
            parseFloat(String(ctx.totalAmount ?? '').replace(/,/g, '')) > 0 ||
            Object.values(ctx.claimAmountsByType).some(
                (v) => parseFloat(String(v).replace(/,/g, '')) > 0,
            );
        if (hasAmount) {
            findings.push({
                id: 'blocked:amounts-while-blocked',
                severity: 'warning',
                observation:
                    'السند فقد قوته التنفيذية — إدخال مبالغ لن يفتح التنفيذ المباشر؛ راجع مسار إثبات الدين.',
                evidence: [ctx.docType || 'سند محجوب'],
            });
        }
    }

    if (
        types.includes('نفقة ماضية') &&
        ctx.alimony &&
        !String(ctx.alimony.pastStartDate ?? '').trim()
    ) {
        findings.push({
            id: 'claim:past-alimony-start',
            severity: 'warning',
            observation: 'مطالبة نفقة ماضية دون تاريخ استحقاق — لا يُحسب متراكم ماضٍ.',
            evidence: ['نفقة ماضية'],
            actionId: 'focus_past_alimony',
            actionLabel: 'إكمال تاريخ الاستحقاق',
        });
    }

    const judgmentYmd = String(ctx.judgmentDate ?? ctx.alimony?.judgmentDate ?? '').trim();
    const lawsuitYmd = String(ctx.alimony?.lawsuitDate ?? '').trim();
    if (judgmentYmd && lawsuitYmd && judgmentYmd < lawsuitYmd) {
        findings.push({
            id: 'cross:judgment-before-lawsuit',
            severity: 'info',
            observation:
                'تاريخ الحكم يسبق إقامة الدعوى في النموذج — راجع الوقائع (قد يكون خطأ إدخال).',
            evidence: [`حكم: ${judgmentYmd}`, `إقامة: ${lawsuitYmd}`],
            actionId: 'focus_alimony',
            actionLabel: 'مراجعة التواريخ',
        });
    }

    return findings;
}

export function buildExecutionCreationIntelNudges(
    ctx: ExecutionCreationSparkContext,
): SparkNudge[] {
    const findings = analyzeExecutionCreationIntelligence(ctx);
    const dossierKey = EXECUTION_CREATION_DOSSIER_KEY;

    return findings
        .filter((f) => f.severity !== 'info' || f.id === 'instrument:judgment-number-missing')
        .map((f) => ({
            id: `${dossierKey}:intel:${f.id}`,
            kind: 'execution.creation_context_insight' as const,
            surface: 'execution' as const,
            priority: f.severity === 'critical' ? 10 : f.severity === 'warning' ? 7 : 4,
            message: f.observation,
            presence: { present: f.evidence, missing: [] },
            source: 'executionCreationIntelligence',
            dossierKey,
            action:
                f.actionId && f.actionLabel
                    ? { label: f.actionLabel, actionId: f.actionId }
                    : undefined,
        }))
        .sort((a, b) => b.priority - a.priority);
}
