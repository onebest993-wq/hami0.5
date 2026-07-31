import React from 'react';

/** SVG مطابق لشكل lucide Palette — بلا سحب vendor-lucide إلى HomeTab */
function PaletteIcon({ size = 13, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
    );
}

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
    onDragTouchStart,
    dragHandleHidden,
    onPaletteClick,
    paletteActive,
    paletteLabel,
    span,
    onSpanChange,
    showSpan,
}: {
    dragLabel: string;
    onDragPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onDragTouchStart?: (e: React.TouchEvent<HTMLButtonElement>) => void;
    /** إخفاء بصري فقط — المقبض يبقى في DOM للحفاظ على capture */
    dragHandleHidden?: boolean;
    onPaletteClick: () => void;
    paletteActive: boolean;
    paletteLabel: string;
    span?: 1 | 2;
    onSpanChange?: (span: 1 | 2) => void;
    showSpan?: boolean;
}) {
    return (
        <div
            className="hami-edit-widget-chrome pointer-events-auto"
            style={dragHandleHidden ? { opacity: 0 } : undefined}
        >
            <button
                type="button"
                aria-label={dragLabel}
                onPointerDown={onDragPointerDown}
                onTouchStart={onDragTouchStart}
                className="hami-edit-widget-drag touch-none select-none cursor-grab active:cursor-grabbing"
                style={{
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'none',
                    /* أثناء السحب يبقى قابلاً لاستقبال الأحداث حتى لا يُلغى capture */
                    pointerEvents: 'auto',
                }}
            >
                <span className="hami-edit-widget-drag-dots" aria-hidden />
            </button>
            <div
                className="hami-edit-widget-actions"
                style={dragHandleHidden ? { pointerEvents: 'none' } : undefined}
            >
                {showSpan && span && onSpanChange ? (
                    <HomeLayoutSpanToggle value={span} onChange={onSpanChange} />
                ) : null}
                <button
                    type="button"
                    aria-label={paletteLabel}
                    aria-pressed={paletteActive}
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onPaletteClick();
                    }}
                    className={`hami-edit-palette-btn ${paletteActive ? 'is-active' : ''}`}
                >
                    <PaletteIcon size={13} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}
