/** Stable id helper for procedural containers — shared to avoid model↔normalize cycles. */
export function createProceduralId(): string {
    return globalThis.crypto &&
        'randomUUID' in globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
