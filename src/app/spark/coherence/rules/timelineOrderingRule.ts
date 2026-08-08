import type { SparkCoherenceContextBundle, SparkCoherenceFinding } from '@/app/spark/coherence/types';

const ORDER: Array<[string, string, string]> = [
    ['filing', 'judgment', 'إقامة الدعوى يجب أن تسبق أو تتزامن مع تاريخ الحكم'],
    ['filing', 'execution', 'إقامة الدعوى يجب أن تسبق تاريخ الاحتساب/التنفيذ'],
    ['judgment', 'execution', 'تاريخ الحكم عادةً يسبق تاريخ الاحتساب'],
    ['discovery', 'submission', 'تاريخ الاكتشاف يسبق تقديم الإضبارة'],
];

function ymdOf(bundle: SparkCoherenceContextBundle, role: string): string | null {
    const d = bundle.dates.find((x) => x.role === role && x.ymd);
    return d?.ymd ?? null;
}

/** تناقضات ترتيب زمني — عام على كل الأدوار */
export function runTimelineOrderingRule(bundle: SparkCoherenceContextBundle): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];

    for (const [beforeRole, afterRole, hint] of ORDER) {
        const before = ymdOf(bundle, beforeRole);
        const after = ymdOf(bundle, afterRole);
        if (!before || !after) continue;
        if (after < before) {
            findings.push({
                id: `timeline:${beforeRole}-after-${afterRole}`,
                category: 'timeline',
                severity: beforeRole === 'filing' && afterRole === 'execution' ? 'critical' : 'warning',
                observation: `تناقض زمني: «${afterRole}» (${after}) قبل «${beforeRole}» (${before}).`,
                evidence: [hint],
                actionId: 'focus_coherence_timeline',
                actionLabel: 'مراجعة التسلسل',
            });
        }
    }

    const today = bundle.dates.find((d) => d.id === 'meta:today')?.ymd;
    const execution = ymdOf(bundle, 'execution');
    if (today && execution && execution > today) {
        findings.push({
            id: 'timeline:execution-future',
            category: 'timeline',
            severity: 'warning',
            observation: 'تاريخ احتساب/إجراء في المستقبل.',
            evidence: [`الاحتساب: ${execution}`, `اليوم: ${today}`],
        });
    }

    return findings;
}
