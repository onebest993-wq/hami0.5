import React from 'react';
import { HomeArrowRightIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import './profileChrome.css';

type ProfileInstantShellProps = {
    onBack?: () => void;
    /** داخل تبويب يملك التمرير — لا قفل جسم إضافي */
    embedded?: boolean;
};

/**
 * قشرة فورية للملف المهني (نمط Forum/Schedule InstantShell) —
 * تغطي فجوة Suspense وتثبّت الهندسة قبل chunk RoyalLawyerProfile.
 */
export function ProfileInstantShell({
    onBack,
    embedded = false,
}: ProfileInstantShellProps): React.ReactElement {
    useBodyScrollLock(Boolean(onBack) && !embedded);

    return (
        <div
            className="hami-profile-instant-shell"
            dir="rtl"
            data-testid="profile-instant-shell"
            data-profile-instant-shell="1"
            role="dialog"
            aria-modal={!embedded}
            aria-label="الملف المهني"
            aria-busy="true"
            style={embedded ? undefined : { pointerEvents: onBack ? undefined : 'none' }}
        >
            {onBack ? (
                <div className="hami-profile-instant-back">
                    <button
                        type="button"
                        onClick={onBack}
                        className="hami-profile-instant-back-btn"
                        aria-label="العودة للرئيسية"
                        data-testid="profile-instant-shell-back"
                    >
                        <HomeArrowRightIcon size={18} />
                    </button>
                </div>
            ) : null}

            <div className="hami-profile-instant-hero" aria-hidden>
                <div className="hami-profile-instant-avatar" />
                <div className="hami-profile-instant-name" />
                <div className="hami-profile-instant-actions">
                    <div className="hami-profile-instant-chip" />
                    <div className="hami-profile-instant-chip" />
                </div>
            </div>

            <div className="hami-profile-instant-section" aria-hidden>
                <div className="hami-profile-instant-row" />
                <div className="hami-profile-instant-row" />
                <div className="hami-profile-instant-row" />
            </div>

            <span className="sr-only">جاري فتح الملف المهني</span>
        </div>
    );
}
