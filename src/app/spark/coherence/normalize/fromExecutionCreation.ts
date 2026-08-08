import type { ExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
} from '@/app/spark/coherence/types';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { analyzeExecutionCreationAlimony } from '@/app/spark/procedural/alimonyCreationSparkBridge';
import { analyzeExecutionCreationIntelligence } from '@/app/spark/procedural/executionCreationIntelligence';

function pushDate(
    dates: SparkCoherenceContextBundle['dates'],
    id: string,
    label: string,
    ymd: string,
    role: SparkCoherenceContextBundle['dates'][0]['role'],
    source: string,
) {
    const v = String(ymd ?? '').trim().slice(0, 10);
    if (!v) return;
    dates.push({ id, label, ymd: v, role, source });
}

/** يحوّل مسودة إنشاء التنفيذ إلى حزمة تماسك عامة */
export function normalizeCoherenceFromExecutionCreation(
    ctx: ExecutionCreationSparkContext,
): SparkCoherenceContextBundle {
    const dates: SparkCoherenceContextBundle['dates'] = [];
    const facts: SparkCoherenceContextBundle['facts'] = [];
    const claims: SparkCoherenceContextBundle['claims'] = [];
    const texts: SparkCoherenceContextBundle['texts'] = [];
    const actions: SparkCoherenceContextBundle['actions'] = [];

    pushDate(dates, 'meta:today', 'اليوم', getLocalTodayYmd(), 'other', 'system');
    pushDate(dates, 'judgment', 'تاريخ الحكم', ctx.judgmentDate, 'judgment', 'instrument');
    pushDate(dates, 'submission', 'تقديم الإضبارة', ctx.submissionDate, 'submission', 'form');

    facts.push(
        { id: 'doc:blocked', key: 'document_blocked', value: ctx.isDocumentBlocked, source: 'instrument' },
        { id: 'doc:type', key: 'doc_type', value: ctx.docType, source: 'instrument' },
        { id: 'class', key: 'classification', value: ctx.classification, source: 'instrument' },
    );

    const effectiveTypes =
        ctx.activeClaimTypes.length > 0
            ? ctx.activeClaimTypes
            : ctx.claimType
              ? [ctx.claimType]
              : [];

    for (const ct of effectiveTypes) {
        const raw = ctx.claimAmountsByType[ct] ?? ctx.totalAmount;
        const amount = parseFloat(String(raw ?? '').replace(/,/g, '')) || undefined;
        claims.push({ id: `claim:${ct}`, type: ct, amount, source: 'claim_amounts' });
    }

    if (ctx.alimony) {
        pushDate(dates, 'filing', 'إقامة الدعوى', ctx.alimony.lawsuitDate, 'filing', 'alimony');
        pushDate(dates, 'execution', 'احتساب التنفيذ', ctx.alimony.executionDate, 'execution', 'alimony');
        if (ctx.alimony.pastStartDate) {
            pushDate(dates, 'past-start', 'استحقاق نفقة ماضية', ctx.alimony.pastStartDate, 'other', 'alimony');
        }
        facts.push(
            { id: 'alimony:beneficiary', key: 'alimony_beneficiary', value: ctx.alimony.beneficiary, source: 'alimony' },
            { id: 'alimony:wife', key: 'wife_monthly', value: ctx.alimony.wifeMonthly, source: 'alimony' },
            { id: 'alimony:children', key: 'children_monthly', value: ctx.alimony.childrenMonthly, source: 'alimony' },
        );
        if (ctx.alimony.calculated?.totalAccumulated) {
            facts.push({
                id: 'calc:total',
                key: 'calculated_total',
                value: ctx.alimony.calculated.totalAccumulated,
                source: 'calculator',
            });
        }
    }

    if (ctx.isDocumentBlocked) {
        actions.push({
            id: 'draft:proceed',
            type: 'draft_edit',
            label: 'editing_blocked_instrument',
            source: 'form',
        });
    }

    return {
        surface: 'execution',
        dossierKey: ctx.dossierKey,
        jurisdiction: 'unknown',
        facts,
        events: [],
        claims,
        dates,
        texts,
        actions,
        registeredDates: dates.map((d) => d.ymd),
        meta: {
            caseNo: ctx.fileNumber,
            court: ctx.directorate,
            status: ctx.isDocumentBlocked ? 'blocked' : 'draft',
        },
    };
}

export function runExecutionCreationDomainFindings(
    ctx: ExecutionCreationSparkContext,
): SparkCoherenceFinding[] {
    const out: SparkCoherenceFinding[] = [];

    for (const f of analyzeExecutionCreationIntelligence(ctx)) {
        out.push({
            id: f.id,
            category: 'cross_field',
            severity: f.severity,
            observation: f.observation,
            evidence: f.evidence,
            actionId: f.actionId,
            actionLabel: f.actionLabel,
        });
    }

    const alimony = analyzeExecutionCreationAlimony(ctx);
    if (alimony) {
        const recFixExecution = alimony.recommendations.find(
            (r) => r.id === 'rec:fix-execution-date' || r.id === 'rec:set-execution-today',
        );
        for (const f of alimony.findings) {
            const isTimelineCritical =
                f.severity === 'critical' && (f.category === 'timeline' || f.id.includes('timeline'));
            out.push({
                id: f.id,
                category: f.category === 'legal' ? 'legal' : f.category,
                severity: f.severity,
                observation: f.observation,
                evidence: f.evidence,
                actionId: isTimelineCritical && recFixExecution?.apply
                    ? 'apply_alimony_execution_today'
                    : f.category === 'cross_field' && f.id === 'cross:claim-amount-mismatch'
                      ? 'focus_claim_amount'
                      : f.severity !== 'info'
                        ? 'focus_alimony'
                        : undefined,
                actionLabel: isTimelineCritical && recFixExecution?.apply
                    ? 'تصحيح تاريخ الاحتساب'
                    : f.category === 'cross_field' && f.id === 'cross:claim-amount-mismatch'
                      ? 'مراجعة المبلغ'
                      : f.severity !== 'info'
                        ? 'مراجعة النفقة'
                        : undefined,
            });
        }
    }

    return out;
}

export function mergeDomainFindingsForExecutionCreation(
    ctx: ExecutionCreationSparkContext,
    baseFindings: SparkCoherenceFinding[],
): SparkCoherenceFinding[] {
    const domain = runExecutionCreationDomainFindings(ctx);
    const seen = new Set(baseFindings.map((f) => f.id));
    const merged = [...baseFindings];
    for (const f of domain) {
        if (seen.has(f.id)) continue;
        merged.push(f);
    }
    return merged;
}
