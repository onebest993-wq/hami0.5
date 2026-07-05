import React, { useCallback, useRef } from 'react';
import { Palette } from 'lucide-react';
import { useLawyerSettingsHomeLayout } from '@/app/context/LawyerSettingsContext';
import { useSettingsPatches } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';
import { HomeLayoutWidgetEditChrome } from './homeLayoutEditUi';

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

    const openCustomizer = useCallback(() => {
        setSelectedBlockId(customizerActive ? null : 'dockShell');
    }, [customizerActive, setSelectedBlockId]);

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
                        ? 'ring-1 ring-[#E6C673]/40'
                        : 'ring-1 ring-white/[0.05]'
                }`}
                style={style}
            >
                {children}
            </div>

            <HomeLayoutWidgetEditChrome
                dragLabel="سحب حاوية الشريط السفلي"
                onDragPointerDown={onLiftDragPointerDown}
                paletteActive={customizerActive}
                paletteLabel="تخصيص حاوية الشريط السفلي"
                onPaletteClick={openCustomizer}
            />
        </div>
    );
}
