import type { DragEvent } from 'react';

export type DragPayload = {
    kind: 'root' | 'subitem' | 'container';
    id: string;
    fromParentId?: string | null;
};

export const DRAG_MIME = 'text/procedural-drag';

export const parseProceduralDrag = (e: DragEvent): DragPayload | null => {
    try {
        const raw = e.dataTransfer.getData(DRAG_MIME);
        if (!raw) return null;
        const o = JSON.parse(raw) as DragPayload;
        if (!o?.id || !o?.kind) return null;
        return o;
    } catch {
        return null;
    }
};
