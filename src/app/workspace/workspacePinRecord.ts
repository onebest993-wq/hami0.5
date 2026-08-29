import type { WorkspacePinnedItem } from './types';
import { buildWorkspaceRoute } from './workspaceRoutes';

export function safeStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

export function partyName(p: unknown): string {
    if (!p || typeof p !== 'object') return '';
    return safeStr((p as { name?: string }).name);
}

export function safeEntityId(v: unknown): string {
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    return '';
}

export function recordFromParts(
    type: WorkspacePinnedItem['type'],
    id: string,
    title: string,
    clientName: string,
    caseNumber: string,
): WorkspacePinnedItem {
    return {
        id,
        type,
        title: title || '—',
        clientName,
        caseNumber,
        routePath: buildWorkspaceRoute(type, id),
    };
}
