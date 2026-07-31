import { useCallback, useSyncExternalStore } from 'react';

export type PartyEditDisplayKind = 'creditor' | 'debtor';

export type PartyEditDisplayOverlay = {
    kind: PartyEditDisplayKind;
    partyId: string;
    name: string;
    phone: string;
    address: string;
    updatedAt: number;
};

const overlays = new Map<string, PartyEditDisplayOverlay>();
const listeners = new Set<() => void>();
let version = 0;

function overlayKey(kind: PartyEditDisplayKind, partyId: string): string {
    return `${kind}:${String(partyId || '').trim()}`;
}

function emit(): void {
    version += 1;
    listeners.forEach((listener) => listener());
}

export function partyEditSurfaceSelector(kind: PartyEditDisplayKind, partyId: string): string {
    return `[data-party-edit-surface="${overlayKey(kind, partyId)}"]`;
}

/** تحديث نص الاسم في الـ DOM فوراً — قبل أي commit لـ React. */
export function paintPartyEditNameImmediate(
    kind: PartyEditDisplayKind,
    partyIds: string[],
    name: string,
): void {
    if (typeof document === 'undefined') return;
    const text = String(name ?? '');
    for (const rawId of partyIds) {
        const id = String(rawId || '').trim();
        if (!id) continue;
        document.querySelectorAll(partyEditSurfaceSelector(kind, id)).forEach((node) => {
            (node as HTMLElement).textContent = text;
        });
    }
}

export function collectPartyEditIdentityKeys(input: {
    kind: PartyEditDisplayKind;
    partyId?: string | number | null;
    index?: number;
    workspaceKey?: string | null;
}): string[] {
    const out: string[] = [];
    const push = (value: unknown) => {
        const id = value != null ? String(value).trim() : '';
        if (id && !out.includes(id)) out.push(id);
    };
    push(input.partyId);
    push(input.workspaceKey);
    if (typeof input.index === 'number' && input.index >= 0) {
        push(input.kind === 'creditor' ? `ec-${input.index}` : `d-${input.index}`);
    }
    return out;
}

export function setPartyEditDisplayOverlay(
    overlay: Omit<PartyEditDisplayOverlay, 'updatedAt'> & {
        updatedAt?: number;
        aliasIds?: string[];
    },
): void {
    const primaryId = String(overlay.partyId || '').trim();
    const ids = collectPartyEditIdentityKeys({
        kind: overlay.kind,
        partyId: primaryId,
    });
    for (const alias of overlay.aliasIds || []) pushUnique(ids, alias);
    if (ids.length === 0) return;

    const payload: PartyEditDisplayOverlay = {
        kind: overlay.kind,
        partyId: primaryId || ids[0],
        name: String(overlay.name ?? ''),
        phone: String(overlay.phone ?? ''),
        address: String(overlay.address ?? ''),
        updatedAt: overlay.updatedAt ?? Date.now(),
    };
    for (const id of ids) {
        overlays.set(overlayKey(overlay.kind, id), { ...payload, partyId: id });
    }
    emit();
}

function pushUnique(list: string[], value: unknown): void {
    const id = value != null ? String(value).trim() : '';
    if (id && !list.includes(id)) list.push(id);
}

export function clearPartyEditDisplayOverlay(kind: PartyEditDisplayKind, partyId: string): void {
    const key = overlayKey(kind, partyId);
    if (!overlays.has(key)) return;
    overlays.delete(key);
    emit();
}

export function clearAllPartyEditDisplayOverlays(): void {
    if (overlays.size === 0) return;
    overlays.clear();
    emit();
}

export function getPartyEditDisplayOverlay(
    kind: PartyEditDisplayKind,
    partyId: string,
): PartyEditDisplayOverlay | null {
    return overlays.get(overlayKey(kind, partyId)) ?? null;
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot(): number {
    return version;
}

export function usePartyEditDisplayOverlay(
    kind: PartyEditDisplayKind,
    partyId: string | number | null | undefined,
): PartyEditDisplayOverlay | null {
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const id = partyId != null ? String(partyId).trim() : '';
    if (!id) return null;
    return getPartyEditDisplayOverlay(kind, id);
}

export function applyPartyEditDisplayOverlayToParty<T extends Record<string, unknown>>(
    party: T,
    kind: PartyEditDisplayKind,
    fallbackKeys: string[] = [],
): T {
    const candidates = collectPartyEditIdentityKeys({
        kind,
        partyId: party?.id as string | number | null | undefined,
    });
    for (const key of fallbackKeys) pushUnique(candidates, key);

    let overlay: PartyEditDisplayOverlay | null = null;
    for (const id of candidates) {
        overlay = getPartyEditDisplayOverlay(kind, id);
        if (overlay) break;
    }
    if (!overlay) return party;
    return {
        ...party,
        name: overlay.name,
        fullName: overlay.name,
        phone: overlay.phone,
        address: overlay.address,
    };
}

export function useApplyPartyEditDisplayOverlay(): (
    party: Record<string, unknown>,
    kind: PartyEditDisplayKind,
    fallbackKeys?: string[],
) => Record<string, unknown> {
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return useCallback(
        (party: Record<string, unknown>, kind: PartyEditDisplayKind, fallbackKeys: string[] = []) => {
            return applyPartyEditDisplayOverlayToParty(party, kind, fallbackKeys);
        },
        [],
    );
}

/** إخفاء مودال التعديل فوراً من الـ DOM دون انتظار unmount الثقيل لـ React. */
export function hidePartyEditModalImmediate(): void {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-party-edit-modal="true"]').forEach((node) => {
        const el = node as HTMLElement;
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
    });
}

/** جدولة عمل بعد إطار الرسم الفعلي — لإكمال unmount/persist بعد ظهور الاسم. */
export function scheduleAfterNextPaint(work: () => void): void {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        setTimeout(work, 0);
        return;
    }
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(work);
    });
}
