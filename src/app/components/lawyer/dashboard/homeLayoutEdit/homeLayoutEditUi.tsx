import React from 'react';
import { Palette } from 'lucide-react';

export function HomeLayoutSpanToggle({
    value,
    onChange,
}: {
    value: 1 | 2;
    onChange: (span: 1 | 2) => void;
}) {
    return (
        <div className="hami-edit-span-toggle" role="group" aria-label="عرض البطاقة">
            <button
                type="button"
                aria-pressed={value === 1}
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(1);
                }}
                className={value === 1 ? 'is-active' : ''}
            >
                نصف
            </button>
            <button
                type="button"
                aria-pressed={value === 2}
                onClick={(e) => {
                    e.stopPropagation();
                    onChange(2);
                }}
                className={value === 2 ? 'is-active' : ''}
            >
                كامل
            </button>
        </div>
    );
}

export function HomeLayoutWidgetEditChrome({
    dragLabel,
    onDragPointerDown,
    onPaletteClick,
    paletteActive,
    paletteLabel,
    span,
    onSpanChange,
    showSpan,
}: {
    dragLabel: string;
    onDragPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPaletteClick: () => void;
    paletteActive: boolean;
    paletteLabel: string;
    span?: 1 | 2;
    onSpanChange?: (span: 1 | 2) => void;
    showSpan?: boolean;
}) {
    return (
        <div className="hami-edit-widget-chrome pointer-events-auto">
            <button
                type="button"
                aria-label={dragLabel}
                onPointerDown={onDragPointerDown}
                className="hami-edit-widget-drag touch-none select-none cursor-grab active:cursor-grabbing"
            >
                <span className="hami-edit-widget-drag-dots" aria-hidden />
            </button>
            <div className="hami-edit-widget-actions">
                {showSpan && span && onSpanChange ? (
                    <HomeLayoutSpanToggle value={span} onChange={onSpanChange} />
                ) : null}
                <button
                    type="button"
                    aria-label={paletteLabel}
                    aria-pressed={paletteActive}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPaletteClick();
                    }}
                    className={`hami-edit-palette-btn ${paletteActive ? 'is-active' : ''}`}
                >
                    <Palette size={13} strokeWidth={2} aria-hidden />
                </button>
            </div>
        </div>
    );
}
