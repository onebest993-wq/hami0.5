import React from 'react';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import {
    buildProfileContactTarget,
    resolveLocationMode,
} from '@/app/services/profile/profileContactNavigation';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { Copy, ChevronLeft, MapPin } from 'lucide-react';
import { ActionIcon } from './ActionIcon';
import { withAllowedClipboardAction } from '@/app/runtime/screenshotDeterrentRuntime';

type ProfileContactChannelProps = {
    action: ProfileAction;
};

const channelClassName =
    'group flex items-center gap-3 hami-profile-contact-channel border text-right w-full no-underline text-inherit touch-manipulation min-h-[44px]';

async function copyValue(value: string) {
    try {
        await withAllowedClipboardAction(async () => {
            await navigator.clipboard.writeText(value);
        });
        SmartToast.success('تم النسخ');
    } catch {
        SmartToast.error('تعذر النسخ');
    }
}

export function ProfileContactChannel({ action }: ProfileContactChannelProps) {
    const isManualLocation =
        action.type === 'location' && resolveLocationMode(action) === 'manual';
    const isGpsLocation = action.type === 'location' && resolveLocationMode(action) === 'gps';
    const target = buildProfileContactTarget(action);

    const handleInvalid = () => {
        SmartToast.error('بيانات التواصل غير صالحة — عدّلها من «تعديل»');
    };

    const copyControl = (
        <button
            type="button"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation text-white/22 hover:text-[color:color-mix(in_srgb,var(--profile-accent)_60%,transparent)]"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void copyValue(action.value);
            }}
            aria-label="نسخ"
        >
            <Copy size={14} aria-hidden />
        </button>
    );

    const body = (
        <>
            <div className="hami-profile-contact-icon group-hover:scale-105 transition-transform">
                <ActionIcon type={action.type} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate text-white/92">{action.label}</p>
                <p className="text-[10px] text-white/42 truncate mt-0.5 tracking-wide">{action.value}</p>
                {isGpsLocation ? (
                    <p className="text-[9px] text-white/30 mt-1 flex items-center gap-1">
                        <MapPin size={10} aria-hidden />
                        اضغط لفتح الخرائط
                    </p>
                ) : null}
                {isManualLocation ? (
                    <p className="text-[9px] text-white/30 mt-1">اضغط للبحث في الخرائط</p>
                ) : null}
            </div>
            <ChevronLeft
                size={16}
                className="text-white/18 group-hover:text-[color:color-mix(in_srgb,var(--profile-accent)_55%,transparent)] transition-colors shrink-0"
                aria-hidden
            />
        </>
    );

    const openControl = !target ? (
        <button type="button" onClick={handleInvalid} className={channelClassName}>
            {body}
        </button>
    ) : target.startsWith('http://') || target.startsWith('https://') ? (
        <a
            href={target}
            target="_blank"
            rel="noopener noreferrer"
            className={channelClassName}
        >
            {body}
        </a>
    ) : (
        <a href={target} className={channelClassName}>
            {body}
        </a>
    );

    return (
        <div className="flex items-stretch gap-1" data-testid="profile-contact-channel-row">
            <div className="min-w-0 flex-1">{openControl}</div>
            {copyControl}
        </div>
    );
}
