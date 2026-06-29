import React from 'react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import {
    buildProfileContactTarget,
    resolveLocationMode,
} from '@/app/services/profile/profileContactNavigation';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { Copy, ChevronLeft, MapPin } from 'lucide-react';
import { ActionIcon } from './ActionIcon';

type ProfileContactChannelProps = {
    action: ProfileAction;
};

const channelClassName =
    'group flex items-center gap-3 hami-profile-contact-channel border text-right w-full no-underline text-inherit';

export function ProfileContactChannel({ action }: ProfileContactChannelProps) {
    const isManualLocation =
        action.type === 'location' && resolveLocationMode(action) === 'manual';
    const isGpsLocation = action.type === 'location' && resolveLocationMode(action) === 'gps';
    const target = buildProfileContactTarget(action);

    const handleInvalid = () => {
        SmartToast.error('بيانات التواصل غير صالحة — عدّلها من «تعديل»');
    };

    const inner = (
        <>
            <div className="hami-profile-contact-icon group-hover:scale-105 transition-transform">
                <ActionIcon type={action.type} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate text-white/92">{action.label}</p>
                <p className="text-[10px] text-white/42 truncate mt-0.5 tracking-wide">{action.value}</p>
                {isGpsLocation ? (
                    <p className="text-[9px] text-white/30 mt-1 flex items-center gap-1">
                        <MapPin size={10} />
                        اضغط لفتح الخرائط
                    </p>
                ) : null}
                {isManualLocation ? (
                    <p className="text-[9px] text-white/30 mt-1">اضغط للبحث في الخرائط</p>
                ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-white/22 group-hover:text-[color:color-mix(in_srgb,var(--profile-accent)_60%,transparent)]"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void navigator.clipboard.writeText(action.value);
                        SmartToast.success('تم النسخ');
                    }}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        e.stopPropagation();
                        void navigator.clipboard.writeText(action.value);
                        SmartToast.success('تم النسخ');
                    }}
                    aria-label="نسخ"
                >
                    <Copy size={14} />
                </span>
                <ChevronLeft
                    size={16}
                    className="text-white/18 group-hover:text-[color:color-mix(in_srgb,var(--profile-accent)_55%,transparent)] transition-colors"
                    aria-hidden
                />
            </div>
        </>
    );

    if (!target) {
        return (
            <button type="button" onClick={handleInvalid} className={channelClassName}>
                {inner}
            </button>
        );
    }

    if (action.type === 'website') {
        return (
            <a
                href={target}
                target="_blank"
                rel="noopener noreferrer"
                className={channelClassName}
            >
                {inner}
            </a>
        );
    }

    return (
        <a href={target} className={channelClassName}>
            {inner}
        </a>
    );
}
