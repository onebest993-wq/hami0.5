import React from 'react';
import type { ProfileCanvasMaterial } from '@/app/services/profile/profilePageTypes';
import { safeProfileCssBackgroundImage } from '@/app/services/profile/profileUrlSanitize';

type ProfileTextCanvasMaterialStackProps = {
    material: ProfileCanvasMaterial;
    accentColor: string;
    backgroundColor: string;
    backgroundImage?: string;
    mini?: boolean;
};

/** طبقة واحدة فقط — بلا grain/sheen/bevel/depth المتراكمة */
export function ProfileTextCanvasMaterialStack({
    material,
    accentColor,
    backgroundColor,
    backgroundImage,
    mini = false,
}: ProfileTextCanvasMaterialStackProps) {
    const safeBgImage = safeProfileCssBackgroundImage(backgroundImage);
    const style = {
        '--canvas-accent': accentColor,
        '--canvas-bg': backgroundColor,
    } as React.CSSProperties;

    return (
        <div
            className={`profile-text-canvas-material-stack${mini ? ' profile-text-canvas-material-stack--mini' : ''}`}
            data-material={material}
            data-lite-stack="true"
            style={style}
            aria-hidden
        >
            <div
                className="profile-text-canvas__material-base"
                style={
                    safeBgImage
                        ? ({
                              backgroundImage: safeBgImage,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                          } as React.CSSProperties)
                        : undefined
                }
            />
        </div>
    );
}
