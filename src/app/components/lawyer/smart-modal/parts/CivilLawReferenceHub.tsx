import React, { useEffect, useState, memo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, X } from '@/app/components/ui/lucideIcons';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { prefetchCivilLawArticles } from '@/app/utils/civilLawRemoteCache';
import { SMART_FILE_FULLSCREEN_PANEL_OVERLAY_CLASS } from '../smartFile/smartFileOverlayZ';
import { registerSmartFileInlineOverlay } from '../smartFile/smartFileInlineOverlayRegistry';
import { COMPACT_HUB_TRIGGER_SKY } from '../smartFile/compactHubTrigger';

const LazyCivilLawReferencePanel = lazy(() =>
    import('./CivilLawReferencePanel').then((m) => ({ default: m.CivilLawReferencePanel })),
);

const GLASS_TRIGGER =
    'w-full min-h-[72px] px-3 rounded-xl border border-sky-400/22 bg-[#0A0F1C]/40 backdrop-blur-md hover:bg-[#0A0F1C]/55 hover:border-sky-400/38 flex flex-col items-center justify-center gap-1 transition-all text-center shadow-[0_4px_24px_rgba(0,0,0,0.25)]';

const GLASS_OVERLAY = SMART_FILE_FULLSCREEN_PANEL_OVERLAY_CLASS;
const GLASS_SHELL =
    'w-full h-full flex flex-col bg-[#0A0F1C]/92 backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]';
const GLASS_HEADER =
    'relative px-5 sm:px-8 py-4 border-b border-sky-400/15 bg-gradient-to-l from-sky-400/10 via-transparent to-transparent flex justify-between items-center shrink-0';

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
                                      className="text-sm sm:text-base font-bold text-sky-100"
                                  >
                                      المرجع القانوني للدعوى المدنية
                                  </h2>
                                  <p className="text-[10px] text-white/40 mt-0.5">
                                      المرافعات المدنية · قانون الإثبات
                                  </p>
                              </div>
                              <span className="w-9 shrink-0" aria-hidden />
                          </div>
                          <Suspense
                              fallback={
                                  <div className="flex-1 flex items-center justify-center text-white/45 text-sm">
                                      جاري تحميل المرجع القانوني…
                                  </div>
                              }
                          >
                              <LazyCivilLawReferencePanel />
                          </Suspense>
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
                onClick={() => setPanelOpen(true)}
                className={compact ? COMPACT_HUB_TRIGGER_SKY : `${GLASS_TRIGGER} mb-2`}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <BookOpen size={14} className="text-sky-300 shrink-0" aria-hidden />
                    <span className="font-bold text-sky-200 text-[11px] truncate">المرجع القانوني</span>
                </div>
                <ChevronDown size={14} className="text-sky-300/50 shrink-0" aria-hidden />
            </button>
        </div>
    );
});
