type SlotListener = () => void;

let activeBlockId: string | null = null;
const listeners = new Set<SlotListener>();

function notify(): void {
    listeners.forEach((listener) => listener());
}

/** كتلة تفاعلية واحدة «حية» في كل لحظة — الباقي paused عبر data-canvas-slot-active */
export function tryClaimProfileCanvasSlot(blockId: string): boolean {
    const id = blockId.trim();
    if (!id) return false;
    if (!activeBlockId || activeBlockId === id) {
        const changed = activeBlockId !== id;
        activeBlockId = id;
        /* لا notify عند إعادة المطالبة — يمنع حلقات sync→claim→notify */
        if (changed) notify();
        return true;
    }
    return false;
}

export function releaseProfileCanvasSlot(blockId: string): void {
    const id = blockId.trim();
    if (activeBlockId === id) {
        activeBlockId = null;
        notify();
    }
}

export function getActiveProfileCanvasSlot(): string | null {
    return activeBlockId;
}

export function subscribeProfileCanvasSlot(listener: SlotListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function resetProfileCanvasSlotForTests(): void {
    activeBlockId = null;
    listeners.clear();
}
