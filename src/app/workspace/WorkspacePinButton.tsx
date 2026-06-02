import React from 'react';
import { Pin } from 'lucide-react';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { isClusterPinEligibleType, type WorkspacePinnedItem } from './types';

type WorkspacePinButtonProps = {
    item: WorkspacePinnedItem;
    /** عدد الروابط المتوقعة في أقسام أخرى (معاينة قبل التثبيت) */
    relatedLinkCount?: number;
    className?: string;
    size?: number;
};

/** زر تثبيت مستقل — لا يمس schemas الأقسام */
export const WorkspacePinButton: React.FC<WorkspacePinButtonProps> = ({
    item,
    relatedLinkCount,
    className = '',
    size = 16,
}) => {
    if (!isClusterPinEligibleType(item.type)) {
        return null;
    }

    const pinned = useWorkspaceStore((s) => s.isPinned(item.id, item.type));
    const togglePin = useWorkspaceStore((s) => s.togglePin);

    const pinTitle = pinned
        ? 'إلغاء التثبيت من البطاقة العامة'
        : relatedLinkCount && relatedLinkCount > 0
          ? `تثبيت — ${relatedLinkCount} ارتباط متوقع بأقسام أخرى`
          : 'تثبيت في البطاقة العامة';

    return (
        <button
            type="button"
            title={pinTitle}
            aria-label={pinned ? 'إلغاء التثبيت' : 'تثبيت'}
            onClick={(e) => {
                e.stopPropagation();
                togglePin(item);
            }}
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                pinned
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            } ${className}`}
        >
            <Pin size={size} className={pinned ? 'fill-current' : undefined} />
        </button>
    );
};
