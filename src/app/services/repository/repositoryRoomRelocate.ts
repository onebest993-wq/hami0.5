import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

export function repositoryItemsInRoom<T extends { roomId?: string | null }>(
    items: T[],
    roomId: string,
): T[] {
    const id = roomId.trim();
    return items.filter((item) => (item.roomId?.trim() || null) === id);
}

export async function clearRoomIdOnGlobalNotes(
    notes: GlobalNote[],
    onSaveNote: (note: GlobalNote) => void | Promise<void>,
): Promise<GlobalNote[]> {
    const relocated: GlobalNote[] = [];
    for (const note of notes) {
        await onSaveNote({ ...note, roomId: null });
        relocated.push(note);
    }
    return relocated;
}

export async function restoreGlobalNotesRoom(
    notes: GlobalNote[],
    onSaveNote: (note: GlobalNote) => void | Promise<void>,
): Promise<void> {
    for (const note of notes) {
        try {
            await onSaveNote(note);
        } catch {
            /* أفضل جهد — لا نُسقط بقية الاستعادة */
        }
    }
}

export async function clearRoomIdOnVaultDocs(
    docs: SmartVaultDoc[],
    uid: string,
    updateDoc: (doc: SmartVaultDoc, uid: string) => Promise<void>,
): Promise<SmartVaultDoc[]> {
    const relocated: SmartVaultDoc[] = [];
    for (const doc of docs) {
        await updateDoc({ ...doc, roomId: null, updatedAt: new Date().toISOString() }, uid);
        relocated.push(doc);
    }
    return relocated;
}

export async function restoreVaultDocsRoom(
    docs: SmartVaultDoc[],
    uid: string,
    updateDoc: (doc: SmartVaultDoc, uid: string) => Promise<void>,
): Promise<void> {
    for (const doc of docs) {
        try {
            await updateDoc(doc, uid);
        } catch {
            /* أفضل جهد */
        }
    }
}
