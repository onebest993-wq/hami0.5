import { SMART_FILE_NESTED_MODAL_OVERLAY_CLASS } from '../smartFile/smartFileOverlayZ';

import { SMART_MODAL_MOTION_ZOOM_ENTER } from '../smartFile/smartModalMotionClasses';

export const GLASS_MODAL_OVERLAY = SMART_FILE_NESTED_MODAL_OVERLAY_CLASS;
export const GLASS_MODAL_SHELL =
    `rounded-2xl border border-white/[0.1] bg-[#0A0F1C]/80 backdrop-blur-sm shadow-[0_8px_22px_rgba(0,0,0,0.22)] w-full max-w-lg overflow-hidden ${SMART_MODAL_MOTION_ZOOM_ENTER}`;
export const GLASS_MODAL_HEADER =
    'relative px-4 py-4 border-b border-white/[0.08] bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent flex justify-between items-center';
export const GLASS_FIELD =
    'w-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-white/[0.06] transition-all [color-scheme:dark]';
export const GLASS_BTN =
    'w-full bg-[#E6C673]/15 border border-[#E6C673]/30 text-[#E6C673] py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#E6C673]/25 disabled:opacity-50 disabled:cursor-not-allowed';
export const GLASS_CLOSE =
    'p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: unknown) => void;
}
