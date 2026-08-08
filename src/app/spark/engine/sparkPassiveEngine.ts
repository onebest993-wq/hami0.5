import type { SparkNudge } from '@/app/spark/types';
import type { SparkShellRegistration } from '@/app/spark/shell/sparkShellStore';

export type SparkShellViewModel = {
    nudges: SparkNudge[];
    hasAttention: boolean;
    contextLabel: string;
    surface: SparkShellRegistration['surface'] | 'home';
    onFollow?: (actionId: string) => void;
    targetRouteFileId?: string;
};

const SURFACE_LABELS: Record<SparkShellRegistration['surface'], string> = {
    lawsuit: 'إضبارة دعوى',
    execution: 'إضبارة تنفيذ',
    criminal: 'إضبارة جزائية',
    calendar: 'التقويم',
    home: 'الرئيسية',
    field: 'المهام الميدانية',
    threading: 'المعاملات',
    repository: 'المستودع',
};

const MAX_SHELL_PASSIVE_NUDGES = 5;

function pushUniqueNudge(bucket: SparkNudge[], nudge: SparkNudge | null | undefined): void {
    if (!nudge) return;
    if (bucket.some((item) => item.id === nudge.id)) return;
    bucket.push(nudge);
}

/** يجمع التنبيهات السلبية للوحة سبارك — بدون LLM */
export function buildSparkShellViewModel(input: {
    registration: SparkShellRegistration | null;
    homeSummary: SparkNudge | null;
}): SparkShellViewModel {
    const nudges: SparkNudge[] = [];
    const reg = input.registration;

    if (reg) {
        if (reg.passiveNudges?.length) {
            for (const item of reg.passiveNudges.slice(0, MAX_SHELL_PASSIVE_NUDGES)) {
                pushUniqueNudge(nudges, item);
            }
        } else {
            pushUniqueNudge(nudges, reg.passiveNudge);
        }
        pushUniqueNudge(nudges, reg.auditNudge);
    }

    if (!nudges.length) {
        pushUniqueNudge(nudges, input.homeSummary);
    }

    const surface = reg?.surface ?? 'home';
    const contextLabel = reg?.dossierLabel?.trim()
        ? reg.dossierLabel
        : SURFACE_LABELS[surface];

    return {
        nudges,
        hasAttention: nudges.length > 0,
        contextLabel,
        surface,
        onFollow: reg?.onFollow,
        targetRouteFileId: nudges[0]?.targetFileId,
    };
}
