import React, { memo, useEffect, useRef } from 'react';
import type { HomeStemIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';

export type HeaderToolbarIconComponent = HomeStemIcon;

export type HeaderToolbarIconProps = {
    icon: HeaderToolbarIconComponent;
    label: string;
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
    /**
     * فتح عند pointerdown — أسرع على اللمس من انتظار click
     * (يمنع شعور «الضغط لم يستجب» مع تأخير الحركة).
     */
    activateOnPointerDown?: boolean;
    active?: boolean;
    accent?: boolean;
    badge?: React.ReactNode;
    testId?: string;
};

/**
 * زر شريط الأدوات — زر أصلي بلا motion gestures
 * (whileTap/whileHover كانت تسرق أحداث اللمس وتؤخر click).
 */
export const HeaderToolbarIcon = memo(function HeaderToolbarIcon({
    icon: Icon,
    label,
    onClick,
    onPointerEnter,
    onPointerDown,
    activateOnPointerDown = false,
    active,
    accent,
    badge,
    testId,
}: HeaderToolbarIconProps) {
    const armedRef = useRef(false);
    const armClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearArm = () => {
        armedRef.current = false;
        if (armClearTimerRef.current) {
            clearTimeout(armClearTimerRef.current);
            armClearTimerRef.current = null;
        }
    };

    useEffect(
        () => () => {
            armedRef.current = false;
            if (armClearTimerRef.current) {
                clearTimeout(armClearTimerRef.current);
                armClearTimerRef.current = null;
            }
        },
        [],
    );

    return (
        <button
            type="button"
            onClick={() => {
                if (activateOnPointerDown && armedRef.current) {
                    clearArm();
                    return;
                }
                onClick();
            }}
            onPointerEnter={onPointerEnter}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                onPointerDown?.(event);
                if (activateOnPointerDown) {
                    armedRef.current = true;
                    onClick();
                    if (armClearTimerRef.current) clearTimeout(armClearTimerRef.current);
                    /* إن لم يصل click (سحب/إلغاء) لا تبقَ الحالة مغلقة على الضغط التالي */
                    armClearTimerRef.current = setTimeout(clearArm, 400);
                }
            }}
            onPointerCancel={clearArm}
            aria-label={label}
            title={label}
            data-testid={testId}
            data-hami-tool-accent={accent || active ? '1' : undefined}
            className="hami-header-tool-btn relative min-w-[48px] min-h-[48px] flex items-center justify-center touch-manipulation outline-none"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
            <Icon
                size={26}
                strokeWidth={accent || active ? 2.15 : 1.85}
                className="hami-header-tool-btn__icon relative z-[1]"
                aria-hidden
            />
            {badge}
        </button>
    );
});
