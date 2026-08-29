import React, { type ReactNode } from 'react';
import {
    FORUM_PUBLISH_FAB,
    FORUM_PUBLISH_FAB_DISABLED,
    FORUM_PUBLISH_FAB_ICON,
    FORUM_PUBLISH_FAB_LABEL,
    FORUM_PUBLISH_FAB_SLOT,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';

type ForumPublishFabProps = {
    label: string;
    testId: string;
    onClick: () => void;
    disabled?: boolean;
    onPointerEnter?: () => void;
    icon: ReactNode;
};

/** زر النشر/الرفع/الإنشاء — نفس الكروم الذهبي فوق الطبقة */
export function ForumPublishFab({
    label,
    testId,
    onClick,
    disabled = false,
    onPointerEnter,
    icon,
}: ForumPublishFabProps) {
    return (
        <div className={FORUM_PUBLISH_FAB_SLOT} data-testid="forum-publish-fab-slot">
            <button
                type="button"
                data-testid={testId}
                onClick={onClick}
                onPointerEnter={onPointerEnter}
                className={`pointer-events-auto ${disabled ? FORUM_PUBLISH_FAB_DISABLED : FORUM_PUBLISH_FAB}`}
                disabled={disabled}
                aria-disabled={disabled || undefined}
                aria-label={label}
            >
                <span className={FORUM_PUBLISH_FAB_ICON}>{icon}</span>
                <span className={FORUM_PUBLISH_FAB_LABEL}>{label}</span>
            </button>
        </div>
    );
}
