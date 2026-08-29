import {
    useCallback,
    useEffect,
    useLayoutEffect,
    type Dispatch,
    type MutableRefObject,
    type RefObject,
    type SetStateAction,
} from 'react';
import {
    computeFixedPopoverLayout,
    refinePopoverLayoutWithMeasuredHeight,
    type FixedPopoverLayout,
} from '../anchoredPopoverPosition';
import { popoverLayoutsEqual } from './badgeSignalKeys';
import type { PartyInteractiveBadge } from './types';

export function usePartyBadgePopoverChrome(params: {
    openId: string | null;
    setOpenId: Dispatch<SetStateAction<string | null>>;
    isHistoricalMode: boolean;
    btnRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
    popoverRef: RefObject<HTMLDivElement | null>;
    rootRef: RefObject<HTMLDivElement | null>;
    visibleRef: MutableRefObject<PartyInteractiveBadge[]>;
    popoverPos: FixedPopoverLayout | null;
    setPopoverPos: Dispatch<SetStateAction<FixedPopoverLayout | null>>;
}) {
    const {
        openId,
        setOpenId,
        isHistoricalMode,
        btnRefs,
        popoverRef,
        rootRef,
        visibleRef,
        setPopoverPos,
    } = params;

    const updatePopoverPosition = useCallback(() => {
        if (!openId) {
            setPopoverPos((prev) => (prev === null ? prev : null));
            return;
        }
        const btn = btnRefs.current[openId];
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const openBadgeHit = visibleRef.current.find((x) => x.id === openId);
        const lineCount = openBadgeHit?.detailLines?.length ?? 0;
        const isGuarantorForm = openId === 'guarantor_followup';
        const estimatedHeight = isGuarantorForm ? 320 : Math.min(280, 88 + lineCount * 22);
        const base = computeFixedPopoverLayout(r, {
            preferredWidth: 272,
            estimatedHeight,
            gap: 4,
        });
        const el = popoverRef.current;
        const nextLayout = el
            ? refinePopoverLayoutWithMeasuredHeight(base, r, el.offsetHeight, 4)
            : base;
        setPopoverPos((prev) => (popoverLayoutsEqual(prev, nextLayout) ? prev : nextLayout));
    }, [openId, btnRefs, popoverRef, visibleRef, setPopoverPos]);

    useLayoutEffect(() => {
        if (!openId) return;
        updatePopoverPosition();
        const id = requestAnimationFrame(() => updatePopoverPosition());
        return () => cancelAnimationFrame(id);
    }, [openId, updatePopoverPosition]);

    useEffect(() => {
        if (!openId) return;
        const onScrollResize = () => updatePopoverPosition();
        window.addEventListener('scroll', onScrollResize, true);
        window.addEventListener('resize', onScrollResize);
        return () => {
            window.removeEventListener('scroll', onScrollResize, true);
            window.removeEventListener('resize', onScrollResize);
        };
    }, [openId, updatePopoverPosition]);

    useEffect(() => {
        if (!openId) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenId(null);
        };
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t)) return;
            if (popoverRef.current?.contains(t)) return;
            setOpenId(null);
        };
        const onTouch = (e: TouchEvent) => {
            const t = e.target as Node;
            if (rootRef.current?.contains(t)) return;
            if (popoverRef.current?.contains(t)) return;
            setOpenId(null);
        };
        document.addEventListener('mousedown', onDoc, true);
        document.addEventListener('touchstart', onTouch, true);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onDoc, true);
            document.removeEventListener('touchstart', onTouch, true);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [openId, setOpenId, rootRef, popoverRef]);

    useEffect(() => {
        if (isHistoricalMode) setOpenId(null);
    }, [isHistoricalMode, setOpenId]);
}
