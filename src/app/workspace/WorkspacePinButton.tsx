import React from 'react';
import { Pin } from '@/app/components/ui/icons/Pin';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { isClusterPinEligibleType, type WorkspacePinnedItem } from './types';
import { workspacePinVisual } from './workspacePinVisuals';

type WorkspacePinButtonProps = {
    item: WorkspacePinnedItem;
    /** عدد الروابط المتوقعة في أقسام أخرى (معاينة قبل التثبيت) */
    relatedLinkCount?: number;
    className?: string;
    size?: number;
    /** ghost = أيقونة بطاقة الأرشيف بلا صندوق ذهبي/ملوّن */
    variant?: 'typed' | 'ghost';
};

/** زر تثبيت مستقل — لا يمس schemas الأقسام */
export const WorkspacePinButton: React.FC<WorkspacePinButtonProps> = ({
    item,
    relatedLinkCount,
    className = '',
    size = 16,
    variant = 'typed',
}) => {
    const pinned = useWorkspaceStore((s) => s.isPinned(item.id, item.type));
    const togglePin = useWorkspaceStore((s) => s.togglePin);

    if (!isClusterPinEligibleType(item.type)) {
        return null;
    }

    const visual = workspacePinVisual(item.type);
    const isGhost = variant === 'ghost';

    const pinTitle = pinned
        ? 'إلغاء التثبيت'
        : relatedLinkCount && relatedLinkCount > 0
          ? `تثبيت — ${relatedLinkCount} ارتباط`
          : 'تثبيت الإضبارة في الواجهة';

    const typedClass = pinned
        ? `${visual.button} ${visual.accent}`
        : `${visual.button} opacity-80 hover:opacity-100 text-white/60 hover:text-white`;
    const ghostClass = pinned
        ? `${visual.accent} hover:bg-white/10`
        : 'text-white/45 hover:text-white hover:bg-white/10';

    return (
        <button
            type="button"
            title={pinTitle}
            aria-label={pinned ? 'إلغاء تثبيت البطاقة' : 'تثبيت الإضبارة'}
            aria-pressed={pinned}
            data-testid={`workspace-pin-${item.type}-${item.id}`}
            onClick={(e) => {
                e.stopPropagation();
                togglePin(item);
            }}
            className={`shrink-0 inline-flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-lg transition-colors touch-manipulation ${
                isGhost ? ghostClass : `border ${typedClass}`
            } ${className}`}
        >
            <Pin size={size} strokeWidth={2} className={pinned ? 'fill-current' : undefined} />
        </button>
    );
};
