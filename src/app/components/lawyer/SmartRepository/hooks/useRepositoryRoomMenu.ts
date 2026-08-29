import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    computeRepositoryRoomMenuPos,
    subscribeVisualViewportLayout,
    type AnchoredPopoverPos,
} from '@/app/components/lawyer/SmartRepository/anchoredPopoverPos';

export function useRepositoryRoomMenu(roomsLength: number) {
    const [roomMenuOpen, setRoomMenuOpen] = useState(false);
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [menuPos, setMenuPos] = useState<AnchoredPopoverPos | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const closeMenu = useCallback(() => {
        setRoomMenuOpen(false);
        setCreatingRoom(false);
    }, []);

    useLayoutEffect(() => {
        if (!roomMenuOpen || !triggerRef.current) {
            setMenuPos(null);
            return;
        }
        const update = () => {
            if (triggerRef.current) setMenuPos(computeRepositoryRoomMenuPos(triggerRef.current));
        };
        update();
        return subscribeVisualViewportLayout(update);
    }, [roomMenuOpen, creatingRoom, roomsLength]);

    useEffect(() => {
        if (!roomMenuOpen) return;
        const onDoc = (e: Event) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            closeMenu();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeMenu();
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('touchstart', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('touchstart', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [closeMenu, roomMenuOpen]);

    return {
        roomMenuOpen,
        setRoomMenuOpen,
        creatingRoom,
        setCreatingRoom,
        menuPos,
        triggerRef,
        menuRef,
        closeMenu,
    };
}
