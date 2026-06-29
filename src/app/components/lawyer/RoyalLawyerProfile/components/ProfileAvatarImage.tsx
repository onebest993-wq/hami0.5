import React from 'react';

type ProfileAvatarImageProps = {
    src: string;
    alt?: string;
    className?: string;
    fit?: 'cover' | 'contain';
    style?: React.CSSProperties;
};

/** صورة — تصحيح اتجاه EXIF؛ cover للشخصية، contain للغلاف */
export function ProfileAvatarImage({
    src,
    alt = '',
    className = '',
    fit = 'cover',
    style,
}: ProfileAvatarImageProps) {
    const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
    return (
        <img
            src={src}
            alt={alt}
            decoding="async"
            referrerPolicy="no-referrer"
            style={style}
            className={`block w-full h-full ${fitClass} object-center [image-orientation:from-image] ${className}`}
        />
    );
}
