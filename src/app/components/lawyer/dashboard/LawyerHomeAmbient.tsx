import React from 'react';

type LawyerHomeAmbientProps = {
    wallpaperActive?: boolean;
};

/** طبقة خلفية ثابتة — بدون حركة أو grain (أداء أفضل عند التمرير) */
export function LawyerHomeAmbient({ wallpaperActive = false }: LawyerHomeAmbientProps) {
    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={{
                    background: wallpaperActive
                        ? 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 40%)'
                        : 'linear-gradient(to bottom, color-mix(in srgb, var(--hami-surface-bg, #0B1021) 55%, transparent) 0%, transparent 55%)',
                }}
            />
        </div>
    );
}
