import React, { useEffect } from 'react';
import { Pin } from 'lucide-react';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { isClusterPinEligibleType, type WorkspacePinnedItem } from './types';
import { workspacePinVisual } from './workspacePinVisuals';

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
    const pinned = useWorkspaceStore((s) => s.isPinned(item.id, item.type));
    const togglePin = useWorkspaceStore((s) => s.togglePin);

    if (!isClusterPinEligibleType(item.type)) {
        return null;
    }

    const visual = workspacePinVisual(item.type);

    const pinTitle = pinned
        ? 'إلغاء التثبيت'
        : relatedLinkCount && relatedLinkCount > 0
          ? `تثبيت — ${relatedLinkCount} ارتباط`
          : 'تثبيت الإضبارة في الواجهة';

    useEffect(() => {
        //#region debug-point nested-button-warning-pin-button
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'nested-button-warning',
                runId: 'post-fix',
                hypothesisId: 'A',
                location: 'WorkspacePinButton.tsx:render',
                msg: '[DEBUG] WorkspacePinButton rendered native button',
                data: {
                    itemId: item.id,
                    itemType: item.type,
                    pinned,
                    interactiveTag: 'button',
                },
                ts: Date.now(),
            }),
        }).catch(() => undefined);
        //#endregion debug-point nested-button-warning-pin-button
    }, [item.id, item.type, pinned]);

    return (
        <button
            type="button"
            title={pinTitle}
            aria-label={pinned ? 'إلغاء تثبيت البطاقة' : 'تثبيت الإضبارة'}
            onClick={(e) => {
                e.stopPropagation();
                togglePin(item);
            }}
            className={`shrink-0 w-8 h-8 flex items-center justify-center border transition-colors ${
                pinned
                    ? `${visual.button} ${visual.accent}`
                    : `${visual.button} opacity-80 hover:opacity-100 text-white/60 hover:text-white`
            } ${className}`}
        >
            <Pin size={size} className={pinned ? 'fill-current' : undefined} />
        </button>
    );
};
