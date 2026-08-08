import React from 'react';

type LawyerHomeAmbientProps = {
    wallpaperActive?: boolean;
};

/** طبقة خلفية اختيارية عند وجود خلفية مخصّصة فقط — الزخرفة على البطاقات */
export function LawyerHomeAmbient({ wallpaperActive = false }: LawyerHomeAmbientProps) {
    if (!wallpaperActive) return null;

    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, transparent 40%)',
                }}
            />
        </div>
    );
}
