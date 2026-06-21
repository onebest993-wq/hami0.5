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

    if (!isEditing) return null;

    const selectedOverride = selectedBlockId ? settings.homeLayout.overrides[selectedBlockId] : undefined;
    const selectedLabel = selectedBlockId ? HOME_BLOCK_LABELS[selectedBlockId] : '';

    const resetAll = () => {
        patchHomeLayout({ ...HOME_LAYOUT_DEFAULTS, overrides: {} });
        setSelectedBlockId(null);
        SmartToast.success('تمت إعادة الواجهة للافتراضي');
    };

    const customizeSheet =
        typeof document !== 'undefined' && selectedBlockId
            ? createPortal(
                  <AnimatePresence>
                      <>
                          <motion.button
                              type="button"
                              key="home-layout-customizer-backdrop"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[160] bg-black/55 backdrop-blur-[2px]"
                              aria-label="إغلاق"
                              onClick={() => setSelectedBlockId(null)}
                          />
                          <motion.div
                              key="home-layout-customizer-sheet"
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
                                          <p className="text-[10px] text-white/40 mt-0.5">خصّص هذا القسم</p>
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
                  </AnimatePresence>,
                  document.body,
              )
            : null;

    return (
        <>
            <div className="fixed top-[84px] inset-x-0 z-[90] hami-shell-gutter-x pointer-events-none">
                <div className={`${HAMI_SHELL_CONTAINER} pointer-events-auto`}>
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-[#E6C673]/25 bg-[#0A0C12]/92 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                        <p className="text-xs font-bold text-[#E6C673] shrink-0">وضع التخصيص</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={resetAll}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-white/65 border border-white/10 hover:bg-white/[0.05]"
                            >
                                <RotateCcw size={13} />
                                إعادة
                            </button>
                            <button
                                type="button"
                                onClick={exitEditMode}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[#0A0C12] bg-[#E6C673] hover:bg-[#F0D890]"
                            >
                                <Check size={14} />
                                تم
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-white/40 text-center mt-2 pointer-events-none">
                        تخصيص يسار · اسحب ≡ لرفع الدوك · حاوية الدوك من أيقونة اللون · Esc للإلغاء
                    </p>
                </div>
            </div>
            {customizeSheet}
        </>
    );
}
