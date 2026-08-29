import { useCallback, useState } from 'react';
import {
    findActionAnchorInTree,
    findContainerAnchorInTree,
    findSubItemAnchorInTree,
    type ProceduralContainer,
} from '../../proceduralContainersEngine';

export function useProceduralCanvasFocus(containers: ProceduralContainer[]) {
    const [navExpandIds, setNavExpandIds] = useState<Set<string>>(() => new Set());
    const [focusActionId, setFocusActionId] = useState<string | null>(null);
    const [focusNoteId, setFocusNoteId] = useState<string | null>(null);

    const focusActionInCanvas = useCallback(
        (actionId: string) => {
            const anchor = findActionAnchorInTree(containers, actionId);
            if (!anchor) return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            setFocusActionId(actionId);
            window.setTimeout(() => {
                const el = document.getElementById(`procedural-action-${actionId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            window.setTimeout(() => setFocusActionId(null), 1000);
        },
        [containers],
    );

    const focusNoteInCanvas = useCallback(
        (noteId: string) => {
            const anchor = findSubItemAnchorInTree(containers, noteId);
            if (!anchor || anchor.itemType !== 'note') return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            setFocusNoteId(noteId);
            window.setTimeout(() => {
                document.getElementById(`procedural-note-${noteId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            window.setTimeout(() => setFocusNoteId(null), 1000);
        },
        [containers],
    );

    const focusContainerInCanvas = useCallback(
        (containerId: string) => {
            const anchor = findContainerAnchorInTree(containers, containerId);
            if (!anchor) return;
            setNavExpandIds(new Set(anchor.expandContainerIds));
            window.setTimeout(() => {
                document.getElementById(`procedural-container-${containerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
        },
        [containers],
    );

    return {
        navExpandIds,
        setNavExpandIds,
        focusActionId,
        focusNoteId,
        focusActionInCanvas,
        focusNoteInCanvas,
        focusContainerInCanvas,
    };
}
