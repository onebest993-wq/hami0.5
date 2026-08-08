import type { CriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
} from '@/app/spark/coherence/types';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { VerdictCard } from '@/app/components/lawyer/criminal-system/verdictCardsEngine';

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

export function normalizeCoherenceFromCriminal(ctx: CriminalSparkContext): SparkCoherenceContextBundle {
    const dates: SparkCoherenceContextBundle['dates'] = [];
    const facts: SparkCoherenceContextBundle['facts'] = [];
    const events: SparkCoherenceContextBundle['events'] = [];
    const texts: SparkCoherenceContextBundle['texts'] = [];

    pushDate(dates, 'meta:today', 'اليوم', getLocalTodayYmd(), 'other', 'system');

    facts.push(
        { id: 'archived', key: 'is_archived', value: ctx.isArchived, source: 'status' },
        { id: 'art3', key: 'article3_banner', value: ctx.shouldShowArticle3DeadlineBanner, source: 'flags' },
        {
            id: 'art3-days',
            key: 'article3_elapsed_days',
            value: ctx.article3ElapsedDays ?? -1,
            source: 'flags',
        },
        {
            id: 'cassation',
            key: 'mandatory_cassation',
            value: Boolean(ctx.shouldShowMandatoryCassationBanner),
            source: 'flags',
        },
    );

    for (const card of ctx.verdictCards) {
        const id = String(card.id ?? `verdict:${events.length}`);
        const issued = extractYmd(card.issuedAt);
        events.push({
            id,
            date: issued || undefined,
            title: `حكم ${String(card.outcome ?? '')}`.trim(),
            notes: String(card.decisionDraft ?? '').slice(0, 500),
            source: 'verdict_card',
        });
        if (issued) pushDate(dates, `verdict:${id}`, 'صدور حكم', issued, 'judgment', 'verdict');
        if (card.absentiaPublicationDate) {
            pushDate(dates, `pub:${id}`, 'نشر غيابي', card.absentiaPublicationDate, 'notification', 'verdict');
        }
        if (card.absentiaObjectionDeadline) {
            pushDate(dates, `obj:${id}`, 'مهلة اعتراض', card.absentiaObjectionDeadline, 'deadline', 'verdict');
        }
        const draft = String(card.decisionDraft ?? '').trim();
        if (draft.length >= 12) {
            texts.push({ id: `draft:${id}`, role: 'مسودة حكم', content: draft.slice(0, 2000), source: 'verdict' });
        }
    }

    return {
        surface: 'criminal',
        dossierKey: ctx.dossierKey,
        jurisdiction: 'criminal',
        facts,
        events,
        claims: [],
        dates,
        texts,
        actions: [],
        registeredDates: dates.map((d) => d.ymd),
        meta: { caseNo: ctx.caseId, status: ctx.isArchived ? 'archived' : 'active' },
    };
}

function scanVerdictCardCoherence(card: VerdictCard): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];
    if (card.presenceType !== 'غيابي' || card.absentiaTreatedAsInPerson) return findings;

    const issued = extractYmd(card.issuedAt);
    const publication = extractYmd(card.absentiaPublicationDate);
    const objectionDeadline = extractYmd(card.absentiaObjectionDeadline);
    const cardId = String(card.id ?? 'verdict');

    if (issued && publication && publication < issued) {
        findings.push({
            id: `criminal:pub-before-issued:${cardId}`,
            category: 'timeline',
            severity: 'warning',
            observation: 'تاريخ النشر الغيابي يسبق تاريخ صدور الحكم في السجل.',
            evidence: [`صدور: ${issued}`, `نشر: ${publication}`],
            actionId: 'review_dossier',
            actionLabel: 'مراجعة الإضبارة',
        });
    }

    if (publication && objectionDeadline && objectionDeadline < publication) {
        findings.push({
            id: `criminal:objection-before-pub:${cardId}`,
            category: 'timeline',
            severity: 'critical',
            observation: 'مهلة الاعتراض مسجّلة قبل تاريخ النشر — تسلسل غير منطقي.',
            evidence: [`نشر: ${publication}`, `مهلة: ${objectionDeadline}`],
            actionId: 'absentia_objection',
            actionLabel: 'مراجعة المعارضة',
        });
    }

    if (objectionDeadline) {
        const today = getLocalTodayYmd();
        if (objectionDeadline < today && !card.absentiaObjectionFiled && publication) {
            findings.push({
                id: `criminal:objection-deadline-passed:${cardId}`,
                category: 'timeline',
                severity: 'warning',
                observation: 'مهلة المعارضة الغيابية منتهية دون تسجيل اعتراض.',
                evidence: [`المهلة: ${objectionDeadline}`],
                actionId: 'absentia_objection',
                actionLabel: 'متابعة المعارضة',
            });
        }
    }

    return findings;
}

export function runCriminalDomainFindings(ctx: CriminalSparkContext): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];

    if (
        ctx.shouldShowArticle3DeadlineBanner &&
        typeof ctx.article3ElapsedDays === 'number' &&
        ctx.article3ElapsedDays < 90
    ) {
        findings.push({
            id: 'criminal:article3-banner-mismatch',
            category: 'cross_field',
            severity: 'info',
            observation: 'إشارة المادة 3 مفعّلة رغم أن الأيام المنقضية أقل من 90 — راجع تاريخ الاكتشاف.',
            evidence: [`${ctx.article3ElapsedDays} يوماً`],
            actionId: 'review_dossier',
            actionLabel: 'مراجعة الإضبارة',
        });
    }

    for (const card of ctx.verdictCards) {
        findings.push(...scanVerdictCardCoherence(card));
    }

    return findings;
}

export function mergeDomainFindingsForCriminal(
    ctx: CriminalSparkContext,
    baseFindings: SparkCoherenceFinding[],
): SparkCoherenceFinding[] {
    const domain = runCriminalDomainFindings(ctx);
    const seen = new Set(baseFindings.map((f) => f.id));
    const merged = [...baseFindings];
    for (const f of domain) {
        if (seen.has(f.id)) continue;
        merged.push(f);
    }
    return merged;
}
