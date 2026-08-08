import type { SparkNudge } from '@/app/spark/types';
import { scanThreadingForSpark } from '@/app/spark/engine/threadingSparkScan';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';

export function pickActiveThreadingSparkNudge(
    transactions: unknown[],
    tasks: unknown[],
): SparkNudge | null {
    const hits = scanThreadingForSpark(transactions, tasks, { maxHits: 1 });
    const first = hits[0]?.nudge;
    if (!first) return null;
    if (isSparkNudgeSuppressed(first.kind, 'threading:list')) return null;
    return first;
}
