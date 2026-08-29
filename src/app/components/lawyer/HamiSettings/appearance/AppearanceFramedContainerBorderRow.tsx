import React from 'react';
import { Toggle } from '../settings-ui/index';

export function AppearanceFramedContainerBorderRow({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (enabled: boolean) => void;
}) {
    const activateRow = (event: React.MouseEvent | React.PointerEvent) => {
        if ('button' in event && typeof event.button === 'number' && event.button !== 0) return;
        const target = event.target;
        if (target instanceof Element && target.closest('[role="switch"]')) return;
        event.preventDefault();
        event.stopPropagation();
        onChange(!checked);
    };

    return (
        <div
            className="hami-appearance-framed-toggle-row mb-3 min-h-[44px] touch-manipulation"
            data-testid="appearance-block-container-border-row"
            onPointerDown={activateRow}
            onClick={(event) => {
                const target = event.target;
                if (target instanceof Element && target.closest('[role="switch"]')) return;
                event.preventDefault();
                event.stopPropagation();
            }}
        >
            <span className="text-[11px] font-bold text-white/80">إطار الحاويات</span>
            <Toggle
                label="إطار الحاويات"
                testId="settings-toggle-appearance-block-containerBorder"
                checked={checked}
                onChange={onChange}
            />
        </div>
    );
}
