/**
 * Immutable stage-array update — replaces one index without mutating prior stages.
 */
export function replaceStageAt<T>(stages: T[], index: number, nextStage: T): T[] {
    if (index < 0 || index >= stages.length) return stages;
    return stages.map((s, i) => (i === index ? nextStage : s));
}
