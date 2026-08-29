import { useCallback, useEffect, useRef, useState } from 'react';
import {
    computeAnchoredMenuPosition,
    useAnchoredMenuPosition,
    type AnchoredMenuPosition,
} from './useAnchoredMenuPosition';

/** قائمة الخيارات + إعادة ضبط عند تبديل المهمة — منطق تفاعلي بلا JSX */
export function useTaskCardChrome(taskId: string) {
    const [branchOpen, setBranchOpen] = useState(false);
    const [addStepOpen, setAddStepOpen] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [optionsMenuSeed, setOptionsMenuSeed] = useState<AnchoredMenuPosition | null>(null);
    const optionsAnchorRef = useRef<HTMLButtonElement>(null);
    const menuPos = useAnchoredMenuPosition(optionsOpen, optionsAnchorRef, optionsMenuSeed);

    const closeOptionsMenu = useCallback(() => {
        setOptionsOpen(false);
        setOptionsMenuSeed(null);
    }, []);

    const toggleOptionsMenu = useCallback(() => {
        setOptionsOpen((open) => {
            if (open) {
                setOptionsMenuSeed(null);
                return false;
            }
            const el = optionsAnchorRef.current;
            if (el) {
                setOptionsMenuSeed(computeAnchoredMenuPosition(el.getBoundingClientRect()));
            }
            return true;
        });
    }, []);

    useEffect(() => {
        setBranchOpen(false);
        setAddStepOpen(false);
        setOptionsOpen(false);
        setOptionsMenuSeed(null);
    }, [taskId]);

    useEffect(() => {
        if (!optionsOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (optionsAnchorRef.current?.contains(target)) return;
            const menu = document.getElementById(`tasks-task-options-menu-${taskId}`);
            if (menu?.contains(target)) return;
            closeOptionsMenu();
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [optionsOpen, taskId, closeOptionsMenu]);

    return {
        branchOpen,
        setBranchOpen,
        addStepOpen,
        setAddStepOpen,
        optionsOpen,
        optionsAnchorRef,
        menuPos,
        closeOptionsMenu,
        toggleOptionsMenu,
    };
}
