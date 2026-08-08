import type { SparkNudge } from '@/app/spark/types';
import type { LawsuitCreationSparkContext } from '@/app/spark/context/lawsuitCreationSparkContext';
import { collectLawsuitCreationSparkNudges } from '@/app/spark/procedural/lawsuitCreationNudgeRules';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';

export function pickActiveLawsuitCreationSparkNudge(
    ctx: LawsuitCreationSparkContext,
): SparkNudge | null {
    for (const nudge of collectLawsuitCreationSparkNudges(ctx)) {
        if (isSparkNudgeSuppressed(nudge.kind, 'creation:lawuit')) continue;
        return nudge;
    }
    return null;
}
