import React, { useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen } from '@/app/components/ui/icons/BookOpen';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { X } from '@/app/components/ui/icons/X';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { prefetchCivilLawArticles } from '@/app/utils/civilLawRemoteCache';
import { SMART_FILE_FULLSCREEN_PANEL_OVERLAY_CLASS } from '../smartFile/smartFileOverlayZ';
import { SMART_MODAL_MOTION_PANEL_ENTER } from '../smartFile/smartModalMotionClasses';
import { registerSmartFileInlineOverlay } from '../smartFile/smartFileInlineOverlayRegistry';
import { COMPACT_HUB_TRIGGER_SKY } from '../smartFile/compactHubTrigger';
import { CivilLawReferencePanel } from './CivilLawReferencePanel';

const GLASS_TRIGGER =
    'w-full min-h-[44px] px-3 py-2 rounded-xl border border-white/[0.10] bg-[#0A0F1C] hover:bg-[#12182a] hover:border-white/[0.16] flex flex-col items-center justify-center gap-1 transition-colors text-center';

const GLASS_OVERLAY = SMART_FILE_FULLSCREEN_PANEL_OVERLAY_CLASS;
const GLASS_SHELL =
    `w-full h-full flex flex-col bg-[#080C16] overflow-hidden ${SMART_MODAL_MOTION_PANEL_ENTER} pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]`;
const GLASS_HEADER =
    'relative px-4 sm:px-6 py-2.5 border-b border-white/[0.07] bg-[#0A0F1C] flex justify-between items-center shrink-0';

export interface CivilLawReferenceHubProps {
    readOnly?: boolean;
    /** صف أدوات مضغوط بجانب محضر الدعوى */
    compact?: boolean;
}

export const CivilLawReferenceHub = memo(function CivilLawReferenceHub({
    readOnly = false,
    compact = false,
}: CivilLawReferenceHubProps) {
    const [panelOpen, setPanelOpen] = useState(false);

    useEffect(() => {
        prefetchCivilLawArticles(['civil_procedure', 'evidence']);
    }, []);

    useEffect(() => {
        if (!panelOpen || typeof document === 'undefined') return;
        const unregister = registerSmartFileInlineOverlay();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setPanelOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            unregister();
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [panelOpen]);

    const openPanel = () => {
        prefetchCivilLawArticles(['civil_procedure', 'evidence']);
        setPanelOpen(true);
    };

    const panel =
        panelOpen && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      className={GLASS_OVERLAY}
                      role="presentation"
                      onClick={(e) => {
                          if (e.target === e.currentTarget) setPanelOpen(false);
                      }}
                  >
                      <div
                          className={GLASS_SHELL}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="civil-law-reference-title"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={CIVIL_LAWSUIT_TEST_IDS.civilLawReferencePanel}
                      >
                          <div className={GLASS_HEADER}>
                              <button
                                  type="button"
                                  onClick={() => setPanelOpen(false)}
                                  className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                  aria-label="إغلاق"
                                  data-testid={CIVIL_LAWSUIT_TEST_IDS.civilLawReferenceClose}
                              >
                                  <X size={20} aria-hidden />
                              </button>
                              <div className="flex-1 text-center min-w-0 px-2">
                                  <h2
                                      id="civil-law-reference-title"
                                      className="text-sm font-bold text-white/90"
                                  >
                                      المرجع القانوني للدعوى المدنية
                                  </h2>
                                  <p className="text-[10px] text-white/40 mt-0.5">
                                      المرافعات المدنية · قانون الإثبات
                                  </p>
                              </div>
                              <span className="w-9 shrink-0" aria-hidden />
                          </div>
                          <CivilLawReferencePanel />
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    if (readOnly) {
        return compact ? null : (
            <div className="mb-2 print:hidden" dir="rtl">
                <div className="min-h-[44px] rounded-xl border border-dashed border-white/10 bg-white/[0.02]" />
            </div>
        );
    }

    return (
        <div className={`${compact ? 'mb-0' : 'mb-2'} print:hidden`} dir="rtl">
            {panel}
            <button
                type="button"
                data-testid={CIVIL_LAWSUIT_TEST_IDS.civilLawReferenceOpen}
                onPointerDown={() => prefetchCivilLawArticles(['civil_procedure', 'evidence'])}
                onClick={openPanel}
                className={compact ? COMPACT_HUB_TRIGGER_SKY : `${GLASS_TRIGGER} mb-2`}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <BookOpen size={14} className="text-white/55 shrink-0" aria-hidden />
                    <span className="font-bold text-white/85 text-[11px] truncate">المرجع القانوني</span>
                </div>
                <ChevronDown size={14} className="text-white/35 shrink-0" aria-hidden />
            </button>
        </div>
    );
});
