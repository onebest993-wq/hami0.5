/**
 * رادار المواعيد — لؤلؤي / أوف وايت / بيج فاتح
 * لون التوازن: ضباب حجري بارد (stone-mist) — بلا ذهبي/أصفر.
 */
export const RADAR_PEARL = '#FAF7F2';
export const RADAR_CREAM = '#F5EDE0';
export const RADAR_IVORY = '#E8DCC8';
export const RADAR_BEIGE = '#EDE4D6';
/** توازن بارد ناعم ضد الكاكاوي — ليس ذهباً */
export const RADAR_MIST = '#9AADB0';
export const RADAR_MIST_SOFT = '#B7C5C7';

/** توافق خلفي — مراجع قديمة تُشير لـ sage تُعاد توجيهها للـ mist */
export const RADAR_SAGE = RADAR_MIST;
export const RADAR_SAGE_SOFT = RADAR_MIST_SOFT;

export const RADAR_PAGE =
    'hami-radar-page flex flex-col h-full min-h-[100dvh] overflow-hidden relative isolate ' +
    'bg-[#1f1712] text-[#F5EDE0]';

export const RADAR_SCROLL =
    'hami-radar-scroll flex-1 overflow-y-auto scrollbar-hide p-4 pb-3 relative z-[1] bg-[#1f1712]';

/** زر إضافة فقط — بلا حاوية ضخمة؛ safe-area خفيف */
export const RADAR_ADD_DOCK =
    'hami-radar-add-dock shrink-0 relative z-[3] px-4 pt-1.5 ' +
    'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-[#1f1712]';

export const RADAR_HEADER =
    'flex items-center justify-between px-4 py-3.5 sticky top-0 z-50 ' +
    'bg-[#241c16] ' +
    'border-b border-[#E8DCC8]/14 shadow-[0_4px_24px_rgba(20,16,12,0.4)]';

export const RADAR_MONTH_NAV =
    'hami-radar-glass-panel flex flex-nowrap items-center justify-between gap-2 sm:gap-3 mb-4 px-3 py-2.5 rounded-2xl ' +
    'border border-[#E8DCC8]/16 bg-[#2d2219]/55 backdrop-blur-lg ' +
    'shadow-[inset_0_1px_0_rgba(250,247,242,0.08)]';

export const RADAR_GLASS_PANEL =
    'hami-radar-glass-panel rounded-2xl border border-[#F5EDE0]/14 bg-[#2d2219]/55 ' +
    'backdrop-blur-md backdrop-saturate-125 ' +
    'shadow-[0_8px_28px_rgba(20,16,12,0.38),inset_0_1px_0_rgba(250,247,242,0.07)]';

export const RADAR_CALENDAR_SHELL =
    'hami-radar-glass-panel relative overflow-hidden rounded-3xl border border-[#E8DCC8]/14 ' +
    'bg-[#2d2219]/50 backdrop-blur-2xl backdrop-saturate-150 ' +
    'shadow-[0_12px_48px_rgba(20,16,12,0.5),inset_0_1px_0_rgba(250,247,242,0.08)]';

export const RADAR_INPUT =
    'w-full bg-[#1f1712]/75 border border-[#F5EDE0]/14 rounded-xl px-3 py-2.5 ' +
    'text-[#F5EDE0] text-sm placeholder:text-[#E8DCC8]/40 outline-none transition-all ' +
    'focus:border-[#B7C5C7]/55 focus:ring-1 focus:ring-[#9AADB0]/22';

export const RADAR_LABEL = 'block text-[#E8DCC8]/90 text-[11px] font-bold mb-1.5';

/**
 * زر أساسي — سطح كاكاوي مرتفع + نص لؤلؤي صريح.
 * (الخلفية الفاتحة كانت تطمس النص مع وراثة text-white / cream من الصفحة)
 */
export const RADAR_BTN_GOLD =
    'flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all touch-manipulation ' +
    'bg-[#3a3028] border border-[#E8DCC8]/40 text-[#FAF7F2] ' +
    'hover:bg-[#463b32] hover:border-[#B7C5C7]/45 ' +
    'shadow-[0_10px_24px_rgba(12,8,6,0.4),inset_0_1px_0_rgba(250,247,242,0.12)] ' +
    '[&_svg]:text-[#FAF7F2]';

export const RADAR_BTN_GHOST =
    'flex min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all touch-manipulation ' +
    'bg-[#F5EDE0]/[0.07] border border-[#E8DCC8]/22 text-[#E8DCC8]/92 ' +
    'hover:text-[#FAF7F2] hover:border-[#B7C5C7]/40 hover:bg-[#9AADB0]/14';

export const RADAR_BTN_GHOST_ACTIVE =
    'flex min-h-[44px] items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all touch-manipulation ' +
    'bg-[#F5EDE0]/[0.12] border border-[#E8DCC8]/35 text-[#FAF7F2] ' +
    'shadow-[0_0_14px_rgba(154,173,176,0.14)]';

/** تنبيه — بيج فاتح شفاف + إطار لؤلؤي + لمسة mist للتوازن */
export const RADAR_ALERT_PANEL =
    'rounded-xl border border-[#E8DCC8]/28 bg-[#2a241e]/94 p-3 text-[#F5EDE0] ' +
    'shadow-[0_8px_24px_rgba(20,12,10,0.3),inset_0_1px_0_rgba(250,247,242,0.07)]';

export const RADAR_ALERT_ICON = 'text-[#B7C5C7]';
export const RADAR_ALERT_TEXT = 'text-[#FAF7F2]/95';
export const RADAR_ALERT_MUTED = 'text-[#E8DCC8]/78';

export const RADAR_DEADLINE_PANEL =
    'rounded-xl border border-[#E8DCC8]/22 bg-[#F5EDE0]/[0.07] px-3 py-2 text-right';

export const RADAR_DEADLINE_TEXT = 'text-[#EDE4D6]';

export const RADAR_CHIP =
    'inline-flex max-w-full items-center gap-1 rounded-full border border-[#E8DCC8]/26 ' +
    'bg-[#FAF7F2]/[0.08] px-2 py-0.5 text-[10px] text-[#E8DCC8]';

export const RADAR_FORM_OVERLAY =
    'fixed inset-0 z-[99999] bg-[#14100c]/94 backdrop-blur-[3px] flex items-end sm:items-center justify-center';

export const RADAR_ICON_GOLD = 'text-[#B7C5C7]';
export const RADAR_ICON_ACCENT = 'text-[#9AADB0]';
