export type SeizureWorkflowStep2Lane = 'auction' | 'objection';

const laneByKey = new Map<string, SeizureWorkflowStep2Lane>();

export function readSeizureWorkflowLaneSession(key: string): SeizureWorkflowStep2Lane | null {
    const lane = laneByKey.get(String(key || '').trim());
    return lane === 'auction' || lane === 'objection' ? lane : null;
}

export function writeSeizureWorkflowLaneSession(
    key: string,
    lane: SeizureWorkflowStep2Lane | null,
): void {
    const id = String(key || '').trim();
    if (!id) return;
    if (lane === 'auction' || lane === 'objection') {
        laneByKey.set(id, lane);
        return;
    }
    laneByKey.delete(id);
}
