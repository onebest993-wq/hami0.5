import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SparkNudge } from '@/app/spark/types';
import { SparkMark } from '@/app/spark/ui/SparkMark';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';

export type SparkSmartHeaderChipProps = {
    nudge: SparkNudge;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFollow?: () => void;
    onLater?: () => void;
    onDismiss?: () => void;
};

type PopoverCoords = {
    top: number;
    right: number;
    width: number;
};

const POPOVER_MAX_WIDTH_PX = 352;
const POPOVER_EDGE_GAP_PX = 12;

function measurePopoverCoords(anchor: HTMLElement): PopoverCoords {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(window.innerWidth - POPOVER_EDGE_GAP_PX * 2, POPOVER_MAX_WIDTH_PX);
    const right = Math.max(
        POPOVER_EDGE_GAP_PX,
        Math.min(window.innerWidth - rect.right, window.innerWidth - width - POPOVER_EDGE_GAP_PX),
    );
    return {
        top: rect.bottom + 8,
        right,
        width,
    };
}

export function SparkSmartHeaderChip({
    nudge,
    open,
    onOpenChange,
    onFollow,
    onLater,
    onDismiss,
}: SparkSmartHeaderChipProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [popoverCoords, setPopoverCoords] = useState<PopoverCoords | null>(null);

    const handleToggle = useCallback(() => {
        onOpenChange(!open);
    }, [onOpenChange, open]);

    const updatePopoverCoords = useCallback(() => {
        const anchor = rootRef.current;
        if (!anchor) return;
        setPopoverCoords(measurePopoverCoords(anchor));
    }, []);

    useLayoutEffect(() => {
        if (!open) {
            setPopoverCoords(null);
            return;
        }
        updatePopoverCoords();
    }, [open, updatePopoverCoords, nudge.id, nudge.message]);

    useEffect(() => {
        if (!open) return undefined;

        const handleReposition = () => updatePopoverCoords();

        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [open, updatePopoverCoords]);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event: PointerEvent) => {
            const root = rootRef.current;
            const target = event.target as Node;
            if (root?.contains(target)) return;
            const portal = document.getElementById('spark-smart-header-popover');
            if (portal?.contains(target)) return;
            onOpenChange(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onOpenChange(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onOpenChange, open]);

    const popover =
        open && popoverCoords && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      id="spark-smart-header-popover"
                      className="fixed z-[260] rounded-xl border border-[#E6C673]/22 bg-[#0A0F1C]/98 p-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.62)] ring-1 ring-white/10 backdrop-blur-xl"
                      style={{
                          top: popoverCoords.top,
                          right: popoverCoords.right,
                          width: popoverCoords.width,
                      }}
                      role="dialog"
                      aria-label="تنبيه السكرتير الذكي"
                  >
                      <SparkSmartBadge
                          nudge={nudge}
                          onFollow={onFollow}
                          onLater={onLater}
                          onDismiss={onDismiss}
                          layout="popover"
                      />
                  </div>,
                  document.body,
              )
            : null;

    return (
        <div ref={rootRef} className="relative shrink-0" dir="rtl">
            <button
                type="button"
                onClick={handleToggle}
                data-testid="spark-smart-header-chip"
                aria-label="تنبيه من السكرتير الذكي"
                aria-expanded={open}
                aria-haspopup="dialog"
                title="تنبيه من السكرتير الذكي"
                className="relative inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 text-[#E6C673]/92 shadow-[0_0_16px_-3px_rgba(230,198,115,0.62)] ring-1 ring-[#E6C673]/20 transition-all hover:bg-[#E6C673]/16 hover:shadow-[0_0_20px_-2px_rgba(230,198,115,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
            >
                <SparkMark size={15} />
                <span
                    className="absolute -top-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-[#E6C673] ring-2 ring-[#0A0F1C] shadow-[0_0_8px_rgba(230,198,115,0.85)] animate-pulse"
                    aria-hidden
                />
            </button>
            {popover}
        </div>
    );
}
