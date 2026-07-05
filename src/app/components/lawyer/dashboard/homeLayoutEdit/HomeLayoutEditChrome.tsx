import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RotateCcw, X } from 'lucide-react';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { HOME_LAYOUT_DEFAULTS } from '@/app/services/settings/homeLayout';
import { HOME_BLOCK_LABELS } from '@/app/services/settings/homeBlockLabels';
import { useSettingsPatches } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useHomeLayoutEdit } from './HomeLayoutEditContext';
import { HomeBlockCustomizer } from './HomeBlockCustomizer';
import { HAMI_SHELL_CONTAINER } from '../lawyerShellLayout';

export function HomeLayoutEditChrome() {
    const { isEditing, selectedBlockId, setSelectedBlockId, exitEditMode } = useHomeLayoutEdit();
    const { settings } = useLawyerSettings();
    const { patchHomeLayout, patchBlockOverride } = useSettingsPatches();

    if (!isEditing || typeof document === 'undefined') return null;

    const selectedOverride = selectedBlockId ? settings.homeLayout.overrides[selectedBlockId] : undefined;
    const selectedLabel = selectedBlockId ? HOME_BLOCK_LABELS[selectedBlockId] : '';

    const resetAll = () => {
        patchHomeLayout({ ...HOME_LAYOUT_DEFAULTS, overrides: {} });
        setSelectedBlockId(null);
        SmartToast.success('تمت إعادة الواجهة للافتراضي');
    };

    const editBar = createPortal(
        <div className="hami-home-edit-bar fixed inset-x-0 z-[140] pointer-events-none" data-testid="home-layout-edit-bar">
            <div className={`${HAMI_SHELL_CONTAINER} hami-shell-gutter-x mx-auto pointer-events-auto`}>
                <div className="flex items-center justify-between gap-3 rounded-full border border-white/[0.07] bg-[#0A0C12]/90 backdrop-blur-xl px-3 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.38)] ring-1 ring-inset ring-white/[0.04]">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E6C673] shadow-[0_0_8px_rgba(230,198,115,0.55)]" aria-hidden />
                        <span className="text-[11px] font-semibold text-white/90 truncate">تخصيص الواجهة</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={resetAll}
                            aria-label="إعادة الافتراضي"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-white/55 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
                        >
                            <RotateCcw size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={exitEditMode}
                            data-testid="home-layout-edit-done"
                            aria-label="إنهاء التخصيص"
                            className="flex h-8 items-center gap-1 rounded-full bg-[#E6C673] px-3 text-[11px] font-bold text-[#0A0C12] hover:bg-[#F0D890] transition-colors"
                        >
                            <Check size={14} strokeWidth={2.5} />
                            تم
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );

    const customizeSheet =
        selectedBlockId
            ? createPortal(
                  <AnimatePresence>
                      {selectedBlockId ? (
                          <>
                              <motion.button
                                  type="button"
                                  key="home-layout-customizer-backdrop"
                                  data-testid="home-layout-customizer-backdrop"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 z-[160] bg-black/55 backdrop-blur-[2px]"
                                  aria-label="إغلاق"
                                  onClick={() => setSelectedBlockId(null)}
                              />
                              <motion.div
                                  key="home-layout-customizer-sheet"
                                  data-testid="home-layout-customizer-sheet"
                                  initial={{ y: '100%' }}
                                  animate={{ y: 0 }}
                                  exit={{ y: '100%' }}
                                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                                  className="fixed inset-x-0 bottom-0 z-[161] hami-shell-gutter-x pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
                              >
                                  <div
                                      className={`${HAMI_SHELL_CONTAINER} pointer-events-auto rounded-t-[1.75rem] border border-white/[0.1] bg-[#0B0E16]/96 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)] overflow-hidden`}
                                  >
                                      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
                                          <div>
                                              <p className="text-sm font-bold text-white">{selectedLabel}</p>
                                          </div>
                                          <button
                                              type="button"
                                              onClick={() => setSelectedBlockId(null)}
                                              className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/70"
                                              aria-label="إغلاق"
                                          >
                                              <X size={18} />
                                          </button>
                                      </div>
                                      <div className="px-5 py-4 max-h-[min(52vh,420px)] overflow-y-auto scrollbar-hide">
                                          <HomeBlockCustomizer
                                              blockId={selectedBlockId}
                                              override={selectedOverride}
                                              onChange={(partial) => patchBlockOverride(selectedBlockId, partial)}
                                              compact
                                          />
                                      </div>
                                  </div>
                              </motion.div>
                          </>
                      ) : null}
                  </AnimatePresence>,
                  document.body,
              )
            : null;

    return (
        <>
            {editBar}
            {customizeSheet}
        </>
    );
}
