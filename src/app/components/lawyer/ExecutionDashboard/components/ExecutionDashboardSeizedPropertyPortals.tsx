// @ts-nocheck
/** Seized property inline portals — مستخرج من ExecutionDashboard */
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import {
    expertCommitteeSizeLabelAr,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import { formatNumberInput } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';

export type ExecutionDashboardSeizedPropertyPortalsProps = Record<string, unknown>;

export function ExecutionDashboardSeizedPropertyPortals(props: ExecutionDashboardSeizedPropertyPortalsProps) {
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
        publicationModalOpen,
        publicationModalEntityKind,
        setPublicationModalOpen,
        setPublicationModalEntityId,
        setPublicationNewspaperNameDraft,
        setPublicationDateYmdDraft,
        publicationNewspaperNameDraft,
        publicationDateYmdDraft,
        savePublicationDetails,
    } = props as Record<string, any>;

    return (
        <>
{seizedPropertyStepModalOpen &&
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
                  className="w-full max-w-md rounded-3xl border-2 border-sky-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
              >
                  <div className="flex items-center justify-between border-b border-sky-500/20 p-4">
                      <button
                          type="button"
                          onClick={() => setSeizedPropertyStepModalOpen(false)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
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
                                      (x) => String(x.id) === entityId
                                  );
                                  const requiredExpertCount = entityHit
                                      ? readExpertCommitteeSize(entityHit)
                                      : 1;
                                  return (
                                      <>
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      أسماء الخبراء — {expertCommitteeSizeLabelAr(requiredExpertCount)}
                                  </label>
                                  <input
                                      value={seizedPropertyExpertsNamesDraft}
                                      onChange={(e) => setSeizedPropertyExpertsNamesDraft(e.target.value)}
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                      placeholder={
                                          requiredExpertCount === 1
                                              ? 'اسم الخبير'
                                              : `اكتب ${requiredExpertCount} أسماء مفصولة بفاصلة`
                                      }
                                  />
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      تاريخ تقرير الخبراء
                                  </label>
                                  <input
                                      type="date"
                                      value={seizedPropertyExpertReportDateDraft}
                                      onChange={(e) => setSeizedPropertyExpertReportDateDraft(e.target.value)}
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                  />
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
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
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] font-mono text-white outline-none text-right"
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
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      موعد المزايدة
                                  </label>
                                  <input
                                      type="date"
                                      value={seizedPropertyAuctionDateDraft}
                                      onChange={(e) =>
                                          setSeizedPropertyAuctionDateDraft(e.target.value)
                                      }
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
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
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      اسم المزايد الأخير / المشتري
                                  </label>
                                  <input
                                      value={seizedPropertyBuyerNameDraft}
                                      onChange={(e) => setSeizedPropertyBuyerNameDraft(e.target.value)}
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                      placeholder="اسم المزايد الأخير أو المشتري"
                                  />
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      مبلغ الإحالة
                                  </label>
                                  <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={seizedPropertyAwardAmountDraft}
                                      onChange={(e) => setSeizedPropertyAwardAmountDraft(e.target.value.replace(/[^\d]/g, ''))}
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                      placeholder="مثال: 500000000"
                                  />
                              </div>
                          </>
                      ) : null}
                      {seizedPropertyStepKind === 'reauction_default' ? (
                          <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                              <label className="block text-[10px] text-slate-400 text-right mb-2">
                                  الملاحظات
                              </label>
                              <textarea
                                  value={seizedPropertyStepNotesDraft}
                                  onChange={(e) => setSeizedPropertyStepNotesDraft(e.target.value)}
                                  className="min-h-[96px] w-full resize-none rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
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
    : null}

{seizedPropertyAuctionResultModalOpen &&
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
                  className="w-full max-w-md rounded-3xl border-2 border-sky-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
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
                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
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
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                      اسم المشتري
                                  </label>
                                  <input
                                      value={seizedPropertyAuctionResultBuyerNameDraft}
                                      onChange={(e) => setSeizedPropertyAuctionResultBuyerNameDraft(e.target.value)}
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                      placeholder="الاسم الكامل للمشتري"
                                  />
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
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
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none text-right"
                                      placeholder="مثال: 500000000"
                                  />
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
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
                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none text-right"
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
    : null}

{seizureMarkModalOpen &&
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
                  className="w-full max-w-md rounded-3xl border-2 border-amber-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
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
                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
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
                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              رقم الكتاب
                          </label>
                          <input
                              value={seizureMarkLetterNumberDraft}
                              onChange={(e) => setSeizureMarkLetterNumberDraft(e.target.value)}
                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                              placeholder="مثال: 123/تأ/2026"
                          />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              تاريخ الكتاب
                          </label>
                          <input
                              type="date"
                              value={seizureMarkDateDraft}
                              onChange={(e) => setSeizureMarkDateDraft(e.target.value)}
                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                          />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              الجهة المجيبة
                          </label>
                          <input
                              value={seizureMarkEntityDraft}
                              onChange={(e) => setSeizureMarkEntityDraft(e.target.value)}
                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
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
    : null}

{publicationModalOpen &&
publicationModalEntityKind !== 'movable' &&
typeof document !== 'undefined'
    ? createPortal(
          <div
              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
              role="presentation"
              onClick={(e) => {
                  if (e.target === e.currentTarget) {
                      setPublicationModalOpen(false);
                      setPublicationModalEntityId(null);
                      setPublicationNewspaperNameDraft('');
                      setPublicationDateYmdDraft('');
                  }
              }}
          >
              <div
                  className="w-full max-w-md rounded-3xl border-2 border-amber-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
                  role="dialog"
                  aria-label="تسجيل بيانات النشر والإعلان"
              >
                  <div className="flex items-center justify-between border-b border-amber-500/20 p-4">
                      <button
                          type="button"
                          onClick={() => {
                              setPublicationModalOpen(false);
                              setPublicationModalEntityId(null);
                              setPublicationNewspaperNameDraft('');
                              setPublicationDateYmdDraft('');
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                          aria-label="إغلاق"
                      >
                          <X size={18} />
                      </button>
                      <p className="text-[12px] font-black text-amber-200">
                          تسجيل بيانات النشر والإعلان
                          {publicationModalEntityKind === 'movable' ? ' — مال منقول' : ' — عقار'}
                      </p>
                      <span className="w-8" aria-hidden />
                  </div>
                  <div className="p-4 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              اسم الصحيفة
                          </label>
                          <input
                              value={publicationNewspaperNameDraft}
                              onChange={(e) => setPublicationNewspaperNameDraft(e.target.value)}
                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                              placeholder="مثال: الصباح"
                          />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                              تاريخ النشر
                          </label>
                          <input
                              type="date"
                              value={publicationDateYmdDraft}
                              onChange={(e) => setPublicationDateYmdDraft(e.target.value)}
                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                          />
                      </div>
                      <button
                          type="button"
                          onClick={savePublicationDetails}
                          className="w-full rounded-2xl border border-amber-500/35 bg-amber-600/15 px-4 py-3 text-[12px] font-black text-amber-100 hover:bg-amber-600/20"
                      >
                          حفظ
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )
    : null}

        </>
    );
}
