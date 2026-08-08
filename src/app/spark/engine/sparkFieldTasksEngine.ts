import type { SparkNudge } from '@/app/spark/types';
import type { LegalTask } from '@/app/types/TaskEngine';
import { scanFieldTasksForSpark } from '@/app/spark/engine/fieldTasksSparkScan';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';

export function pickActiveFieldTaskSparkNudge(tasks: LegalTask[]): SparkNudge | null {
    const hits = scanFieldTasksForSpark(tasks, { maxHits: 1 });
    const first = hits[0]?.nudge;
    if (!first) return null;
    if (isSparkNudgeSuppressed(first.kind, 'field:sheet')) return null;
    return first;
}
