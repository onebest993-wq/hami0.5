import React, { useEffect } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { resolveBlockCanvasStyle } from '@/app/services/profile/profilePageCustomization';
import { ensureProfileCanvasFxLoadedSync } from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';
import { ProfileTextCanvasShell } from './profileTextCanvas/ProfileTextCanvasShell';

export type ProfileTextCanvasProps = {
    block: ProfileCustomBlock;
    children: React.ReactNode;
    previewInteractive?: boolean;
};

export function ProfileTextCanvas({ block, children, previewInteractive = false }: ProfileTextCanvasProps) {
    const canvas = resolveBlockCanvasStyle(block);
    const storedInteraction = canvas.interaction ?? 'none';
    const interaction = previewInteractive ? storedInteraction : 'none';
    const hasInteraction = interaction !== 'none';
    const enabled = canvas.enabled || hasInteraction;

    useEffect(() => {
        if (!enabled) return;
        ensureProfileCanvasFxLoadedSync(hasInteraction ? { interaction } : {});
    }, [enabled, hasInteraction, interaction]);

    if (!enabled) {
        return <>{children}</>;
    }

    return (
        <ProfileTextCanvasShell blockId={block.id} canvas={canvas} previewInteractive={previewInteractive}>
            {children}
        </ProfileTextCanvasShell>
    );
}
