/** ضغطة أول فتح على هيكل البطاقة — تُحفظ حتى تُركَّب الشبكة الحيّة. */

const PENDING_TTL_MS = 8_000;

let pendingSlotIndex: number | null = null;
let pendingAt = 0;

export function rememberExecutionArchiveFirstOpenIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0) return;
    pendingSlotIndex = index;
    pendingAt = Date.now();
}

export function takeExecutionArchiveFirstOpenIndex(): number | null {
    const index = pendingSlotIndex;
    pendingSlotIndex = null;
    if (index == null) return null;
    if (Date.now() - pendingAt > PENDING_TTL_MS) return null;
    return index;
}

export function clearExecutionArchiveFirstOpenIndex(): void {
    pendingSlotIndex = null;
    pendingAt = 0;
}

export function resetExecutionArchiveFirstOpenClickForTests(): void {
    clearExecutionArchiveFirstOpenIndex();
}
