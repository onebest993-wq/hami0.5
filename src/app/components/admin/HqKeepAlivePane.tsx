import React from 'react';
import { HqPaneActiveContext } from '@/app/components/admin/hqPaneActive';

/**
 * سطح تبويب المقر: مخفي بالكامل عندما لا يكون نشطاً — بلا تغيير بصري للتبويب الظاهر.
 * يمرّر النشاط لأدوات المزامنة حتى لا تُجلب التبويبات المخفية ثم تُحدَّث عند الإظهار.
 */
export function HqKeepAlivePane({
    active,
    children,
}: {
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <HqPaneActiveContext.Provider value={active}>
            <div
                hidden={!active}
                aria-hidden={!active}
                {...(!active ? ({ inert: '' } as React.HTMLAttributes<HTMLDivElement>) : null)}
            >
                {children}
            </div>
        </HqPaneActiveContext.Provider>
    );
}
