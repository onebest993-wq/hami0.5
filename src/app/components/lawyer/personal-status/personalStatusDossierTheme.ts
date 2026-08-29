/**
 * إضبارة الأحوال الشخصية — شريط علوي نحيف بلا زينة
 */

import { HUB_DOSSIER_MODAL_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';

export const PS_TEXT = 'text-white/90';

export const PS_CHROME_BAR =
    'h-11 w-full shrink-0 print:hidden border-b border-white/[0.08] bg-[#0B1021]';

export const PS_STAGE_RAIL =
    'w-full print:hidden border-b border-white/[0.07] bg-[#0B1021]';

export const PS_CHROME_ICON_BTN =
    'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.04] text-white/70 hover:text-white hover:border-white/[0.18] hover:bg-white/[0.07] transition-colors touch-manipulation';

export const PS_CHROME_TRASH_BTN_IDLE = PS_CHROME_ICON_BTN;

export const PS_CHROME_TRASH_BTN_ACTIVE =
    'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/[0.18] bg-white/[0.08] text-white transition-colors touch-manipulation';

export const PS_STAGE_PILL_ACTIVE =
    'border border-white/[0.18] bg-white/[0.08] text-white/90';

export const PS_STAGE_PILL_IDLE =
    'border border-white/[0.08] bg-transparent text-white/50 hover:border-white/[0.14] hover:text-white/80';

export const PS_STAGE_PILL_PAST =
    'border border-white/[0.05] text-white/35';

export const PS_LAW_OVERLAY =
    `fixed inset-0 ${HUB_DOSSIER_MODAL_Z_CLASS} bg-[#101018]/94 font-['Tajawal'] pointer-events-auto`;

export const PS_TAB_ACTIVE =
    'border-white/[0.18] bg-white/[0.08] text-white/90';

export const PS_TAB_IDLE =
    'border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/[0.14] hover:text-white/80';
