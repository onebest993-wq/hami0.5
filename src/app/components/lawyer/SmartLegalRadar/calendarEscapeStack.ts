type CalendarEscapePriority = 0 | 1 | 2 | 3;

const ESCAPE_LAYER_NAMES = ['surface', 'sheet', 'popup', 'nested'] as const;

const escapeLayerMap = new Map<number, Set<string>>();
let escapeTopLayer: CalendarEscapePriority = 0;
let escapeSurfaceLocked = false;

function ensureLayerBucket(layer: CalendarEscapePriority): Set<string> {
    const existing = escapeLayerMap.get(layer);
    if (existing) return existing;
    const bucket = new Set<string>();
    escapeLayerMap.set(layer, bucket);
    return bucket;
}

function recomputeEscapeTopLayer(): CalendarEscapePriority {
    let top: CalendarEscapePriority = 0;
    for (const [layer, bucket] of escapeLayerMap.entries()) {
        if (bucket.size > 0 && layer > top) {
            top = layer as CalendarEscapePriority;
        }
    }
    escapeTopLayer = top;
    if (typeof window !== 'undefined') {
        const w = window as unknown as Record<string, unknown>;
        w.__hamiCalendarEscapeLayerMap = escapeLayerMap as Map<number, boolean> as unknown;
        w.__hamiCalendarEscapeTopLayer = escapeTopLayer;
        w.__hamiCalendarEscapeSurfaceLocked = escapeSurfaceLocked;
    }
    return top;
}

export function blockCalendarEscapeLayer(
    layer: CalendarEscapePriority,
    token: string = 'default',
): void {
    const bucket = ensureLayerBucket(layer);
    bucket.add(token);
    if (layer === 0) escapeSurfaceLocked = true;
    recomputeEscapeTopLayer();
}

export function unblockCalendarEscapeLayer(
    layer: CalendarEscapePriority,
    token: string = 'default',
): boolean {
    const bucket = escapeLayerMap.get(layer);
    if (!bucket) return false;
    const removed = bucket.delete(token);
    if (layer === 0 && bucket.size === 0) escapeSurfaceLocked = false;
    recomputeEscapeTopLayer();
    return removed;
}

export function peekCalendarEscapeTopLayer(): CalendarEscapePriority {
    return escapeTopLayer;
}

export function resolveCalendarEscapeAction(
    pressed: 'back' | 'escape' | 'home-indicator',
): CalendarEscapePriority | null {
    if (escapeTopLayer === 0 && !escapeSurfaceLocked) return null;
    if (pressed === 'escape' || pressed === 'back') {
        return escapeTopLayer;
    }
    if (pressed === 'home-indicator' && escapeTopLayer >= 2) {
        return escapeTopLayer;
    }
    return escapeTopLayer > 0 ? 0 : null;
}

export function unblockAllCalendarOverlayEscape(): boolean {
    try {
        escapeLayerMap.clear();
        escapeSurfaceLocked = false;
        recomputeEscapeTopLayer();
        return true;
    } catch {
        return false;
    }
}

export function describeCalendarEscapeStackForDebug(): string {
    const layers: string[] = [];
    for (let i = 3 as CalendarEscapePriority; i >= 0; i = (i - 1) as CalendarEscapePriority) {
        const bucket = escapeLayerMap.get(i);
        if (bucket && bucket.size > 0) {
            layers.push(`L${i}=${ESCAPE_LAYER_NAMES[i]}(${bucket.size})`);
        }
    }
    return layers.join(' | ') || 'IDLE';
}
