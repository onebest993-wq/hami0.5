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
            <div className="profile-text-canvas__material-grain" />
            <div className="profile-text-canvas__material-sheen" />
            <div className="profile-text-canvas__material-bevel" />
            <div className="profile-text-canvas__material-depth" />
        </div>
    );
}
