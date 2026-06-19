import React from 'react';

type ProfileAvatarImageProps = {
    src: string;
    alt?: string;
    className?: string;
    fit?: 'cover' | 'contain';
};

/** صورة — تصحيح اتجاه EXIF؛ cover للشخصية، contain للغلاف */
export function ProfileAvatarImage({ src, alt = '', className = '', fit = 'cover' }: ProfileAvatarImageProps) {
    const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
    return (
        <img
            src={src}
            alt={alt}
            decoding="async"
            className={`block w-full h-full ${fitClass} object-center [image-orientation:from-image] ${className}`}
        />
    );
}
