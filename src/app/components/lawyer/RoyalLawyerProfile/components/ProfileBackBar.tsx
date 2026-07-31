import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';

type ProfileBackBarProps = {
    onBack: () => void;
};

/**
 * زر رجوع أصلي — pointerdown يُغلق فوراً (مثل هيدر الملف) بلا انتظار click.
 */
export function ProfileBackBar({ onBack }: ProfileBackBarProps) {
    const armedRef = useRef(false);

    return (
        <div
            className="fixed z-[60] left-4 pointer-events-none"
            style={{ top: 'max(0.75rem, calc(env(safe-area-inset-top) + 0.5rem))' }}
        >
            <button
                type="button"
                onClick={() => {
                    if (armedRef.current) {
                        armedRef.current = false;
                        return;
                    }
                    onBack();
                }}
                onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    armedRef.current = true;
                    onBack();
                }}
                onLostPointerCapture={() => {
                    armedRef.current = false;
                }}
                onPointerCancel={() => {
                    armedRef.current = false;
                }}
                aria-label="العودة للرئيسية"
                data-testid="lawyer-profile-back"
                className="pointer-events-auto flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-black/55 backdrop-blur-xl border border-white/15 shadow-lg touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45"
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
                <ArrowRight size={18} className="hami-profile-accent-text" aria-hidden />
            </button>
        </div>
    );
}
