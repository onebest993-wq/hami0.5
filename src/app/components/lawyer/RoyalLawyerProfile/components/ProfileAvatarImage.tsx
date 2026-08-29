import React, { memo, useEffect, useState } from 'react';
import { useProfileAvatarDisplaySrc } from '@/app/hooks/useProfileAvatarDisplaySrc';
import { profileMediaIdentity } from '@/app/services/profile/profileMediaIdentity';
import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';
import { imgFetchPriorityAttr } from '@/app/utils/imgFetchPriority';

type ProfileAvatarImageProps = {
    src: string;
    alt?: string;
    className?: string;
    fit?: 'cover' | 'contain';
    style?: React.CSSProperties;
    /** true = loading=lazy لبلاط المعرض؛ false للصورة الشخصية النشطة */
    lazy?: boolean;
    /** أولوية فك/جلب لصورة المنزل الظاهرة فوق الطيّ */
    priority?: boolean;
    /**
     * أقصى حافة لعرض data: الثقيل (مصغّر → blob:).
     * undefined = تلقائي عند الضخامة؛ false = بدون تصغير.
     */
    displayMaxEdge?: number | false;
    /** عند فشل الرابط أو غيابه أو أثناء التحضير */
    fallback?: React.ReactNode;
    /** fade = ظهور تدريجي فوق الحرف — للمنزل فقط */
    reveal?: 'instant' | 'fade';
    onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
};

function preferInstantReveal(reveal: 'instant' | 'fade'): boolean {
    if (reveal !== 'fade') return true;
    if (typeof document === 'undefined') return true;
    const root = document.documentElement;
    if (root.dataset.hamiReduceMotion === '1' || root.dataset.hamiAnimations === '0') return true;
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return true;
    }
}

/**
 * صورة فورية فوق الاحتياطي — أثناء التحضير يبقى الحرف/السابق، لا دائرة فارغة ثم Pop-in.
 */
export const ProfileAvatarImage = memo(function ProfileAvatarImage({
    src,
    alt = '',
    className = '',
    fit = 'cover',
    style,
    lazy = false,
    priority = false,
    displayMaxEdge,
    fallback = null,
    reveal = 'instant',
    onLoad,
}: ProfileAvatarImageProps) {
    const safeSrc = sanitizeProfileMediaUrl(src) ?? '';
    const [failed, setFailed] = useState(false);
    const instant = preferInstantReveal(reveal);
    const [shown, setShown] = useState(instant);
    const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
    const { displaySrc, preparing } = useProfileAvatarDisplaySrc(safeSrc, displayMaxEdge);

    useEffect(() => {
        setFailed(false);
    }, [safeSrc]);

    useEffect(() => {
        setShown(instant);
    }, [displaySrc, instant]);

    if (!safeSrc || failed) {
        return <>{fallback}</>;
    }

    if (preparing || !displaySrc) {
        return fallback ? <>{fallback}</> : null;
    }

    const hideImgUntilDecoded = Boolean(fallback) && !shown;

    return (
        <span className={`relative block w-full h-full${fallback ? '' : ' bg-[#0A0F1C]'}`}>
            {fallback ? <span className="absolute inset-0 z-0">{fallback}</span> : null}
            <img
                key={profileMediaIdentity(safeSrc) || safeSrc}
                src={displaySrc}
                alt={alt}
                decoding={priority ? 'sync' : 'async'}
                loading={lazy ? 'lazy' : 'eager'}
                {...imgFetchPriorityAttr(priority ? 'high' : undefined)}
                referrerPolicy="no-referrer"
                style={{
                    ...style,
                    opacity: shown ? 1 : 0,
                    visibility: hideImgUntilDecoded ? 'hidden' : 'visible',
                    transition: instant ? undefined : 'opacity 160ms linear',
                }}
                onError={() => setFailed(true)}
                onLoad={(event) => {
                    setShown(true);
                    onLoad?.(event);
                }}
                className={`relative z-[1] block w-full h-full ${fitClass} object-center [image-orientation:from-image] ${className}`}
            />
        </span>
    );
});
