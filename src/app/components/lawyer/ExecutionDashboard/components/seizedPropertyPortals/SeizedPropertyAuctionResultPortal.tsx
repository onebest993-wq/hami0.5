import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

export function SeizedPropertyAuctionResultPortal(p: Record<string, unknown>) {
    const {
        seizedPropertyAuctionResultModalOpen,
        seizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        seizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        saveSeizedPropertyAuctionSessionResult,
    } = p;

    return seizedPropertyAuctionResultModalOpen &&
seizedPropertyAuctionResultEntityKind !== 'movable' &&
typeof document !== 'undefined'
    ? createPortal(
          <div
              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
              role="presentation"
              onClick={(e) => {
                  if (e.target === e.currentTarget) {
                      setSeizedPropertyAuctionResultModalOpen(false);
                      setSeizedPropertyAuctionResultPropertyId(null);
                      setSeizedPropertyAuctionResultEntityKind('property');
                      setSeizedPropertyAuctionResultOutcome('initial_award');
                      setSeizedPropertyAuctionResultBuyerNameDraft('');
                      setSeizedPropertyAuctionResultAmountDraft('');
                      setSeizedPropertyAuctionDepositAmountDraft('');
                  }
              }}
          >
              <div
                  className="w-full max-w-md rounded-3xl border border-sky-500/30 bg-[#0B1120] shadow-md"
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
                  role="dialog"
                  aria-label="تسجيل نتيجة جلسة المزايدة"
              >
                  <div className="flex items-center justify-between border-b border-sky-500/20 p-4">
                      <button
                          type="button"
                          onClick={() => {
                              setSeizedPropertyAuctionResultModalOpen(false);
                              setSeizedPropertyAuctionResultPropertyId(null);
                              setSeizedPropertyAuctionResultEntityKind('property');
                              setSeizedPropertyAuctionResultOutcome('initial_award');
                              setSeizedPropertyAuctionResultBuyerNameDraft('');
                              setSeizedPropertyAuctionResultAmountDraft('');
                              setSeizedPropertyAuctionDepositAmountDraft('');
                          }}
                          className={EXEC_MODAL_CLOSE_BTN_CLASS}
                          aria-label="إغلاق"
                      >
                          <X size={18} />
                      </button>
                      <p className="text-[12px] font-black text-sky-200">
                          تسجيل نتيجة جلسة المزايدة
                          {seizedPropertyAuctionResultEntityKind === 'movable' ? ' — مال منقول' : ''}
                      </p>
                      <span className="w-8" aria-hidden />
                  </div>
                  <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                          <button
                              type="button"
                              onClick={() => setSeizedPropertyAuctionResultOutcome('initial_award')}
                              className={`rounded-2xl border px-3 py-3 text-[11px] font-black transition-colors ${
                                  seizedPropertyAuctionResultOutcome === 'initial_award'
                                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                                      : 'border-white/10 bg-slate-900/35 text-slate-200 hover:bg-slate-900/45'
                              }`}
                          >
                              رسو المزاد (إحالة أولية)
                          </button>
                          <button
                              type="button"
                              onClick={() => setSeizedPropertyAuctionResultOutcome('no_bidders')}
                              className={`rounded-2xl border px-3 py-3 text-[11px] font-black transition-colors ${
                                  seizedPropertyAuctionResultOutcome === 'no_bidders'
                                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                                      : 'border-white/10 bg-slate-900/35 text-slate-200 hover:bg-slate-900/45'
                              }`}
                          >
                              عدم حصول راغب بالشراء
                          </button>
                      </div>

                      {seizedPropertyAuctionResultOutcome === 'initial_award' ? (
                          <>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      اسم المشتري
                                  </label>
                                  <input
                                      value={seizedPropertyAuctionResultBuyerNameDraft}
                                      onChange={(e) => setSeizedPropertyAuctionResultBuyerNameDraft(e.target.value)}
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                                      placeholder="الاسم الكامل للمشتري"
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      مبلغ رسو المزاد (د.ع)
                                  </label>
                                  <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={seizedPropertyAuctionResultAmountDraft}
                                      onChange={(e) =>
                                          setSeizedPropertyAuctionResultAmountDraft(
                                              e.target.value.replace(/[^\d]/g, '')
                                          )
                                      }
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none text-right"
                                      placeholder="مثال: 500000000"
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      مبلغ التأمينات القانونية المدفوعة (10%) (د.ع)
                                  </label>
                                  <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={seizedPropertyAuctionDepositAmountDraft}
                                      onChange={(e) =>
                                          setSeizedPropertyAuctionDepositAmountDraft(
                                              e.target.value.replace(/[^\d]/g, '')
                                          )
                                      }
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none text-right"
                                      placeholder="مثال: 50000000"
                                  />
                              </div>
                          </>
                      ) : (
                          <p className="text-[10px] text-slate-400 text-right leading-relaxed">
                              سيتم تحويل حالة العقار إلى "لا راغب بالشراء" وإظهار زر طلب مزايدة جديدة.
                          </p>
                      )}

                      <button
                          type="button"
                          onClick={saveSeizedPropertyAuctionSessionResult}
                          className="w-full rounded-2xl border border-sky-500/35 bg-sky-600/15 px-4 py-3 text-[12px] font-black text-sky-100 hover:bg-sky-600/20"
                      >
                          حفظ النتيجة
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )
    : null;
}
