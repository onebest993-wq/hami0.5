import type { ExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
    SparkCoherenceText,
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

/** يحوّل إضبارة تنفيذ مفتوحة إلى حزمة تماسك عامة */
export function normalizeCoherenceFromExecutionOpen(
    ctx: ExecutionSparkContext,
): SparkCoherenceContextBundle {
    const file = ctx.executionData;
    const dates: SparkCoherenceContextBundle['dates'] = [];
    const facts: SparkCoherenceContextBundle['facts'] = [];
    const events: SparkCoherenceContextBundle['events'] = [];
    const claims: SparkCoherenceContextBundle['claims'] = [];
    const texts: SparkCoherenceText[] = [];
    const actions: SparkCoherenceContextBundle['actions'] = [];

    pushDate(dates, 'meta:today', 'اليوم', getLocalTodayYmd(), 'other', 'system');
    pushDate(dates, 'submission', 'تقديم الإضبارة', String(file.submissionDate ?? ''), 'submission', 'file');
    pushDate(dates, 'judgment', 'تاريخ الحكم', String(file.judgmentDate ?? ''), 'judgment', 'file');
    pushDate(dates, 'notification', 'تبليغ المدين', String(file.notificationDate ?? ''), 'notification', 'file');

    const alimonyDates = file.alimony as { lawsuitDate?: string; executionDate?: string } | undefined;
    if (alimonyDates?.lawsuitDate) {
        pushDate(dates, 'filing', 'إقامة الدعوى', alimonyDates.lawsuitDate, 'filing', 'alimony');
    }
    if (alimonyDates?.executionDate) {
        pushDate(dates, 'execution', 'احتساب التنفيذ', alimonyDates.executionDate, 'execution', 'alimony');
    }

    facts.push(
        { id: 'paused', key: 'execution_paused', value: ctx.executionPaused, source: 'lifecycle' },
        { id: 'lifecycle', key: 'lifecycle_status', value: ctx.lifecycleStatus, source: 'lifecycle' },
        { id: 'global', key: 'global_status', value: ctx.signals.globalStatus, source: 'signals' },
        { id: 'remaining', key: 'remaining_debt', value: ctx.signals.remainingDebt, source: 'signals' },
        {
            id: 'notice',
            key: 'primary_notice_state',
            value: ctx.signals.primaryNoticeState ?? '',
            source: 'signals',
        },
        {
            id: 'coercive-ready',
            key: 'coercive_ready_unresolved',
            value: ctx.signals.coerciveReadyUnresolved,
            source: 'signals',
        },
    );

    if (ctx.financialSignals?.effectiveRemainingIqd != null) {
        facts.push({
            id: 'fin:remaining',
            key: 'calculated_total',
            value: ctx.financialSignals.effectiveRemainingIqd,
            source: 'financial_hub',
        });
    }

    for (const ev of file.timelineEvents ?? []) {
        if ((ev as { trashedAt?: string }).trashedAt) continue;
        const date = extractYmd((ev as { date?: string }).date);
        const deadline = extractYmd((ev as { deadlineDate?: string }).deadlineDate);
        events.push({
            id: String((ev as { id?: string }).id ?? `tl:${events.length}`),
            date: date || undefined,
            deadline: deadline || undefined,
            title: String((ev as { title?: string }).title ?? (ev as { type?: string }).type ?? ''),
            notes: String((ev as { description?: string }).description ?? ''),
            source: 'timeline',
        });
        if (date) {
            pushDate(dates, `tl:${ev.id}`, 'حدث زمني', date, 'other', 'timeline');
        }
        if (deadline) {
            pushDate(dates, `tl-deadline:${ev.id}`, 'مهلة حدث', deadline, 'deadline', 'timeline');
        }
    }

    for (const note of file.caseNotesLog ?? []) {
        const body = String(note.body ?? '').trim();
        if (body.length < 8) continue;
        texts.push({
            id: String(note.id ?? `note:${texts.length}`),
            role: String(note.title ?? 'ملاحظة إضبارة'),
            content: body.slice(0, 2000),
            source: 'case_notes',
        });
    }

    const claimTypes = ctx.signals.claimTypes ?? [];
    const total = parseFloat(String(file.totalAmount ?? '').replace(/,/g, '')) || ctx.signals.remainingDebt;
    if (claimTypes.length) {
        for (const ct of claimTypes) {
            claims.push({ id: `claim:${ct}`, type: ct, amount: total > 0 ? total : undefined, source: 'file' });
        }
    } else if (total > 0) {
        claims.push({ id: 'claim:total', type: String(file.claimType ?? 'مطالبة'), amount: total, source: 'file' });
    }

    const coercive =
        ctx.runtimeOverlay?.activeCoerciveActions ??
        (Array.isArray(file.activeCoerciveActions) ? file.activeCoerciveActions : []);
    for (const c of coercive) {
        actions.push({ id: `coercive:${c}`, type: 'coercive_active', label: String(c), source: 'coercive' });
    }
    if (ctx.pendingExecutorDecisionCount > 0) {
        actions.push({
            id: 'executor:pending',
            type: 'executor_decision_pending',
            label: `${ctx.pendingExecutorDecisionCount} قرار منفّذ`,
            source: 'decisions',
        });
    }

    return {
        surface: 'execution',
        dossierKey: ctx.dossierKey,
        jurisdiction: 'unknown',
        facts,
        events,
        claims,
        dates,
        texts,
        actions,
        registeredDates: dates.map((d) => d.ymd),
        meta: {
            caseNo: String(file.fileNumber ?? '').trim(),
            court: String(file.directorate ?? '').trim(),
            status: ctx.lifecycleStatus,
        },
    };
}

export function runExecutionOpenDomainFindings(ctx: ExecutionSparkContext): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];
    const s = ctx.signals;
    const file = ctx.executionData;

    if (s.unnotifiedDebtorLabels.length > 0 && (s.coerciveReadyUnresolved || actionsActive(ctx))) {
        findings.push({
            id: 'open:coercive-before-notice',
            category: 'action',
            severity: 'warning',
            observation: 'إجراء جبري أو جاهزية جبريّة رغم مدين غير مُبلَّغ.',
            evidence: s.unnotifiedDebtorLabels.slice(0, 3),
            actionId: 'open_summons',
            actionLabel: 'مراجعة التبليغ',
        });
    }

    if (ctx.executionPaused && actionsActive(ctx)) {
        findings.push({
            id: 'open:paused-with-coercive',
            category: 'action',
            severity: 'warning',
            observation: 'الإضبارة موقوفة لكن سجل الإجراءات الجبريّة لا يزال فعّالاً.',
            evidence: [`الحالة: ${ctx.lifecycleStatus}`],
        });
    }

    if (s.urgentTimelineDeadline && s.urgentTimelineDeadline.daysLeft < 0) {
        findings.push({
            id: 'open:deadline-passed',
            category: 'timeline',
            severity: 'critical',
            observation: `مهلة عاجية منتهية: «${s.urgentTimelineDeadline.title}».`,
            evidence: [
                `الموعد: ${s.urgentTimelineDeadline.deadlineDate}`,
                `متأخر ${Math.abs(s.urgentTimelineDeadline.daysLeft)} يوماً`,
            ],
            actionId: 'open_timeline',
            actionLabel: 'عرض السجل',
        });
    }

    if (ctx.financialSignals?.settlementBreachTriggeredAt && s.remainingDebt <= 0) {
        findings.push({
            id: 'open:settlement-breach-zero-remaining',
            category: 'amount',
            severity: 'info',
            observation: 'إخلال تسوية مسجّل مع رصيد متبقٍ صفري — راجع دفتر المركز المالي.',
            evidence: [ctx.financialSignals.settlementBreachTriggeredAt],
            actionId: 'open_financial_center',
            actionLabel: 'المركز المالي',
        });
    }

    for (const ev of file.timelineEvents ?? []) {
        if ((ev as { trashedAt?: string }).trashedAt) continue;
        const date = extractYmd((ev as { date?: string }).date);
        const deadline = extractYmd((ev as { deadlineDate?: string }).deadlineDate);
        if (date && deadline && date > deadline) {
            findings.push({
                id: `open:tl-after-deadline:${(ev as { id?: string }).id}`,
                category: 'timeline',
                severity: 'warning',
                observation: `حدث زمني بعد مهمته: «${String((ev as { title?: string }).title ?? '')}».`,
                evidence: [`التاريخ: ${date}`, `المهلة: ${deadline}`],
                actionId: 'open_timeline',
                actionLabel: 'مراجعة السجل',
            });
        }
    }

    return findings;
}

function actionsActive(ctx: ExecutionSparkContext): boolean {
    const file = ctx.executionData;
    const coercive =
        ctx.runtimeOverlay?.activeCoerciveActions ??
        (Array.isArray(file.activeCoerciveActions) ? file.activeCoerciveActions : []);
    return coercive.length > 0 || ctx.signals.coerciveReadyUnresolved;
}

export function mergeDomainFindingsForExecutionOpen(
    ctx: ExecutionSparkContext,
    baseFindings: SparkCoherenceFinding[],
): SparkCoherenceFinding[] {
    const domain = runExecutionOpenDomainFindings(ctx);
    const seen = new Set(baseFindings.map((f) => f.id));
    const merged = [...baseFindings];
    for (const f of domain) {
        if (seen.has(f.id)) continue;
        merged.push(f);
    }
    return merged;
}
