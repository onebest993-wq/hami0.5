import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { formatNumberInput } from '@/app/utils/execution/amountInput';

export function SeizedPropertyStepPortal(p: Record<string, unknown>) {
    const {
        seizedPropertyStepModalOpen,
        seizedPropertyStepEntityKind,
        setSeizedPropertyStepModalOpen,
        seizedPropertyStepKind,
        seizedPropertyStepPropertyId,
        executionData,
        seizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertsNamesDraft,
        seizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertReportDateDraft,
        seizedPropertyExpertPriceDraft,
        setSeizedPropertyExpertPriceDraft,
        seizedPropertyAuctionDateDraft,
        setSeizedPropertyAuctionDateDraft,
        linkSeizureAuctionToAppointments,
        setLinkSeizureAuctionToAppointments,
        seizedPropertyBuyerNameDraft,
        setSeizedPropertyBuyerNameDraft,
        seizedPropertyAwardAmountDraft,
        setSeizedPropertyAwardAmountDraft,
        seizedPropertyStepNotesDraft,
        setSeizedPropertyStepNotesDraft,
        saveSeizedPropertyStepDetails,
    } = p;

    return seizedPropertyStepModalOpen &&
seizedPropertyStepEntityKind !== 'movable' &&
typeof document !== 'undefined'
    ? createPortal(
          <div
              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
              role="presentation"
              onClick={(e) => {
                  if (e.target === e.currentTarget) setSeizedPropertyStepModalOpen(false);
              }}
          >
              <div
                  className="w-full max-w-md rounded-3xl border border-sky-500/30 bg-[#0B1120] shadow-md"
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
              >
                  <div className="flex items-center justify-between border-b border-sky-500/20 p-4">
                      <button
                          type="button"
                          onClick={() => setSeizedPropertyStepModalOpen(false)}
                          className={EXEC_MODAL_CLOSE_BTN_CLASS}
                          aria-label="إغلاق"
                      >
                          <X size={18} />
                      </button>
                      <p className="text-[12px] font-black text-sky-200">
                          {seizedPropertyStepKind === 'experts'
                              ? `تسجيل تقرير الخبراء${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`
                              : seizedPropertyStepKind === 'auction'
                                ? `تسجيل موعد المزايدة${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`
                                : seizedPropertyStepKind === 'award'
                                  ? `تسجيل الإحالة${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`
                                  : `تسجيل النكول/إعادة المزايدة${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`}
                      </p>
                      <span className="w-8" aria-hidden />
                  </div>
                  <div className="p-4 space-y-3">
                      {seizedPropertyStepKind === 'experts' ? (
                          <>
                              {(() => {
                                  const entityId = String(seizedPropertyStepPropertyId || '').trim();
                                  const entities =
                                      seizedPropertyStepEntityKind === 'movable'
                                          ? (executionData?.seizedMovables || [])
                                          : (executionData?.seizedProperties || []);
                                  const entityHit = entities.find(
                                      (x: { id?: string }) => String(x.id) === entityId
                                  );
                                  const requiredExpertCount = entityHit
                                      ? readExpertCommitteeSize(entityHit)
                                      : 1;
                                  return (
                                      <>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      أسماء الخبراء — {expertCommitteeSizeLabelAr(requiredExpertCount)}
                                  </label>
                                  <input
                                      value={seizedPropertyExpertsNamesDraft}
                                      onChange={(e) => setSeizedPropertyExpertsNamesDraft(e.target.value)}
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                                      placeholder={
                                          requiredExpertCount === 1
                                              ? 'اسم الخبير'
                                              : `اكتب ${requiredExpertCount} أسماء مفصولة بفاصلة`
                                      }
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      تاريخ تقرير الخبراء
                                  </label>
                                  <input
                                      type="date"
                                      value={seizedPropertyExpertReportDateDraft}
                                      onChange={(e) => setSeizedPropertyExpertReportDateDraft(e.target.value)}
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      السعر المقدر
                                  </label>
                                  <input
                                      type="text"
                                      inputMode="numeric"
                                      dir="ltr"
                                      value={seizedPropertyExpertPriceDraft}
                                      onChange={(e) =>
                                          setSeizedPropertyExpertPriceDraft(
                                              formatNumberInput(e.target.value)
                                          )
                                      }
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] font-mono text-white outline-none text-right"
                                      placeholder="0"
                                  />
                              </div>
                                      </>
                                  );
                              })()}
                          </>
                      ) : null}
                      {seizedPropertyStepKind === 'auction' ? (
                          <>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      موعد المزايدة
                                  </label>
                                  <input
                                      type="date"
                                      value={seizedPropertyAuctionDateDraft}
                                      onChange={(e) =>
                                          setSeizedPropertyAuctionDateDraft(e.target.value)
                                      }
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                                      style={{ direction: 'ltr', textAlign: 'right' }}
                                  />
                              </div>
                              <FollowupSectionLinkCheckbox
                                  checked={linkSeizureAuctionToAppointments}
                                  onChange={setLinkSeizureAuctionToAppointments}
                                  label="إضافة الموعد إلى قسم المواعيد"
                                  hint="يمكنك إلغاء التحديد إذا أردت الحفظ في سجل العقار/المنقول فقط."
                              />
                          </>
                      ) : null}
                      {seizedPropertyStepKind === 'award' ? (
                          <>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      اسم المزايد الأخير / المشتري
                                  </label>
                                  <input
                                      value={seizedPropertyBuyerNameDraft}
                                      onChange={(e) => setSeizedPropertyBuyerNameDraft(e.target.value)}
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                                      placeholder="اسم المزايد الأخير أو المشتري"
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      مبلغ الإحالة
                                  </label>
                                  <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={seizedPropertyAwardAmountDraft}
                                      onChange={(e) => setSeizedPropertyAwardAmountDraft(e.target.value.replace(/[^\d]/g, ''))}
                                      className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                                      placeholder="مثال: 500000000"
                                  />
                              </div>
                          </>
                      ) : null}
                      {seizedPropertyStepKind === 'reauction_default' ? (
                          <div className="space-y-1.5">
                              <label className="block text-[10px] text-slate-400 text-right mb-2">
                                  الملاحظات
                              </label>
                              <textarea
                                  value={seizedPropertyStepNotesDraft}
                                  onChange={(e) => setSeizedPropertyStepNotesDraft(e.target.value)}
                                  className="min-h-[96px] w-full resize-none rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-[12px] text-white outline-none"
                                  placeholder="اكتب التفاصيل"
                              />
                          </div>
                      ) : null}
                      <button
                          type="button"
                          onClick={saveSeizedPropertyStepDetails}
                          className="w-full rounded-2xl border border-sky-500/35 bg-sky-600/15 px-4 py-3 text-[12px] font-black text-sky-100 hover:bg-sky-600/20"
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
