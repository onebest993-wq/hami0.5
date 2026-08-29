type ProceduralPathStepStatus = 'in_progress' | 'done' | 'postponed';

type ProceduralPathStep = {
    id: string;
    title: string;
    date: string;
    status: ProceduralPathStepStatus;
};

type ProceduralPath = {
    id: string;
    name: string;
    color: string;
    items: ProceduralPathStep[];
};

const PROCEDURAL_PATH_COLOR_PRESETS = [
    '#E6C673',
    '#38bdf8',
    '#a78bfa',
    '#34d399',
    '#fb923c',
    '#f472b6',
    '#f87171',
    '#94a3b8',
] as const;

function isProceduralStepStatus(v: string): v is ProceduralPathStepStatus {
    return v === 'in_progress' || v === 'done' || v === 'postponed';
}

function normalizePathColor(raw: unknown): string {
    const v = String(raw ?? '').trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
    return PROCEDURAL_PATH_COLOR_PRESETS[0];
}

export function sortPathStepsChronologically(items: ProceduralPathStep[]): ProceduralPathStep[] {
    return [...items].sort((a, b) => {
        const at = Date.parse(a.date) || 0;
        const bt = Date.parse(b.date) || 0;
        if (at !== bt) return at - bt;
        return a.title.localeCompare(b.title, 'ar');
    });
}

function normalizeProceduralPathStep(raw: unknown): ProceduralPathStep | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const title = String(o.title ?? '').trim();
    const date = String(o.date ?? '').trim();
    if (!title || !date) return null;
    const statusRaw = String(o.status ?? 'in_progress').trim();
    const status = isProceduralStepStatus(statusRaw) ? statusRaw : 'in_progress';
    return {
        id: String(o.id ?? '').trim() || createProceduralId(),
        title,
        date,
        status,
    };
}

export function normalizeProceduralPaths(raw: unknown): ProceduralPath[] {
    if (!Array.isArray(raw)) return [];
    const out: ProceduralPath[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;
        const name = String(o.name ?? '').trim();
        if (!name) continue;
        const itemsRaw = Array.isArray(o.items) ? o.items : [];
        const items = sortPathStepsChronologically(
            itemsRaw.map(normalizeProceduralPathStep).filter((s): s is ProceduralPathStep => Boolean(s)),
        );
        out.push({
            id: String(o.id ?? '').trim() || createProceduralId(),
            name,
            color: normalizePathColor(o.color),
            items,
        });
    }
    return out;
}

export function createProceduralId(): string {
    return globalThis.crypto &&
        'randomUUID' in globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
