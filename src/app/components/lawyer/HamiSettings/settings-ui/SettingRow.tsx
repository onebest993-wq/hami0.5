import React, { memo, useCallback, useId, useMemo, useRef } from 'react';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { SETTING_ICON_BOX, SETTING_ROW_BORDER } from './tokens';

function withRowAriaLabelledBy(action: React.ReactNode, labelId: string): React.ReactNode {
    if (!React.isValidElement(action)) return action;
    const props = action.props as Record<string, unknown>;
    const hasAriaLabel = typeof props['aria-label'] === 'string' && String(props['aria-label']).trim();
    const hasAriaLabelledBy =
        typeof props['aria-labelledby'] === 'string' && String(props['aria-labelledby']).trim();
    if (hasAriaLabel || hasAriaLabelledBy) return action;
    return React.cloneElement(action, {
        'aria-labelledby': labelId,
    } as Record<string, unknown>);
}

export const SettingRow = memo(function SettingRow({
    icon: Icon,
    label,
    subLabel,
    action,
    isLast,
    disabled,
}: {
    icon: LucideIcon;
    label: string;
    subLabel?: string;
    action: React.ReactNode;
    isLast?: boolean;
    disabled?: boolean;
}) {
    const labelId = useId();
    const actionHostRef = useRef<HTMLDivElement>(null);
    const commitRef = useRef(false);

    const activateRowSwitch = useCallback(
        (event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
            if (disabled) return;
            if (typeof event.button === 'number' && event.button !== 0) return;
            const target = event.target;
            if (target instanceof Element && target.closest('[role="switch"]')) return;
            const sw = actionHostRef.current?.querySelector('[role="switch"]');
            if (!(sw instanceof HTMLButtonElement) || sw.getAttribute('aria-disabled') === 'true') return;
            event.preventDefault();
            event.stopPropagation();
            if (event.type === 'click' && commitRef.current) {
                commitRef.current = false;
                return;
            }
            if (event.type === 'pointerdown') {
                commitRef.current = true;
            }
            sw.click();
        },
        [disabled],
    );

    const labelledAction = useMemo(() => withRowAriaLabelledBy(action, labelId), [action, labelId]);

    return (
        <div
            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[48px] touch-manipulation ${!isLast ? SETTING_ROW_BORDER : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onPointerDown={activateRowSwitch}
            onClick={activateRowSwitch}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className={`${SETTING_ICON_BOX} text-[#E6C673]/80`}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0">
                    <div id={labelId} className="text-[13px] font-medium text-white/95 truncate">
                        {label}
                    </div>
                    {subLabel ? (
                        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{subLabel}</p>
                    ) : null}
                </div>
            </div>
            <div ref={actionHostRef} className="relative z-[2] shrink-0">
                {labelledAction}
            </div>
        </div>
    );
});
