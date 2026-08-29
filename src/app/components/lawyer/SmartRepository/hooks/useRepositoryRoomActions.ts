import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { countItemsInRoom } from '@/app/services/repository/repositoryRooms';
import type { useRepositoryRooms } from './useRepositoryRooms';
import { confirmRepositoryRoomDelete } from '../repositoryDialog';

type VaultRoomApi = {
    currentUserId?: string;
    docs: SmartVaultDoc[];
    refreshDocs: () => Promise<void>;
};

type UseRepositoryRoomActionsParams = {
    currentUserId?: string;
    notes: GlobalNote[];
    onSaveNote: (note: GlobalNote) => void | Promise<void>;
    vault: VaultRoomApi;
    roomsApi: ReturnType<typeof useRepositoryRooms>;
};

export function useRepositoryRoomActions({
    currentUserId,
    notes,
    onSaveNote,
    vault,
    roomsApi,
}: UseRepositoryRoomActionsParams) {
    const handleMoveGlobalToRoom = useCallback(
        async (note: GlobalNote, roomId: string | null) => {
            await onSaveNote({ ...note, roomId });
            SmartToast.success(roomId ? 'تم النقل إلى الغرفة' : 'أُعيد إلى المستودع العام');
        },
        [onSaveNote],
    );

    const handleMoveVaultDocToRoom = useCallback(
        async (doc: SmartVaultDoc, roomId: string | null) => {
            const uid = vault.currentUserId || currentUserId || '';
            if (!uid) {
                SmartToast.error('يرجى تسجيل الدخول أولاً');
                return;
            }
            try {
                await SmartVaultDB.updateDoc(
                    { ...doc, roomId, updatedAt: new Date().toISOString() },
                    uid,
                );
                await vault.refreshDocs();
                SmartToast.success(roomId ? 'تم النقل إلى الغرفة' : 'أُعيد إلى المستودع العام');
            } catch {
                SmartToast.error('تعذّر نقل الملف');
            }
        },
        [currentUserId, vault],
    );

    const handleRemoveRoom = useCallback(
        async (roomId: string) => {
            const room = roomsApi.rooms.find((r) => r.id === roomId);
            const count = countItemsInRoom(roomId, notes, vault.docs);
            const ok = await confirmRepositoryRoomDelete(room?.title ?? 'الغرفة', count);
            if (!ok) return;

            const uid = vault.currentUserId || currentUserId || '';
            try {
                for (const note of notes) {
                    if ((note.roomId?.trim() || null) === roomId) {
                        await onSaveNote({ ...note, roomId: null });
                    }
                }
                if (uid) {
                    const affected = vault.docs.filter((d) => (d.roomId?.trim() || null) === roomId);
                    for (const doc of affected) {
                        await SmartVaultDB.updateDoc(
                            { ...doc, roomId: null, updatedAt: new Date().toISOString() },
                            uid,
                        );
                    }
                    if (affected.length > 0) await vault.refreshDocs();
                }
                roomsApi.deleteRoom(roomId);
                SmartToast.success('تم حذف الغرفة');
            } catch {
                SmartToast.error('تعذّر حذف الغرفة');
            }
        },
        [currentUserId, notes, onSaveNote, roomsApi, vault],
    );

    const handleCreateRoom = useCallback(
        (title: string) => {
            const result = roomsApi.createRoom(title);
            if (result.reason === 'unsigned') {
                SmartToast.error('يرجى تسجيل الدخول أولاً');
                return;
            }
            if (result.reason === 'limit') {
                SmartToast.error(`الحد الأقصى ${roomsApi.roomsSoftMax} غرفة — احذف غرفاً غير مستخدمة`);
                return;
            }
            if (result.reason === 'duplicate') {
                SmartToast.error('غرفة بهذا الاسم موجودة مسبقاً');
                return;
            }
            if (result.room) SmartToast.success('تم إنشاء الغرفة');
        },
        [roomsApi],
    );

    const handleTogglePinRoom = useCallback(
        (roomId: string) => {
            const result = roomsApi.togglePinRoom(roomId);
            if (result.atLimit) {
                SmartToast.error('يمكنك تثبيت 5 غرف فقط في الشريط العلوي');
                return;
            }
            if (!result.applied) {
                SmartToast.error('يرجى تسجيل الدخول أولاً');
                return;
            }
            SmartToast.success(result.pinned ? 'ثُبّتت في الأعلى' : 'أُلغي التثبيت');
        },
        [roomsApi],
    );

    return {
        handleMoveGlobalToRoom,
        handleMoveVaultDocToRoom,
        handleRemoveRoom,
        handleCreateRoom,
        handleTogglePinRoom,
    };
}
