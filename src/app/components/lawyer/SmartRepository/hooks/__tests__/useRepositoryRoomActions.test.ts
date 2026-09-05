import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

const confirmRepositoryRoomDelete = vi.fn();

vi.mock('@/app/components/lawyer/SmartRepository/repositoryDialog', () => ({
    confirmRepositoryRoomDelete: (...args: unknown[]) => confirmRepositoryRoomDelete(...args),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/services/vault/smartVaultRuntime', () => ({
    SmartVaultDB: { updateDoc: vi.fn() },
}));

import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import { useRepositoryRoomActions } from '../useRepositoryRoomActions';

const roomNote: GlobalNote = {
    id: 'n1',
    title: 'مسودة',
    body: '',
    isPinned: false,
    roomId: 'room_1',
};

const roomDoc: SmartVaultDoc = {
    id: 'd1',
    title: 'عقد',
    type: 'pdf',
    tags: [],
    authorId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    fileSize: 12,
    fileName: 'a.pdf',
    mimeType: 'application/pdf',
    storagePath: 'local:vault:a',
    roomId: 'room_1',
};

function buildParams(overrides?: {
    uid?: string;
    deleteRoom?: (id: string) => boolean;
    notes?: GlobalNote[];
    docs?: SmartVaultDoc[];
}) {
    const onSaveNote = vi.fn(async () => undefined);
    const deleteRoom = overrides?.deleteRoom ?? vi.fn(() => true);
    return {
        onSaveNote,
        deleteRoom,
        params: {
            currentUserId: overrides?.uid,
            notes: overrides?.notes ?? [roomNote],
            onSaveNote,
            vault: {
                currentUserId: overrides?.uid,
                docs: overrides?.docs ?? [roomDoc],
                refreshDocs: vi.fn(async () => undefined),
            },
            roomsApi: {
                rooms: [{ id: 'room_1', title: 'غرفة', createdAt: '2026-01-01T00:00:00.000Z' }],
                pinnedRoomIds: [] as string[],
                selectedRoomId: 'room_1' as const,
                setSelectedRoomId: vi.fn(),
                activeRoomId: 'room_1',
                createRoom: vi.fn(),
                deleteRoom,
                togglePinRoom: vi.fn(),
                roomsSoftMax: 12,
            },
        },
    };
}

describe('useRepositoryRoomActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        confirmRepositoryRoomDelete.mockResolvedValue(true);
    });

    it('لا ينقل عناصر الغرفة قبل تسجيل الدخول', async () => {
        const { params, onSaveNote, deleteRoom } = buildParams({ uid: '' });
        const { result } = renderHook(() => useRepositoryRoomActions(params));
        await act(async () => {
            await result.current.handleRemoveRoom('room_1');
        });
        expect(onSaveNote).not.toHaveBeenCalled();
        expect(deleteRoom).not.toHaveBeenCalled();
        expect(SmartVaultDB.updateDoc).not.toHaveBeenCalled();
        expect(SmartToast.error).toHaveBeenCalledWith('يرجى تسجيل الدخول أولاً');
        expect(SmartToast.success).not.toHaveBeenCalled();
    });

    it('يستعيد النقل إن فشل حذف الغرفة بعد الإرجاع للعام', async () => {
        const { params, onSaveNote, deleteRoom } = buildParams({
            uid: 'u1',
            deleteRoom: vi.fn(() => false),
        });
        const { result } = renderHook(() => useRepositoryRoomActions(params));
        await act(async () => {
            await result.current.handleRemoveRoom('room_1');
        });
        expect(deleteRoom).toHaveBeenCalledWith('room_1');
        expect(onSaveNote.mock.calls[0]?.[0]).toMatchObject({ id: 'n1', roomId: null });
        expect(onSaveNote.mock.calls[1]?.[0]).toMatchObject({ id: 'n1', roomId: 'room_1' });
        expect(SmartVaultDB.updateDoc).toHaveBeenCalled();
        expect(SmartToast.error).toHaveBeenCalledWith('تعذّر حذف الغرفة');
        expect(SmartToast.success).not.toHaveBeenCalled();
    });
});
