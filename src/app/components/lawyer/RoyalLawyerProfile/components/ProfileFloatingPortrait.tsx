import React from 'react';

type ProfileFloatingPortraitProps = {
    children: React.ReactNode;
    className?: string;
    /** @deprecated لم يعد هناك حركة عائمة — يُتجاهل للتوافق */
    paused?: boolean;
};

/** إطار دائري ثابت — بلا Motion مستمر وبلا blur ثقيل */
export function ProfileFloatingPortrait({
    children,
    className = '',
}: ProfileFloatingPortraitProps) {
    return (
        <div data-profile-portrait-float className={`relative ${className}`}>
            <div
                className="absolute inset-x-3 bottom-0 h-[55%] rounded-full translate-y-3 scale-95 bg-black/35 opacity-50"
                aria-hidden
            />
            <div data-profile-portrait-shell className="relative inline-block">
                <div data-profile-portrait-ornament aria-hidden />
                <div className="absolute -inset-1 rounded-full hami-profile-portrait-ring opacity-80" aria-hidden />
                <div className="relative w-[124px] h-[124px] rounded-full overflow-hidden border-[3px] hami-profile-portrait-frame bg-[#0A0F1C]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/15 pointer-events-none z-[1]" />
                    <div className="relative w-full h-full">{children}</div>
                </div>
            </div>
        </div>
    );
}
