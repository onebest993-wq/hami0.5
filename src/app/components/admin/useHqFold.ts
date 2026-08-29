import { useCallback, useState } from 'react';

export const HQ_FOLD_STORAGE_KEY = 'hami:hq-fold:v1';

export const HQ_FOLD_IDS = [
    'health',
    'queue',
    'accounts',
    'verification',
    'forum',
    'courts',
    'audit',
    'devices',
    'notify',
] as const;

export type HqFoldId = (typeof HQ_FOLD_IDS)[number];

function readStore(): Partial<Record<HqFoldId, boolean>> {
    if (typeof sessionStorage === 'undefined') return {};
    try {
        const raw = sessionStorage.getItem(HQ_FOLD_STORAGE_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const out: Partial<Record<HqFoldId, boolean>> = {};
        for (const key of HQ_FOLD_IDS) {
            const value = (parsed as Record<string, unknown>)[key];
            if (typeof value === 'boolean') out[key] = value;
        }
        return out;
    } catch {
        return {};
    }
}

function writeStore(id: HqFoldId, open: boolean): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        const next: Partial<Record<HqFoldId, boolean>> = { ...readStore(), [id]: open };
        const compact: Record<string, boolean> = {};
        for (const key of HQ_FOLD_IDS) {
            if (typeof next[key] === 'boolean') compact[key] = next[key] as boolean;
        }
        sessionStorage.setItem(HQ_FOLD_STORAGE_KEY, JSON.stringify(compact));
    } catch {
        /* private mode / quota — الحالة تبقى في الذاكرة */
    }
}

export function useHqFold(id: HqFoldId, defaultOpen = true): [boolean, () => void] {
    const [open, setOpen] = useState(() => {
        const stored = readStore()[id];
        return typeof stored === 'boolean' ? stored : defaultOpen;
    });

    const toggle = useCallback(() => {
        setOpen((prev) => {
            const next = !prev;
            writeStore(id, next);
            return next;
        });
    }, [id]);

    return [open, toggle];
}
