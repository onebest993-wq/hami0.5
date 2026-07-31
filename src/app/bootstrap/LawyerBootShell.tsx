import React from 'react';
import { HamiBootOverlay } from '@/app/bootstrap/HamiBootOverlay';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { shouldMountReactBootOverlay } from '@/app/bootstrap/bootStaticShell';

/**
 * غلاف أثناء انتظار المستخدم/التهيئة قبل أول كشف.
 * مع #hami-static-boot: خلفية فقط — الشعار من الطبقة الثابتة.
 */
export function LawyerBootShell(): React.ReactElement {
    if (isBootRevealDone() || !shouldMountReactBootOverlay()) {
        return (
            <div
                className="min-h-screen w-full bg-[#0a0f1c]"
                data-testid="lawyer-boot-shell-frozen"
                aria-busy="true"
                aria-label="تهيئة حامي"
            />
        );
    }
    return <HamiBootOverlay phase="visible" />;
}

export { HamiBootOverlay } from '@/app/bootstrap/HamiBootOverlay';
