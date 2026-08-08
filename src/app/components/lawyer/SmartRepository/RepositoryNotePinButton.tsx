import React, { useCallback, useMemo } from 'react';
import { Pin } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { buildNoteWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { REPO_CARD_ICON_BTN, REPO_CARD_ICON_BTN_ACTIVE } from './smartRepositoryTheme';

type RepositoryNotePinButtonProps = {
    note: GlobalNote;
    /** يزامن note.isPinned مع بطاقة التثبيت حتى لا يبقى شارة ذهبية بعد الإلغاء */
    onSyncNotePinned?: (note: GlobalNote, pinned: boolean) => void;
};

/** تثبيت المسودة في بطاقة التثبيت بالواجهة الرئيسية — مصدر واحد للحقيقة */
export function RepositoryNotePinButton({ note, onSyncNotePinned }: RepositoryNotePinButtonProps) {
    const pinItem = useMemo(() => buildNoteWorkspacePin(note), [note]);
    const pinned = useWorkspaceStore((s) =>
        pinItem ? s.isPinned(pinItem.id, pinItem.type) : false,
    );
    const togglePin = useWorkspaceStore((s) => s.togglePin);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!pinItem) {
                SmartToast.error('تعذّر تثبيت هذه المسودة');
                return;
            }
            const next = !pinned;
            togglePin(pinItem);
            if (note.isPinned !== next) {
                onSyncNotePinned?.({ ...note, isPinned: next }, next);
            }
            SmartToast.success(
                next
                    ? 'ثُبّتت في بطاقة التثبيت بالواجهة'
                    : 'أُلغي التثبيت من الواجهة',
            );
        },
        [note, onSyncNotePinned, pinItem, pinned, togglePin],
    );

    if (!pinItem) return null;

    return (
        <button
            type="button"
            onClick={handleClick}
            onPointerDown={(e) => e.stopPropagation()}
            className={pinned ? REPO_CARD_ICON_BTN_ACTIVE : REPO_CARD_ICON_BTN}
            aria-label={pinned ? 'إلغاء التثبيت من الواجهة' : 'تثبيت في بطاقة التثبيت'}
            title={
                pinned
                    ? 'إلغاء التثبيت من بطاقة التثبيت بالواجهة'
                    : 'تثبيت في بطاقة التثبيت بالواجهة الرئيسية'
            }
            aria-pressed={pinned}
            data-testid={`repository-note-pin-${note.id}`}
        >
            <Pin size={13} className={pinned ? 'fill-current' : undefined} aria-hidden />
        </button>
    );
}

export function useNotepadWorkspacePinnedIds(): Set<string> {
    const key = useWorkspaceStore((s) =>
        s.pinnedItems
            .filter((p) => p.type === 'notepad')
            .map((p) => p.id)
            .sort()
            .join('\0'),
    );
    return useMemo(() => new Set(key ? key.split('\0') : []), [key]);
}
