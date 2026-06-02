import { WORKSPACE_PIN_TYPES, type WorkspacePinType } from './types';

const ROUTE_TYPES = WORKSPACE_PIN_TYPES.join('|');
const MAX_ROUTE_ID_LEN = 128;

function sanitizeRouteId(raw: string): string | null {
    const id = raw.trim();
    if (!id || id.length > MAX_ROUTE_ID_LEN) return null;
    if (/[\x00-\x1f\x7f]/.test(id)) return null;
    return id;
}

export function buildWorkspaceRoute(type: WorkspacePinType, id: string): string {
    const safeId = sanitizeRouteId(String(id)) ?? String(id).slice(0, MAX_ROUTE_ID_LEN);
    return `workspace:${type}:${encodeURIComponent(safeId)}`;
}

export function parseWorkspaceRoute(routePath: string): { type: WorkspacePinType; id: string } | null {
    const m = new RegExp(`^workspace:(${ROUTE_TYPES}):(.+)$`).exec(routePath.trim());
    if (!m) return null;
    const type = m[1] as WorkspacePinType;
    if (!WORKSPACE_PIN_TYPES.includes(type)) return null;
    let rawId = m[2];
    try {
        rawId = decodeURIComponent(m[2]);
    } catch {
        /* keep raw segment */
    }
    const id = sanitizeRouteId(rawId);
    if (!id) return null;
    return { type, id };
}
