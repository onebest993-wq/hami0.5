import { personalPearlHubTheme } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import { SMART_MODAL_MOTION_FADE_ENTER } from '../smartFile/smartModalMotionClasses';
import {
    LV_BTN_GOLD,
    LV_INSET,
    LV_RADIUS,
} from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';

export const GLASS_TRIGGER =
    `w-full min-h-[44px] px-3 py-2 ${LV_RADIUS} border border-[#E6C673]/18 bg-[#0A0F1C] hover:bg-[#12182a] hover:border-[#E6C673]/30 flex flex-col items-center justify-center gap-1 transition-colors text-center`;
export const GLASS_OVERLAY =
    "fixed inset-0 z-[260] bg-[#03050B]/68 font-['Tajawal'] pointer-events-auto";
export const GLASS_SHELL =
    `w-full h-full flex flex-col bg-[#080C16] overflow-hidden ${SMART_MODAL_MOTION_FADE_ENTER} pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`;
export const GLASS_HEADER =
    'relative px-4 sm:px-6 py-2.5 border-b border-white/[0.07] bg-[#0A0F1C] flex justify-between items-center shrink-0';
const GLASS_BODY =
    'flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 sm:px-6 py-3 space-y-3 max-w-[min(96vw,56rem)] w-full mx-auto bg-[#080C16]';
export const GLASS_FIELD =
    `w-full min-w-0 ${LV_INSET} rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-[#E6C673]/32 focus:bg-white/[0.05] transition-colors [color-scheme:dark]`;
const GLASS_LABEL = 'text-xs font-semibold text-white/48 mb-2 block';
const GLASS_SECTION = `rounded-xl ${LV_INSET} p-3`;
export const GLASS_BTN =
    `w-full py-3.5 rounded-xl ${LV_BTN_GOLD} text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0`;

export type SessionHubTheme = {
    trigger: string;
    overlay: string;
    shell: string;
    header: string;
    body: string;
    field: string;
    label: string;
    section: string;
    btn: string;
    accentText: string;
    accentIcon: string;
    footerBar: string;
};

export function hubTheme(
    variant: 'civil' | 'personal' = 'civil',
    _layoutMode: 'default' | 'personal-pearl' = 'default',
): SessionHubTheme {
    if (variant === 'personal') return personalPearlHubTheme();
    return {
        trigger: GLASS_TRIGGER,
        overlay: GLASS_OVERLAY,
        shell: GLASS_SHELL,
        header: GLASS_HEADER,
        body: GLASS_BODY,
        field: GLASS_FIELD,
        label: GLASS_LABEL,
        section: GLASS_SECTION,
        btn: GLASS_BTN,
        accentText: 'text-[#E6C673]',
        accentIcon: 'text-[#E6C673]',
        footerBar:
            'px-4 sm:px-6 lg:px-8 py-2.5 border-t border-white/[0.06] shrink-0 bg-[#080C16]',
    };
}
