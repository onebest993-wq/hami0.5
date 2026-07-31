import React, { useEffect, useState } from 'react';
import { sanitizeProfileMediaUrl } from '@/app/services/profile/profileUrlSanitize';

type ProfileAvatarImageProps = {
    src: string;
    alt?: string;
    className?: string;
    fit?: 'cover' | 'contain';
    style?: React.CSSProperties;
    /** true = loading=lazy لبلاط المعرض؛ false للصورة الشخصية النشطة */
    lazy?: boolean;
    /** عند فشل الرابط أو غيابه */
    fallback?: React.ReactNode;
};

/** هوية الوسائط بلا query — لا تستخدم data: كامل كمفتاح React */
export function profileMediaIdentity(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:')) {
        const comma = trimmed.indexOf(',');
        const meta = (comma >= 0 ? trimmed.slice(0, comma) : trimmed.slice(0, 48)).slice(0, 64);
        const payloadLen = comma >= 0 ? trimmed.length - comma - 1 : 0;
        let hash = 0;
        const sampleStart = Math.max(0, trimmed.length - 48);
        for (let i = sampleStart; i < trimmed.length; i += 1) {
            hash = (hash * 33 + trimmed.charCodeAt(i)) >>> 0;
        }
        return `${meta}:L${payloadLen}:h${hash.toString(16)}`;
    }
    try {
        const base =
            typeof window !== 'undefined' ? window.location.href : 'https://hami.local/';
        const parsed = new URL(trimmed, base);
        return `${parsed.origin}${parsed.pathname}`;
    } catch {
        return trimmed.split('?')[0] ?? trimmed;
    }
}

/**
 * صورة فورية — بلا بوابة Image()/opacity.
 * الخلفية الداكنة تحت الصورة تمنع ومضة شفافة أثناء فك التشفير.
 */
export function ProfileAvatarImage({
    src,
    alt = '',
    className = '',
    fit = 'cover',
    style,
    lazy = false,
    fallback = null,
}: ProfileAvatarImageProps) {
    const safeSrc = sanitizeProfileMediaUrl(src) ?? '';
    const [failed, setFailed] = useState(false);
    const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

    useEffect(() => {
        setFailed(false);
    }, [safeSrc]);

    if (!safeSrc || failed) {
        return <>{fallback}</>;
    }

    return (
        <span className="relative block w-full h-full bg-[#0A0F1C]">
            <img
                key={profileMediaIdentity(safeSrc) || safeSrc}
                src={safeSrc}
                alt={alt}
                decoding="async"
                loading={lazy ? 'lazy' : 'eager'}
                referrerPolicy="no-referrer"
                style={style}
                onError={() => setFailed(true)}
                className={`relative z-[1] block w-full h-full ${fitClass} object-center [image-orientation:from-image] ${className}`}
            />
        </span>
    );
}
