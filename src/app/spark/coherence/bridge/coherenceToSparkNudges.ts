import type { SparkCoherenceReport, SparkCoherenceFinding } from '@/app/spark/coherence/types';
import type { SparkNudge, SparkNudgeKind } from '@/app/spark/types';

/** ترتيب أولوية التنبيهات في الطابور — يختلف بين إنشاء التنفيذ وباقي الأسطح */
export type SparkCoherencePriorityScale = 'primary' | 'supplemental';

function kindForCategory(category: SparkCoherenceFinding['category']): SparkNudgeKind {
    switch (category) {
        case 'timeline':
            return 'coherence.timeline';
        case 'text':
            return 'coherence.text';
        case 'action':
            return 'coherence.action';
        case 'amount':
            return 'coherence.amount';
        default:
            return 'coherence.cross_field';
    }
}

function priorityFor(
    severity: SparkCoherenceFinding['severity'],
    scale: SparkCoherencePriorityScale,
): number {
    if (scale === 'supplemental') {
        // أسطح ترتّب تنازلياً (رقم أصغر = أعلى) — التماسك مكمّل بعد القواعد الإجرائية
        if (severity === 'critical') return 40;
        if (severity === 'warning') return 45;
        return 50;
    }
    if (severity === 'critical') return 11;
    if (severity === 'warning') return 7;
    return 4;
}

function okNudgePriority(scale: SparkCoherencePriorityScale): number {
    return scale === 'supplemental' ? 80 : 2;
}

/**
 * يحوّل تقرير التماسك إلى تنبيهات سبارك — مخفية نسبياً (شارة/Shell فقط).
 */
export function coherenceReportToSparkNudges(
    report: SparkCoherenceReport,
    dossierKey: string,
    surface: SparkNudge['surface'] = 'execution',
    priorityScale: SparkCoherencePriorityScale = 'primary',
): SparkNudge[] {
    const nudges: SparkNudge[] = [];

    for (const f of report.findings) {
        nudges.push({
            id: `${dossierKey}:coherence:${f.id}`,
            kind: kindForCategory(f.category),
            surface,
            priority: priorityFor(f.severity, priorityScale),
            message: f.observation,
            presence: {
                present: f.evidence.slice(0, 3),
                missing: f.severity === 'critical' ? ['اتساق السجل'] : [],
            },
            source: 'sparkCoherenceEngine',
            dossierKey,
            targetFileId: f.targetFileId,
            action:
                f.actionId && f.actionLabel
                    ? { label: f.actionLabel, actionId: f.actionId }
                    : undefined,
        });
    }

    if (nudges.length === 0 && report.coherenceScore >= 88 && priorityScale === 'primary') {
        nudges.push({
            id: `${dossierKey}:coherence:ok`,
            kind: 'coherence.cross_field',
            surface,
            priority: okNudgePriority(priorityScale),
            message: report.sparkBrief,
            presence: { present: [`تماسك ${report.coherenceScore}%`], missing: [] },
            source: 'sparkCoherenceEngine',
            dossierKey,
        });
    }

    return nudges;
}

export function coherenceReportToShellLines(report: SparkCoherenceReport): string[] {
    const lines = [
        '--- تحليل التماسك (تناقضات) ---',
        `تماسك: ${report.coherenceScore}%`,
        report.synthesis,
    ];
    for (const f of report.findings.slice(0, 12)) {
        lines.push(`• [${f.severity}/${f.category}] ${f.observation}`);
    }
    return lines;
}
