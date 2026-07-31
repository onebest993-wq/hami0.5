import React from 'react';
import { buildPropertyWorkflowStepHistory } from '../utils/propertySeizureWorkflowUtils';
import { readExpertCommitteeSize } from '../utils/expertCommitteeUtils';
import {
  ACTION_SHELL,
  BTN,
  PATH_HINT,
  actionClick,
  doneStepHistoryShell,
  inlineSaveShell,
} from './seizedPropertyWorkflowUiShell';

export type SeizedPropertyStepContentDeps = {
  activeIdx: number;
  decisions: Array<Record<string, unknown>>;
  normStatus: string;
  p: import('@/app/types/execution').SeizedProperty;
  propertyId: string;
  renderInlineForStep: (
    stepIndex: number,
    sectionOverride?: import('./PropertySeizureInlineSections').PropertyInlineSectionKey,
  ) => React.ReactNode;
  hasPendingSubtype: (subtype: string) => boolean;
  submitSubtype: (
    lead: string,
    requestTitle: string,
    subtype: string,
    extraLines?: string[],
    payloadExtra?: Record<string, unknown>,
  ) => string | null;
  hasAnyPendingForStep: (stepIndex: number) => boolean;
  expertApprovedUnsaved: unknown;
  expertCommitteeApprovedUnsaved: unknown;
  auctionApprovedUnsaved: unknown;
  reauctionApprovedUnsaved: unknown;
  step2Lane: 'auction' | 'objection' | null;
  setStep2Lane: (lane: 'auction' | 'objection' | null) => void;
  optimisticObjectionDecisionId: string | null;
  submitObjectionRequest: (objectionKind: 'report' | 'experts') => void;
  renderStepPendingMirror: (stepIndex: number, preferredSubtype?: string) => React.ReactNode;
  dismissedApprovedInlineForStep: number | null;
  setDismissedApprovedInlineForStep: (v: number | null) => void;
  renderApprovedInlineResume: (message: string, onResume: () => void) => React.ReactNode;
  proceedsDone: boolean;
  openTrustDisburseForProceeds: () => void;
};

export function buildSeizedPropertyStepContent(
  stepIndex: number,
  d: SeizedPropertyStepContentDeps,
): React.ReactNode {
            type Step2Lane = 'auction' | 'objection';
            if (stepIndex > d.activeIdx) return null;
            if (stepIndex < d.activeIdx) {
                return doneStepHistoryShell(
                    buildPropertyWorkflowStepHistory(stepIndex, d.p, d.decisions, d.propertyId)
                );
            }

            const inline = d.renderInlineForStep(stepIndex);
            const hasMark = Boolean(String(d.p.seizureMarkLetterNumber || '').trim());

            if (stepIndex === 0 && d.normStatus === 'seized' && !hasMark) {
                return inline;
            }

            if (stepIndex === 1 && d.normStatus === 'seized' && hasMark) {
                if (d.hasPendingSubtype('property_expert')) {
                    return d.renderStepPendingMirror(1, 'property_expert');
                }
                if (d.expertApprovedUnsaved) {
                    if (d.dismissedApprovedInlineForStep === 1) {
                        return d.renderApprovedInlineResume(
                            'تمت الموافقة على انتداب الخبراء — أكمل التسجيل',
                            () => d.setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                return (
                    <div className={ACTION_SHELL}>
                        <button
                            type="button"
                            onClick={actionClick(() =>
                                d.submitSubtype(
                                    'طلب انتداب خبراء لتقدير العقار.',
                                    'طلب انتداب خبراء — عقار (قيد البت لدى المنفذ)',
                                    'property_expert'
                                )
                            )}
                            className={`${BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                        >
                            طلب انتداب خبراء للتقدير
                        </button>
                    </div>
                );
            }

            if (stepIndex === 2 && d.normStatus === 'valued') {
                const objectionPending =
                    d.hasPendingSubtype('property_expert_objection') ||
                    Boolean(String(d.optimisticObjectionDecisionId || '').trim());
                const auctionPending = d.hasPendingSubtype('property_auction');

                if (auctionPending) {
                    return d.renderStepPendingMirror(2, 'property_auction');
                }
                if (d.auctionApprovedUnsaved) {
                    if (d.dismissedApprovedInlineForStep === 2) {
                        return d.renderApprovedInlineResume(
                            'تمت الموافقة على موعد المزايدة — أكمل التسجيل',
                            () => d.setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                if (objectionPending) {
                    return d.renderStepPendingMirror(2, 'property_expert_objection');
                }

                const laneBtnCls = (lane: Step2Lane, tone: string) =>
                    `${BTN} ${tone} ${
                        d.step2Lane === lane
                            ? 'ring-2 ring-[#E6C673]/70 ring-offset-1 ring-offset-[#05060D]'
                            : ''
                    }`;

                if (d.step2Lane === 'auction') {
                    return (
                        <div className={ACTION_SHELL}>
                            <div className="space-y-2 rounded-2xl border border-[#E6C673]/20 bg-amber-950/15 p-3">
                                <p className={`${PATH_HINT} text-[#E6C673]/90`}>مسار المزايدة</p>
                                <button
                                    type="button"
                                    onClick={actionClick(() =>
                                        d.submitSubtype(
                                            'طلب تحديد موعد مزايدة علنية للعقار.',
                                            'طلب تحديد موعد مزايدة — عقار (قيد البت لدى المنفذ)',
                                            'property_auction'
                                        )
                                    )}
                                    className={`${BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
                                >
                                    طلب تحديد موعد مزايدة
                                </button>
                            </div>
                        </div>
                    );
                }

                if (d.step2Lane === 'objection') {
                    return (
                        <div className={ACTION_SHELL}>
                            <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3">
                                <p className={`${PATH_HINT} text-amber-300/90`}>
                                    مسار الاعتراض على التقدير
                                </p>
                                <p className="text-[9px] text-slate-400 text-right leading-relaxed">
                                    يُرسل الطلب فوراً — يُبَتّ من قسم «القرارات والطعون».
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={actionClick(() => d.submitObjectionRequest('report'))}
                                        className={`${BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                                    >
                                        اعتراض على التقرير
                                    </button>
                                    <button
                                        type="button"
                                        onClick={actionClick(() => d.submitObjectionRequest('experts'))}
                                        className={`${BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                                    >
                                        اعتراض على الخبراء
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className={ACTION_SHELL}>
                        <p className={`${PATH_HINT} text-slate-400`}>اختر مسار الإجراء</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    d.setStep2Lane('auction');
                                }}
                                className={laneBtnCls(
                                    'auction',
                                    'border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15'
                                )}
                            >
                                مسار المزايدة
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    d.setStep2Lane('objection');
                                }}
                                className={laneBtnCls(
                                    'objection',
                                    'border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'
                                )}
                            >
                                مسار الاعتراض على التقدير
                            </button>
                        </div>
                    </div>
                );
            }

            if (stepIndex === 3 && d.normStatus === 'estimation_objected') {
                if (d.hasPendingSubtype('property_expert_committee')) {
                    return d.renderStepPendingMirror(3, 'property_expert_committee');
                }
                if (d.expertCommitteeApprovedUnsaved) {
                    if (d.dismissedApprovedInlineForStep === 3) {
                        return d.renderApprovedInlineResume(
                            'تمت الموافقة على لجنة الخبراء — أكمل التسجيل',
                            () => d.setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                return (
                    <div className={ACTION_SHELL}>
                        <button
                            type="button"
                            onClick={actionClick(() => {
                                const required = readExpertCommitteeSize(d.p);
                                d.submitSubtype(
                                    'طلب انتداب لجنة خبراء جديدة لتقدير العقار بعد الاعتراض.',
                                    'طلب انتداب لجنة خبراء جديدة — عقار (قيد البت لدى المنفذ)',
                                    'property_expert_committee',
                                    [`عدد الخبراء المطلوب: ${required}`]
                                );
                            })}
                            className={`${BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                        >
                            طلب انتداب لجنة خبراء جديدة
                        </button>
                    </div>
                );
            }

            if (stepIndex === 4 && d.normStatus === 'published') {
                const needsPub =
                    !String(d.p.newspaperName || '').trim() || !String(d.p.publicationDateYmd || '').trim();
                if (!needsPub) return inline;
                return inline;
            }

            if (stepIndex === 5 && d.normStatus === 'published') {
                const needsPub =
                    !String(d.p.newspaperName || '').trim() || !String(d.p.publicationDateYmd || '').trim();
                if (needsPub) return null;
                return inline;
            }

            if (stepIndex === 6 && d.normStatus === 'no_bidders') {
                if (d.hasPendingSubtype('property_auction')) {
                    return d.renderStepPendingMirror(6, 'property_auction');
                }
                if (d.auctionApprovedUnsaved) {
                    if (d.dismissedApprovedInlineForStep === 6) {
                        return d.renderApprovedInlineResume(
                            'تمت الموافقة على موعد المزايدة الجديد — أكمل التسجيل',
                            () => d.setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                return (
                    <div className={ACTION_SHELL}>
                        <button
                            type="button"
                            onClick={actionClick(() =>
                                d.submitSubtype(
                                    'طلب تحديد موعد مزايدة جديد (كسر القرار) للعقار.',
                                    'طلب تحديد موعد مزايدة جديد — عقار (قيد البت لدى المنفذ)',
                                    'property_auction'
                                )
                            )}
                            className={`${BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
                        >
                            طلب تحديد موعد مزايدة جديد (كسر القرار)
                        </button>
                    </div>
                );
            }

            if (stepIndex === 7 && d.normStatus === 'initial_award') {
                if (d.hasAnyPendingForStep(7)) {
                    return d.renderStepPendingMirror(7);
                }
                if (d.reauctionApprovedUnsaved) {
                    if (d.dismissedApprovedInlineForStep === 7) {
                        return d.renderApprovedInlineResume(
                            'تمت الموافقة على إعادة المزايدة — أكمل التسجيل',
                            () => d.setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(d.renderInlineForStep(7, 'reauction_default'));
                }
                return (
                    <div className={ACTION_SHELL}>
                        <p className={`${PATH_HINT} text-slate-400`}>اختر أحد الإجراءات التالية</p>
                        <button
                            type="button"
                            onClick={actionClick(() =>
                                d.submitSubtype(
                                    'طلب إحالة قطعية للعقار.',
                                    'طلب إحالة قطعية — عقار (قيد البت لدى المنفذ)',
                                    'property_final_award',
                                    [
                                        `المشتري (رسو مزاد): ${String(d.p.initialAwardBuyerName || '').trim()}`,
                                        d.p.initialAwardAmountIqd != null &&
                                        Number.isFinite(Number(d.p.initialAwardAmountIqd))
                                            ? `مبلغ رسو المزاد: ${Number(d.p.initialAwardAmountIqd).toLocaleString('ar-IQ')} د.ع`
                                            : '',
                                    ].filter(Boolean)
                                )
                            )}
                            className={`${BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                        >
                            طلب إحالة قطعية
                        </button>
                        <button
                            type="button"
                            onClick={actionClick(() =>
                                d.submitSubtype(
                                    'طلب إعادة المزايدة للنكول (تهرب المشتري من الدفع) للعقار.',
                                    'طلب إعادة المزايدة للنكول — عقار (قيد البت لدى المنفذ)',
                                    'property_reauction_default'
                                )
                            )}
                            className={`${BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                        >
                            طلب إعادة المزايدة للنكول
                        </button>
                    </div>
                );
            }

            if (stepIndex === 7 && d.normStatus === 'sold') {
                if (d.proceedsDone) {
                    return (
                        <p className="text-[10px] font-bold text-emerald-200/90 text-right">
                            تمت الإحالة القطعية وصرف الحصيلة في السجل المالي.
                        </p>
                    );
                }
                return (
                    <div className={ACTION_SHELL}>
                        <p className="text-[10px] font-bold text-emerald-200/90 text-right leading-relaxed">
                            تمت الإحالة القطعية — يمكنك نقل حصيلة البيع إلى السجل المالي (الأمانات).
                        </p>
                        <button
                            type="button"
                            onClick={actionClick(d.openTrustDisburseForProceeds)}
                            className={`${BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                        >
                            نقل حصيلة البيع — السجل المالي
                        </button>
                    </div>
                );
            }

            return inline;
}
