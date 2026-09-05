import React from 'react';

/** حجز ارتفاع بطاقة الشبكة — يطابق estimateRowSize=260 تقريباً، بلا نبض وبلا تدرج البطاقة الحيّة. */
export const LAWSUIT_ARCHIVE_GRID_PAINT_SLOT_CLASS =
    'min-h-[260px] rounded-[1.15rem] border border-white/[0.1] bg-white/[0.035]';

/** حجز صف مدمج — نفس إطار الصف الحي بدون hover. */
export const LAWSUIT_ARCHIVE_COMPACT_PAINT_SLOT_CLASS =
    'min-h-[72px] rounded-xl border border-white/10 bg-[#151825]';

/** هيكل بطاقة صامت — يحجز المكان حتى تُفكّ الإضابير. ليس بيانات وهمية. */
export function LawsuitArchiveCardPaintSlot({
    compact = false,
}: {
    compact?: boolean;
}): React.ReactElement {
    return (
        <div
            className={
                compact
                    ? LAWSUIT_ARCHIVE_COMPACT_PAINT_SLOT_CLASS
                    : LAWSUIT_ARCHIVE_GRID_PAINT_SLOT_CLASS
            }
            aria-hidden
            data-testid={
                compact
                    ? 'lawsuit-archive-compact-paint-slot'
                    : 'lawsuit-archive-card-paint-slot'
            }
        />
    );
}
