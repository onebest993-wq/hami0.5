import React from 'react';
import { Eye } from '@/app/components/ui/icons/Eye';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { Pin } from '@/app/components/ui/icons/Pin';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import { VaultDossierLinkButton } from '../VaultDossierLinkButton';
import { RepositoryMoveToRoomButton } from '../RepositoryMoveToRoomButton';
import {
    REPO_CARD_ACTIONS,
    REPO_CARD_EDIT_LINK,
    REPO_CARD_ICON_BTN,
    REPO_CARD_ICON_BTN_ACTIVE,
} from '../smartRepositoryTheme';

type GlobalEntryCardActionsProps = {
    note: GlobalNote;
    voice: boolean;
    attachment?: SmartVaultDoc;
    dossiers: DossierPickerOption[];
    rooms?: RepositoryRoom[];
    onStartEdit: () => void;
    onTogglePin: () => void;
    onLinkGlobalToDossier: (note: GlobalNote, dossier: DossierPickerOption) => Promise<void>;
    onMoveGlobalToRoom?: (note: GlobalNote, roomId: string | null) => void | Promise<void>;
    onViewVaultDoc?: (doc: SmartVaultDoc) => void | Promise<void>;
    onDeleteGlobal: (id: string | number) => void;
};

export function GlobalEntryCardActions({
    note,
    voice,
    attachment,
    dossiers,
    rooms,
    onStartEdit,
    onTogglePin,
    onLinkGlobalToDossier,
    onMoveGlobalToRoom,
    onViewVaultDoc,
    onDeleteGlobal,
}: GlobalEntryCardActionsProps) {
    return (
        <div className={REPO_CARD_ACTIONS}>
            <div className="flex flex-wrap items-center gap-1 min-w-0">
                {!voice ? (
                    <button type="button" onClick={onStartEdit} className={REPO_CARD_EDIT_LINK}>
                        تعديل
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={onTogglePin}
                    className={note.isPinned ? REPO_CARD_ICON_BTN_ACTIVE : REPO_CARD_ICON_BTN}
                    aria-label={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    aria-pressed={note.isPinned}
                    data-testid={`repository-note-pin-${note.id}`}
                >
                    <Pin size={14} className={note.isPinned ? 'fill-current' : undefined} />
                </button>
                <VaultDossierLinkButton
                    dossiers={dossiers}
                    onConfirm={async (dossier) => onLinkGlobalToDossier(note, dossier)}
                />
                {rooms && onMoveGlobalToRoom ? (
                    <RepositoryMoveToRoomButton
                        rooms={rooms}
                        currentRoomId={note.roomId}
                        onMove={(roomId) => onMoveGlobalToRoom(note, roomId)}
                    />
                ) : null}
                {note.attachmentDocId && onViewVaultDoc ? (
                    attachment ? (
                        <button
                            type="button"
                            onClick={() => void onViewVaultDoc(attachment)}
                            className={`${REPO_CARD_ICON_BTN} text-white/45 hover:text-[#E6C673]`}
                            aria-label="عرض المرفق"
                            data-testid={`repository-global-attachment-view-${attachment.id}`}
                        >
                            <Eye size={14} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className={`${REPO_CARD_ICON_BTN} text-white/30 opacity-60`}
                            aria-label="جاري تحميل المرفق"
                            title="جاري تحميل المرفق..."
                        >
                            <Loader2 size={14} className="animate-spin" />
                        </button>
                    )
                ) : null}
            </div>
            <button
                type="button"
                onClick={async () => {
                    const ok = await SmartDialog.confirm('حذف هذه البطاقة؟');
                    if (ok) onDeleteGlobal(note.id);
                }}
                className={`${REPO_CARD_ICON_BTN} text-white/40 hover:text-red-400 hover:border-red-400/25`}
                aria-label="حذف"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}
