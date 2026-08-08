import React, { memo, useRef } from 'react';
import type { HomeStemIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';

export type HeaderToolbarIconComponent = HomeStemIcon;

export type HeaderToolbarIconProps = {
    icon: HeaderToolbarIconComponent;
    label: string;
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
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
                onPointerDown?.();
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
            className="group relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-[1.1rem] flex items-center justify-center touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C] active:scale-[0.97] transition-transform duration-75"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
            <span
                className="absolute inset-0 rounded-[1.1rem] transition-colors duration-200 pointer-events-none"
                style={{
                    background: active
                        ? 'color-mix(in srgb, var(--hami-primary, #E6C673) 14%, rgba(255,255,255,0.05))'
                        : 'rgba(255,255,255,0.04)',
                    border: active
                        ? '1px solid color-mix(in srgb, var(--hami-primary, #E6C673) 35%, transparent)'
                        : '1px solid rgba(255,255,255,0.09)',
                    boxShadow: active
                        ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px color-mix(in srgb, var(--hami-primary, #E6C673) 12%, transparent)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.07)',
                }}
                aria-hidden
            />
            <Icon
                size={19}
                strokeWidth={active || accent ? 2.1 : 1.75}
                className={`relative z-[1] ${
                    accent || active ? 'text-[#E6C673]' : 'text-white/88 group-hover:text-[#E6C673]'
                }`}
                style={{
                    filter: accent || active ? 'drop-shadow(0 0 10px rgba(230,198,115,0.35))' : undefined,
                }}
                aria-hidden
            />
            {badge}
        </button>
    );
});
