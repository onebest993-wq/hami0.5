import React from 'react';
import { HomeMainGrid } from '@/app/components/lawyer/dashboard/HomeMainGrid';
import { HomeWidgetSlotSkeleton } from '@/app/components/lawyer/dashboard/HomeWidgetSlotSkeleton';
import { useHomeMainGridSlots } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';

/**
 * أول طلاء للشبكة — نفس فتحات الإعدادات، بلا بلاطات ثقيلة.
 * يبقى تحت الغطاء الكحلي (data-hami-home-first-paint-layer).
 * الكشف من الشبكة الحية: بلاطات حقيقية + كروم مركز (هيكل محجوز أو بطاقة).
 */
export function HomeMainGridFirstPaint({
    visible = true,
    themePrimary = '#E6C673',
    onActivateWidget,
    bindPointer,
}: {
    visible?: boolean;
    themePrimary?: string;
    onActivateWidget?: (id: HomeWidgetId) => void;
    bindPointer?: (id: HomeWidgetId) => {
        onPointerEnter?: () => void;
        onPointerDown?: () => void;
        onFocus?: () => void;
    };
}): React.ReactElement {
    const { slots, appearance } = useHomeMainGridSlots(themePrimary);

    return (
        <div
            className="hami-home-page-column relative isolate"
            data-testid="lawyer-home-tab-content"
            data-hami-home-first-paint-layer=""
        >
            <HomeMainGrid
                visible={visible}
                slots={slots}
                announcePaint={false}
                renderSlot={(slot) => (
                    <HomeWidgetSlotSkeleton
                        slot={slot}
                        appearance={appearance}
                        themePrimary={themePrimary}
                        onActivate={
                            onActivateWidget ? () => onActivateWidget(slot.id) : undefined
                        }
                        pointerHandlers={bindPointer?.(slot.id)}
                    />
                )}
            />
        </div>
    );
}
