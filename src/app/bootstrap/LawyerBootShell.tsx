import React, { useLayoutEffect } from 'react';
import { HamiBootOverlay } from '@/app/bootstrap/HamiBootOverlay';
import { notifyBootContentReady } from '@/app/bootstrap/bootReveal';

/** غلاف للتوافق — يعرض طبقة «حامي» أثناء انتظار المستخدم/التهيئة */
export function LawyerBootShell(): React.ReactElement {
    useLayoutEffect(() => {
        notifyBootContentReady();
    }, []);

    return <HamiBootOverlay phase="visible" />;
}

export { HamiBootOverlay } from '@/app/bootstrap/HamiBootOverlay';
