import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { registerRepositoryChromeDismiss } from './repositoryChromeDismiss';
import {
    computeRepositoryFilterPopoverPos,
    subscribeVisualViewportLayout,
    type AnchoredPopoverPos,
} from '@/app/components/lawyer/SmartRepository/anchoredPopoverPos';

const FILTER_POPOVER_WIDTH = 272;
const FILTER_POPOVER_MAX_H = 320;

export function useVaultClassificationPopover(
    enabled: boolean,
    creating: boolean,
    onDismissCreate?: () => void,
) {
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [filterPanelMounted, setFilterPanelMounted] = useState(false);
    const [filterPanelVisible, setFilterPanelVisible] = useState(false);
    const filterToggleRef = useRef<HTMLButtonElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const [filterMenuPos, setFilterMenuPos] = useState<AnchoredPopoverPos>({
        top: 0,
        left: 0,
        width: FILTER_POPOVER_WIDTH,
        maxHeight: FILTER_POPOVER_MAX_H,
    });
    const filterPopoverOpen = filtersExpanded || creating;

    const closeFilters = useCallback(() => {
        setFiltersExpanded(false);
        onDismissCreate?.();
    }, [onDismissCreate]);

    const toggleFilters = useCallback(() => {
        setFiltersExpanded((open) => {
            if (open) onDismissCreate?.();
            return !open;
        });
    }, [onDismissCreate]);

    const updateFilterMenuPos = useCallback(() => {
        if (!filterToggleRef.current) return;
        setFilterMenuPos(computeRepositoryFilterPopoverPos(filterToggleRef.current));
    }, []);

    useEffect(() => {
        if (!enabled) return;

        if (filterPopoverOpen) {
            setFilterPanelMounted(true);
            const frame = requestAnimationFrame(() => setFilterPanelVisible(true));
            return () => cancelAnimationFrame(frame);
        }

        setFilterPanelVisible(false);
        const timer = window.setTimeout(() => setFilterPanelMounted(false), 240);
        return () => window.clearTimeout(timer);
    }, [enabled, filterPopoverOpen]);

    useLayoutEffect(() => {
        if (!enabled || !filterPanelMounted) return;
        updateFilterMenuPos();
    }, [enabled, filterPanelMounted, updateFilterMenuPos]);

    useEffect(() => {
        if (!enabled || !filterPopoverOpen) return;
        return registerRepositoryChromeDismiss(() => {
            if (creating) {
                onDismissCreate?.();
                return true;
            }
            closeFilters();
            return true;
        });
    }, [closeFilters, creating, enabled, filterPopoverOpen, onDismissCreate]);

    useEffect(() => {
        if (!enabled || !filterPopoverOpen) return;

        const onPointer = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (filterToggleRef.current?.contains(target)) return;
            if (filterMenuRef.current?.contains(target)) return;
            closeFilters();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !creating) closeFilters();
        };
        const onLayout = () => updateFilterMenuPos();

        document.addEventListener('mousedown', onPointer);
        document.addEventListener('touchstart', onPointer);
        window.addEventListener('keydown', onKey);
        const unsubViewport = subscribeVisualViewportLayout(onLayout);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('touchstart', onPointer);
            window.removeEventListener('keydown', onKey);
            unsubViewport();
        };
    }, [closeFilters, creating, enabled, filterPopoverOpen, updateFilterMenuPos]);

    return {
        filterToggleRef,
        filterMenuRef,
        filterMenuPos,
        filterPanelMounted,
        filterPanelVisible,
        filterPopoverOpen,
        closeFilters,
        toggleFilters,
        setFiltersExpanded,
    };
}
