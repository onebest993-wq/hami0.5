import React, { useCallback, useRef } from 'react';
import { GripHorizontal, Palette } from 'lucide-react';
import { useLawyerSettingsHomeLayout } from '@/app/context/LawyerSettingsContext';
import { useSettingsPatches } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';

type EditableDockShellProps = {
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    dockCount: number;
    containerBorderOn?: boolean;
};

/** إطار حاوية الدوك — تخصيص + سحب عمودي في وضع التحرير */
export function EditableDockShell({
    className = '',
    style,
    children,
    dockCount,
    containerBorderOn = true,
}: EditableDockShellProps) {
    const { isEditing, selectedBlockId, setSelectedBlockId } = useHomeLayoutEdit();
    const { overrides } = useLawyerSettingsHomeLayout();
    const { patchBlockOverride } = useSettingsPatches();
    const dragStartRef = useRef<{ y: number; lift: number } | null>(null);
    const customizerActive = selectedBlockId === 'dockShell';
    const liftPx = overrides.dockShell?.dockLiftPx ?? 0;

    const openCustomizer = useCallback(
        (e: React.PointerEvent | React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setSelectedBlockId(customizerActive ? null : 'dockShell');
        },
        [customizerActive, setSelectedBlockId],
    );

    const onLiftDragPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!isEditing) return;
            e.stopPropagation();
            e.preventDefault();
            dragStartRef.current = { y: e.clientY, lift: liftPx };

            const onMove = (ev: PointerEvent) => {
                const start = dragStartRef.current;
                if (!start) return;
                ev.preventDefault();
                const delta = start.y - ev.clientY;
                const next = Math.max(-80, Math.min(140, Math.round(start.lift + delta)));
                patchBlockOverride('dockShell', { dockLiftPx: next });
            };

            const onUp = () => {
                dragStartRef.current = null;
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            };

            window.addEventListener('pointermove', onMove, { passive: false });
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [isEditing, liftPx, patchBlockOverride],
    );

    if (!isEditing) {
        return (
            <div
                data-hami-block="dockShell"
                data-hami-dock-count={dockCount}
                data-hami-block-border={containerBorderOn ? '1' : '0'}
                data-testid="home-dock-shell"
                className={className}
                style={style}
            >
                {children}
            </div>
        );
    }

    return (
        <div className={`relative ${customizerActive ? 'z-[130]' : ''}`}>
            <div
                data-hami-block="dockShell"
                data-hami-dock-count={dockCount}
                data-hami-block-border={containerBorderOn ? '1' : '0'}
                className={`${className} ${
                    customizerActive
                        ? 'ring-1 ring-[#E6C673]/55 shadow-[0_0_0_1px_rgba(230,198,115,0.15)]'
                        : 'ring-1 ring-white/10'
                }`}
                style={style}
            >
                {children}
            </div>

            <button
                type="button"
                aria-label="سحب حاوية الشريط السفلي"
                onPointerDown={onLiftDragPointerDown}
                className="absolute left-1/2 -top-5 z-[127] flex -translate-x-1/2 touch-none cursor-grab active:cursor-grabbing pointer-events-auto items-center justify-center rounded-full border border-[#E6C673]/25 bg-[#0A0C12]/85 px-3 py-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
                <GripHorizontal size={14} className="text-[#E6C673]/75" aria-hidden />
            </button>

            <div className="absolute -top-1 -right-1 z-[128] pointer-events-auto">
                <button
                    type="button"
                    aria-label="تخصيص حاوية الشريط السفلي"
                    aria-pressed={customizerActive}
                    onClick={openCustomizer}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border touch-none backdrop-blur-md transition-all active:scale-95 ${
                        customizerActive
                            ? 'border-[#E6C673] bg-[#E6C673] text-[#0A0C12] shadow-[0_0_20px_rgba(230,198,115,0.35)]'
                            : 'border-[#E6C673]/30 bg-[#0A0C12]/75 text-[#E6C673]/85 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                    }`}
                >
                    <Palette size={12} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}
