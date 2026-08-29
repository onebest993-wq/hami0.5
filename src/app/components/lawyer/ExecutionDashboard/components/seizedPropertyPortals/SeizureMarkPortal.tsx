import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

export function SeizureMarkPortal(p: Record<string, unknown>) {
    const {
        seizureMarkModalOpen,
        seizureMarkModalEntityKind,
        setSeizureMarkModalOpen,
        setSeizureMarkModalEntityId,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        seizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        saveSeizureMarkConfirmation,
    } = p;

    return seizureMarkModalOpen &&
seizureMarkModalEntityKind !== 'movable' &&
typeof document !== 'undefined'
    ? createPortal(
          <div
              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
              role="presentation"
              onClick={(e) => {
                  if (e.target === e.currentTarget) {
                      setSeizureMarkModalOpen(false);
                      setSeizureMarkModalEntityId(null);
                      setSeizureMarkLetterNumberDraft('');
                      setSeizureMarkDateDraft('');
                      setSeizureMarkEntityDraft('');
                  }
              }}
          >
              <div
                  className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#0B1120] shadow-md"
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
                  role="dialog"
                  aria-label="تسجيل كتاب تأييد وضع الإشارة"
              >
                  <div className="flex items-center justify-between border-b border-amber-500/20 p-4">
                      <button
                          type="button"
                          onClick={() => {
                              setSeizureMarkModalOpen(false);
                              setSeizureMarkModalEntityId(null);
                              setSeizureMarkLetterNumberDraft('');
                              setSeizureMarkDateDraft('');
                              setSeizureMarkEntityDraft('');
                          }}
                          className={EXEC_MODAL_CLOSE_BTN_CLASS}
                          aria-label="إغلاق"
                      >
                          <X size={18} />
                      </button>
                      <p className="text-[12px] font-black text-amber-200">
                          تسجيل كتاب تأييد وضع الإشارة
                          {seizureMarkModalEntityKind === 'movable' ? ' — مال منقول' : ' — عقار'}
                      </p>
                      <span className="w-8" aria-hidden />
                  </div>
                  <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              رقم الكتاب
                          </label>
                          <input
                              value={seizureMarkLetterNumberDraft}
                              onChange={(e) => setSeizureMarkLetterNumberDraft(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                              placeholder="مثال: 123/تأ/2026"
                          />
                      </div>
                      <div className="space-y-1.5">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              تاريخ الكتاب
                          </label>
                          <input
                              type="date"
                              value={seizureMarkDateDraft}
                              onChange={(e) => setSeizureMarkDateDraft(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                          />
                      </div>
                      <div className="space-y-1.5">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              الجهة المجيبة
                          </label>
                          <input
                              value={seizureMarkEntityDraft}
                              onChange={(e) => setSeizureMarkEntityDraft(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                              placeholder="التسجيل العقاري / المرور"
                          />
                      </div>
                      <button
                          type="button"
                          onClick={saveSeizureMarkConfirmation}
                          className="w-full rounded-2xl border border-amber-500/35 bg-amber-600/15 px-4 py-3 text-[12px] font-black text-amber-100 hover:bg-amber-600/20"
                      >
                          حفظ
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )
    : null;
}
