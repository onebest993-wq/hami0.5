import { useLayoutEffect, useState } from 'react';
import {
    hasLawyerDashboardFirstTabOpenedThisBoot,
    onLawyerDashboardFirstTabOpen,
} from '@/app/bootstrap/lawyerDashboardFirstTabMark';

/** يصبح true بعد first-tab-open لهذه الدورة — لتأجيل hooks ثقيلة لا تحجب أول طلاء المنزل. */
export function useAfterFirstTabOpen(): boolean {
    const [open, setOpen] = useState(hasLawyerDashboardFirstTabOpenedThisBoot);

    useLayoutEffect(() => {
        if (open) return;
        return onLawyerDashboardFirstTabOpen(() => {
            setOpen(true);
        });
    }, [open]);

    return open;
}
