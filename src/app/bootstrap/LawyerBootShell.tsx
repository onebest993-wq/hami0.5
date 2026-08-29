import React from 'react';
import { HamiBootOverlay } from '@/app/bootstrap/HamiBootOverlay';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { shouldMountReactBootOverlay } from '@/app/bootstrap/bootStaticShell';

/**
 * غلاف أثناء انتظار التهيئة قبل أول كشف.
 * مع #hami-static-boot: الطبقة الثابتة هي السطح الصامت — هنا خلفية فقط عند الحاجة.
 */
export function LawyerBootShell(): React.ReactElement {
    if (isBootRevealDone() || !shouldMountReactBootOverlay()) {
        return (
            <div
                className="min-h-screen w-full hami-board-canvas-bg"
                data-testid="lawyer-boot-shell-frozen"
                aria-busy="true"
                aria-label="جاري التهيئة"
            />
        );
    }
    return <HamiBootOverlay phase="visible" />;
}
