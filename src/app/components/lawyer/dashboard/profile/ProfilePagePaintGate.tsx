import React, { Suspense, type ReactNode } from 'react';
import { ProfileOpenFirstPage } from '@/app/components/lawyer/dashboard/profile/ProfileOpenFirstPage';
import { useProfilePageLivePaint } from '@/app/components/lawyer/dashboard/profile/useProfilePageLivePaint';

type ProfilePagePaintGateProps = {
    open: boolean;
    userId: string | null;
    onBack: () => void;
    children: ReactNode;
};

/** إطار العرض الكامل — غلاف الشجرة الحية كان auto فيُظهر سطح #020408 تحت الصفحة. */
const PROFILE_PAINT_SLOT_CLASS = 'h-full min-h-[100dvh]';

/**
 * مثل بوابة رادار الجدول: الصفحة الكاملة فوق Suspense.
 * الشجرة الحية تُركَّب تحت الغطاء وتُعتمد دون استبدال شكل الصفحة.
 */
export function ProfilePagePaintGate({
    open,
    userId,
    onBack,
    children,
}: ProfilePagePaintGateProps): React.ReactElement {
    const live = useProfilePageLivePaint(open);

    return (
        <div className={`relative ${PROFILE_PAINT_SLOT_CLASS}`}>
            <div
                aria-hidden={!live}
                className={
                    live
                        ? PROFILE_PAINT_SLOT_CLASS
                        : `${PROFILE_PAINT_SLOT_CLASS} pointer-events-none invisible`
                }
            >
                <Suspense fallback={null}>{children}</Suspense>
            </div>
            {open && !live ? (
                <div className="absolute inset-0 z-[2] overflow-y-auto">
                    <ProfileOpenFirstPage userId={userId} onBack={onBack} />
                </div>
            ) : null}
        </div>
    );
}
