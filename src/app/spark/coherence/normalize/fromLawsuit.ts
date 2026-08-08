import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
} from '@/app/spark/coherence/types';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    readLawsuitStageText,
    readLawsuitStageYmd,
    readRecordYmd,
    readTimelineBody,
} from '@/app/spark/coherence/normalize/lawsuitStageFields';

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

/** يحوّل ملف الدعوى الذكي إلى حزمة تماسك عامة */
export function normalizeCoherenceFromLawsuit(ctx: LawsuitSparkContext): SparkCoherenceContextBundle {
    const dates: SparkCoherenceContextBundle['dates'] = [];
    const facts: SparkCoherenceContextBundle['facts'] = [];
    const events: SparkCoherenceContextBundle['events'] = [];
    const texts: SparkCoherenceContextBundle['texts'] = [];
    const stage = ctx.displayStage;

    pushDate(dates, 'meta:today', 'اليوم', getLocalTodayYmd(), 'other', 'system');
    pushDate(
        dates,
        'hearing',
        'جلسة',
        readLawsuitStageYmd(stage, 'nextHearingDate', 'hearingDate', 'decisionDate'),
        'hearing',
        'stage',
    );
    pushDate(
        dates,
        'filing',
        'إقامة',
        readLawsuitStageYmd(stage, 'filingDate', 'caseDate', 'createdDate') ||
            readRecordYmd(stage.appealMetadata, 'filingDate'),
        'filing',
        'stage',
    );

    facts.push(
        { id: 'paused', key: 'case_paused', value: ctx.isPaused, source: 'status' },
        { id: 'status', key: 'case_status', value: ctx.status, source: 'status' },
        {
            id: 'court',
            key: 'court',
            value: readLawsuitStageText(stage, 'courtName', 'court'),
            source: 'stage',
        },
        { id: 'stage', key: 'stage_name', value: String(stage.stageName ?? stage.name ?? ''), source: 'stage' },
    );

    if (ctx.representedParty) {
        facts.push({
            id: 'party',
            key: 'represented_party',
            value: ctx.representedParty,
            source: 'parties',
        });
    }

    for (const ev of ctx.timeline) {
        if ((ev as { isDeleted?: boolean }).isDeleted) continue;
        const date = extractYmd(ev.date);
        events.push({
            id: String(ev.id ?? `tl:${events.length}`),
            date: date || undefined,
            title: String(ev.title ?? ev.type ?? ''),
            notes: readTimelineBody(ev),
            source: 'timeline',
        });
        if (date) {
            pushDate(dates, `tl:${ev.id}`, 'حدث دعوى', date, 'other', 'timeline');
        } else if (String(ev.title ?? ev.type ?? '').trim()) {
            texts.push({
                id: `tl-nodate:${ev.id}`,
                role: 'حدث بلا تاريخ',
                content: readTimelineBody(ev) || String(ev.title ?? ev.type ?? ''),
                source: 'timeline',
            });
        }
        const body = readTimelineBody(ev);
        if (body.length >= 12) {
            texts.push({
                id: `tl-text:${ev.id}`,
                role: String(ev.title ?? ev.type ?? 'حدث'),
                content: body.slice(0, 2000),
                source: 'timeline',
            });
        }
    }

    return {
        surface: 'lawsuit',
        dossierKey: ctx.dossierKey,
        jurisdiction: ctx.jurisdiction,
        facts,
        events,
        claims: [],
        dates,
        texts,
        actions: ctx.isPaused
            ? [{ id: 'case:paused', type: 'case_paused', label: ctx.pauseReason || ctx.status, source: 'status' }]
            : [],
        registeredDates: dates.map((d) => d.ymd),
        meta: {
            caseNo: String(stage.caseNo ?? '').trim(),
            court: readLawsuitStageText(stage, 'courtName', 'court'),
            status: ctx.status,
        },
    };
}

export function runLawsuitDomainFindings(ctx: LawsuitSparkContext): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];
    const undated = ctx.timeline.filter(
        (ev) =>
            !(ev as { isDeleted?: boolean }).isDeleted &&
            !extractYmd(ev.date) &&
            String(ev.title ?? ev.type ?? '').trim(),
    );
    if (undated.length >= 2) {
        findings.push({
            id: 'lawsuit:undated-events',
            category: 'timeline',
            severity: 'warning',
            observation: `${undated.length} أحداث في السجل بلا تاريخ — يصعب ربط التسلسل الزمني.`,
            evidence: undated.slice(0, 3).map((e) => String(e.title ?? e.type)),
            actionId: 'focus_stage',
            actionLabel: 'مراجعة السجل',
        });
    }

    if (ctx.isPaused) {
        const futureHearing = readLawsuitStageYmd(
            ctx.displayStage,
            'nextHearingDate',
            'hearingDate',
            'decisionDate',
        );
        const today = getLocalTodayYmd();
        if (futureHearing && futureHearing >= today) {
            findings.push({
                id: 'lawsuit:paused-future-hearing',
                category: 'cross_field',
                severity: 'info',
                observation: 'الدعوى موقوفة لكن جلسة قادمة مسجّلة — تحقق من التوقيف.',
                evidence: [`جلسة: ${futureHearing}`, `السبب: ${ctx.pauseReason || '—'}`],
            });
        }
    }

    const filing =
        readLawsuitStageYmd(ctx.displayStage, 'filingDate', 'caseDate', 'createdDate') ||
        readRecordYmd(ctx.displayStage.appealMetadata, 'filingDate');
    for (const ev of ctx.timeline) {
        if ((ev as { isDeleted?: boolean }).isDeleted) continue;
        const d = extractYmd(ev.date);
        if (filing && d && d < filing && /حكم|صدور|قرار/i.test(String(ev.title ?? ev.type ?? ''))) {
            findings.push({
                id: `lawsuit:judgment-before-filing:${ev.id}`,
                category: 'timeline',
                severity: 'warning',
                observation: 'حدث يشبه صدور حكم يسبق تاريخ الإقامة في السجل.',
                evidence: [`إقامة: ${filing}`, `الحدث: ${d}`],
            });
            break;
        }
    }

    return findings;
}

export function mergeDomainFindingsForLawsuit(
    ctx: LawsuitSparkContext,
    baseFindings: SparkCoherenceFinding[],
): SparkCoherenceFinding[] {
    const domain = runLawsuitDomainFindings(ctx);
    const seen = new Set(baseFindings.map((f) => f.id));
    const merged = [...baseFindings];
    for (const f of domain) {
        if (seen.has(f.id)) continue;
        merged.push(f);
    }
    return merged;
}
