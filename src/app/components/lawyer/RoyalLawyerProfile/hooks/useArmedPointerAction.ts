import React, { useRef } from 'react';
import { isPrimaryDragPointer } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

type ArmedPointerOptions = {
    /**
     * غطاء الفتح فقط: نفّذ من pointerdown قبل زوال الطبقة.
     * الشجرة الحية: click — pointerdown كان يغلق الملف من تحريك Playwright/الماوس على الكروم.
     */
    armOnPointerDown?: boolean;
};

export function useArmedPointerAction(action: () => boolean | void, options?: ArmedPointerOptions) {
    const armedRef = useRef(false);
    const armOnPointerDown = options?.armOnPointerDown === true;
    return {
        onClick: () => {
            if (armedRef.current) {
                armedRef.current = false;
                return;
            }
            action();
        },
        onPointerDown: (event: React.PointerEvent) => {
            if (!armOnPointerDown || !isPrimaryDragPointer(event)) return;
            const ok = action();
            /* لا تبتلع الـ click إن رُفض الفعل (مثلاً استوديو يحفظ) */
            armedRef.current = ok !== false;
        },
        onPointerCancel: () => {
            armedRef.current = false;
        },
    };
}
