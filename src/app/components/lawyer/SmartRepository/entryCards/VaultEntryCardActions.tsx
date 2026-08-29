import React from 'react';
import { Eye } from '@/app/components/ui/icons/Eye';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';
import { VaultDossierLinkButton } from '../VaultDossierLinkButton';
import { RepositoryMoveToRoomButton } from '../RepositoryMoveToRoomButton';
import { REPO_CARD_ACTIONS, REPO_CARD_ICON_BTN } from '../smartRepositoryTheme';

const CARD_ACTION_BTN = `${REPO_CARD_ICON_BTN} relative z-[2] pointer-events-auto`;

type VaultEntryCardActionsProps = {
    doc: SmartVaultDoc;
    dossiers: DossierPickerOption[];
    rooms?: RepositoryRoom[];
    onMoveVaultDocToRoom?: (doc: SmartVaultDoc, roomId: string | null) => void | Promise<void>;
    onBindVaultDoc: (doc: SmartVaultDoc, dossier: DossierPickerOption) => Promise<void>;
    onDeleteVaultDoc?: (doc: SmartVaultDoc) => void | Promise<void>;
    onEditVaultDoc?: (doc: SmartVaultDoc) => void;
    onViewVaultDoc?: (doc: SmartVaultDoc) => void | Promise<void>;
    isViewing: boolean;
    onView: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
};

export function VaultEntryCardActions({
    doc,
    dossiers,
    rooms,
    onMoveVaultDocToRoom,
    onBindVaultDoc,
    onDeleteVaultDoc,
    onEditVaultDoc,
    onViewVaultDoc,
    isViewing,
    onView,
    onDelete,
}: VaultEntryCardActionsProps) {
    return (
        <div className={REPO_CARD_ACTIONS} data-testid={`repository-vault-actions-${doc.id}`}>
            <VaultDossierLinkButton
                dossiers={dossiers}
                onConfirm={async (dossier) => onBindVaultDoc(doc, dossier)}
            />
            {rooms && onMoveVaultDocToRoom ? (
                <RepositoryMoveToRoomButton
                    rooms={rooms}
                    currentRoomId={doc.roomId}
                    onMove={(roomId) => onMoveVaultDocToRoom(doc, roomId)}
                />
            ) : null}
            <div className="flex items-center gap-0.5 pointer-events-auto">
                {onViewVaultDoc ? (
                    <button
                        type="button"
                        disabled={isViewing}
                        onClick={onView}
                        className={`${CARD_ACTION_BTN} disabled:opacity-50`}
                        aria-label={`عرض ${doc.title}`}
                        data-testid={`repository-vault-view-${doc.id}`}
                    >
                        {isViewing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Eye size={14} />
                        )}
                    </button>
                ) : null}
                {onEditVaultDoc ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditVaultDoc(doc);
                        }}
                        className={CARD_ACTION_BTN}
                        aria-label={`تعديل ${doc.title}`}
                        data-testid={`repository-vault-edit-${doc.id}`}
                    >
                        <Pencil size={14} />
                    </button>
                ) : null}
                {onDeleteVaultDoc ? (
                    <button
                        type="button"
                        onClick={(e) => void onDelete(e)}
                        className={`${CARD_ACTION_BTN} hover:text-rose-400`}
                        aria-label={`حذف ${doc.title}`}
                        data-testid={`repository-vault-delete-${doc.id}`}
                    >
                        <Trash2 size={14} />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
