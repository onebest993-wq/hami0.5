import type { UrgentSparkContext } from '@/app/spark/context/urgentSparkContext';
import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
} from '@/app/spark/coherence/types';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

function extractYmd(value: unknown): string {
    const v = String(value ?? '').trim();
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}

function pushDate(
    dates: SparkCoherenceContextBundle['dates'],
    id: string,
    label: string,
    ymd: string,
    role: SparkCoherenceContextBundle['dates'][0]['role'],
    source: string,
) {
    const v = extractYmd(ymd);
    if (!v) return;
    dates.push({ id, label, ymd: v, role, source });
}

export function normalizeCoherenceFromUrgent(ctx: UrgentSparkContext): SparkCoherenceContextBundle {
    const dates: SparkCoherenceContextBundle['dates'] = [];
    const facts: SparkCoherenceContextBundle['facts'] = [];
    const actions: SparkCoherenceContextBundle['actions'] = [];

    pushDate(dates, 'meta:today', 'اليوم', getLocalTodayYmd(), 'other', 'system');
    pushDate(dates, 'judge', 'قرار القاضي', ctx.judgeDecision.decisionDate, 'judgment', 'lifecycle');
    pushDate(dates, 'execution', 'تنفيذ الأمر', ctx.executionData.executionDate, 'execution', 'lifecycle');
    pushDate(
        dates,
        'notification',
        'تبليغ التنفيذ',
        ctx.executionData.notificationDate,
        'notification',
        'lifecycle',
    );
    pushDate(dates, 'grievance', 'تظلم', ctx.grievanceData.filingDate, 'filing', 'lifecycle');
    pushDate(dates, 'cassation', 'تمييز', ctx.cassationData.filingDate, 'filing', 'lifecycle');

    facts.push(
        { id: 'final', key: 'is_finalized', value: ctx.isFinalized, source: 'status' },
        { id: 'status', key: 'file_status', value: ctx.fileStatus, source: 'status' },
        { id: 'step', key: 'active_step', value: ctx.activeLifecycleStep ?? '', source: 'lifecycle' },
        {
            id: 'griev-notif',
            key: 'grievance_notification_confirmed',
            value: ctx.grievanceDecisionNotificationConfirmed,
            source: 'lifecycle',
        },
        { id: 'judge', key: 'judge_decision', value: String(ctx.judgeDecision.decision ?? ''), source: 'lifecycle' },
        { id: 'griev-out', key: 'grievance_outcome', value: String(ctx.grievanceData.outcome ?? ''), source: 'lifecycle' },
        { id: 'cass-out', key: 'cassation_outcome', value: String(ctx.cassationData.outcome ?? ''), source: 'lifecycle' },
    );

    if (ctx.activeLifecycleStep) {
        actions.push({
            id: `step:${ctx.activeLifecycleStep}`,
            type: 'lifecycle_step',
            label: ctx.activeLifecycleStep,
            source: 'lifecycle',
        });
    }

    return {
        surface: 'lawsuit',
        dossierKey: ctx.dossierKey,
        jurisdiction: 'unknown',
        facts,
        events: [],
        claims: [],
        dates,
        texts: [],
        actions,
        registeredDates: dates.map((d) => d.ymd),
        meta: { caseNo: ctx.caseLabel, status: ctx.fileStatus },
    };
}

export function runUrgentDomainFindings(ctx: UrgentSparkContext): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];
    const judge = extractYmd(ctx.judgeDecision.decisionDate);
    const execution = extractYmd(ctx.executionData.executionDate);
    const notification = extractYmd(ctx.executionData.notificationDate);
    const grievance = extractYmd(ctx.grievanceData.filingDate);
    const cassation = extractYmd(ctx.cassationData.filingDate);

    if (judge && execution && execution < judge) {
        findings.push({
            id: 'urgent:execution-before-judge',
            category: 'timeline',
            severity: 'warning',
            observation: 'تاريخ التنفيذ يسبق تاريخ قرار القاضي في السجل.',
            evidence: [`قرار: ${judge}`, `تنفيذ: ${execution}`],
            actionId: 'review_execution',
            actionLabel: 'مراجعة التنفيذ',
        });
    }

    if (execution && notification && notification < execution) {
        findings.push({
            id: 'urgent:notification-before-execution',
            category: 'timeline',
            severity: 'warning',
            observation: 'تبليغ التنفيذ مسجّل قبل تاريخ المفاتحة.',
            evidence: [`مفاتحة: ${execution}`, `تبليغ: ${notification}`],
            actionId: 'review_execution',
            actionLabel: 'مراجعة التنفيذ',
        });
    }

    if (judge && grievance && grievance < judge) {
        findings.push({
            id: 'urgent:grievance-before-judge',
            category: 'timeline',
            severity: 'warning',
            observation: 'تاريخ التظلم يسبق قرار القاضي — تحقق من التسلسل.',
            evidence: [`قرار: ${judge}`, `تظلم: ${grievance}`],
        });
    }

    if (grievance && cassation && cassation < grievance) {
        findings.push({
            id: 'urgent:cassation-before-grievance',
            category: 'timeline',
            severity: 'info',
            observation: 'تاريخ التمييز يسبق تاريخ التظلم في السجل.',
            evidence: [`تظلم: ${grievance}`, `تمييز: ${cassation}`],
            actionId: 'review_cassation',
            actionLabel: 'مراجعة التمييز',
        });
    }

    if (
        ctx.activeLifecycleStep === 'grievance' &&
        judge &&
        !ctx.grievanceDecisionNotificationConfirmed &&
        !ctx.grievanceData.outcome
    ) {
        findings.push({
            id: 'urgent:grievance-open-no-outcome',
            category: 'action',
            severity: 'info',
            observation: 'مرحلة التظلم مفتوحة بلا نتيجة مسجّلة رغم وجود قرار قاضٍ.',
            evidence: [`قرار: ${judge}`],
            actionId: 'confirm_grievance_notification',
            actionLabel: 'تأكيد التبليغ',
        });
    }

    return findings;
}

export function mergeDomainFindingsForUrgent(
    ctx: UrgentSparkContext,
    baseFindings: SparkCoherenceFinding[],
): SparkCoherenceFinding[] {
    const domain = runUrgentDomainFindings(ctx);
    const seen = new Set(baseFindings.map((f) => f.id));
    const merged = [...baseFindings];
    for (const f of domain) {
        if (seen.has(f.id)) continue;
        merged.push(f);
    }
    return merged;
}
