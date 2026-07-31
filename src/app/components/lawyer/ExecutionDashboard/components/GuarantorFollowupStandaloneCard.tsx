import React from 'react';
import { Bell } from 'lucide-react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    formatGuarantorIqdForDisplay,
    hasActiveFinancialGuarantorFollowup,
    readGuarantorIqd,
} from './guarantorExternalUtils';
import { GuarantorConfirmDialog, GuarantorOverflowMenu } from './GuarantorOverflowMenu';
import { GuarantorCollapsedSummary } from './GuarantorCollapsedSummary';
import { GuarantorCardExpandButton } from './GuarantorCardExpandButton';

export type GuarantorFollowupStandaloneCardProps = {
    executionData: ExecutionFile | null;
    embedded?: boolean;
    /** إخفاء شريط العنوان — يُعرض من الحاوية الخارجية مع التبويبات */
    hideChrome?: boolean;
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    openGuarantorDetailsModal: () => void;
    archiveAndClearGuarantor: (reason: 'replace' | 'unlink') => void;
    handleGuarantorRequestFromFollowup: () => void;
    setSummonsContextDebtorKey?: (key: string | null) => void;
    setSummonsHubInitialMainTab?: (tab: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null) => void;
    setShowUnifiedSummonsModal?: (show: boolean) => void;
    onOpenUnifiedSummonsHub?: (opts: {
        debtorKey: string | null;
        initialMainTab: string;
    }) => void;
};

export type GuarantorFollowupCardToolbarProps = {
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    onBeforeToggle?: () => void;
    openGuarantorDetailsModal: () => void;
    archiveAndClearGuarantor: (reason: 'replace' | 'unlink') => void;
    handleGuarantorRequestFromFollowup: () => void;
};

export const GuarantorFollowupCardToolbar: React.FC<GuarantorFollowupCardToolbarProps> = ({
    expanded,
    onExpandedChange,
    onBeforeToggle,
    openGuarantorDetailsModal,
    archiveAndClearGuarantor,
    handleGuarantorRequestFromFollowup,
}) => {
    const [replaceConfirmOpen, setReplaceConfirmOpen] = React.useState(false);
    const [unlinkConfirmOpen, setUnlinkConfirmOpen] = React.useState(false);

    return (
        <>
            <GuarantorConfirmDialog
                open={replaceConfirmOpen}
                title="تأكيد الاستبدال"
                message="سيتم حذف بيانات الضامن الحالية وإنشاء طلب ضامن جديد. هل أنت متأكد؟"
                confirmLabel="استبدال الضامن"
                onCancel={() => setReplaceConfirmOpen(false)}
                onConfirm={() => {
                    setReplaceConfirmOpen(false);
                    archiveAndClearGuarantor('replace');
                    handleGuarantorRequestFromFollowup();
                }}
            />
            <GuarantorConfirmDialog
                open={unlinkConfirmOpen}
                title="تأكيد الفصل"
                message="سيتم إلغاء ارتباط الضامن بهذه الإضبارة. هل أنت متأكد؟"
                confirmLabel="فصل الضامن"
                onCancel={() => setUnlinkConfirmOpen(false)}
                onConfirm={() => {
                    setUnlinkConfirmOpen(false);
                    archiveAndClearGuarantor('unlink');
                }}
            />
            <div className="flex shrink-0 items-center gap-2">
                <GuarantorCardExpandButton
                    expanded={expanded}
                    onToggle={() => {
                        onBeforeToggle?.();
                        onExpandedChange(!expanded);
                    }}
                />
                <GuarantorOverflowMenu
                    ariaLabel="قائمة الضامن المالي"
                    items={[
                        { id: 'details', label: 'تفاصيل الضامن', onClick: () => openGuarantorDetailsModal() },
                        {
                            id: 'replace',
                            label: 'استبدال الضامن',
                            tone: 'amber',
                            onClick: () => setReplaceConfirmOpen(true),
                        },
                        {
                            id: 'unlink',
                            label: 'فصل الضامن / إلغاء',
                            tone: 'rose',
                            onClick: () => setUnlinkConfirmOpen(true),
                        },
                    ]}
                />
            </div>
        </>
    );
};

export const GuarantorFollowupStandaloneCard: React.FC<GuarantorFollowupStandaloneCardProps> = ({
    executionData,
    hideChrome,
    expanded,
    onExpandedChange,
    openGuarantorDetailsModal,
    archiveAndClearGuarantor,
    handleGuarantorRequestFromFollowup,
    setSummonsContextDebtorKey,
    setSummonsHubInitialMainTab,
    setShowUnifiedSummonsModal,
    onOpenUnifiedSummonsHub,
    embedded,
}) => {
    const gf = executionData?.guarantor_followup;
    if (!hasActiveFinancialGuarantorFollowup(executionData) || !gf) return null;

    const deductionIqd = readGuarantorIqd(gf.guarantor_deduction_iqd);
    const salaryLabel = formatGuarantorIqdForDisplay(gf.guarantor_salary_iqd);
    const deductionLabel = formatGuarantorIqdForDisplay(gf.guarantor_deduction_iqd);
    const deductionUnset = deductionIqd == null;

    const inner = (
        <div
            className={
                embedded
                    ? 'relative overflow-visible'
                    : 'relative overflow-visible rounded-2xl border border-white/10 bg-[#0A0F1C]/55 px-3 py-3 shadow-[0_10px_32px_rgba(0,0,0,0.32)]'
            }
        >
            {!hideChrome ? (
                <GuarantorFollowupCardToolbar
                    expanded={expanded}
                    onExpandedChange={onExpandedChange}
                    openGuarantorDetailsModal={openGuarantorDetailsModal}
                    archiveAndClearGuarantor={archiveAndClearGuarantor}
                    handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
                />
            ) : null}

            {expanded ? (
                <>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <div className="text-sm text-gray-400">الاسم</div>
                            <div className="truncate font-bold text-white">{gf.guarantor_name?.trim() || '—'}</div>
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm text-gray-400">جهة العمل</div>
                            <div className="truncate font-bold text-white">{gf.guarantor_workplace?.trim() || '—'}</div>
                        </div>
                        {gf.guarantee_type === 'amount' ? (
                            <>
                                <div className="min-w-0">
                                    <div className="text-sm text-gray-400">الراتب</div>
                                    <div className="truncate font-mono font-bold text-white tabular-nums" dir="ltr">
                                        {salaryLabel}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm text-gray-400">الاستقطاع الشهري</div>
                                    <div
                                        className={`truncate font-mono font-bold tabular-nums ${
                                            deductionUnset ? 'text-slate-500' : 'text-white'
                                        }`}
                                        dir="ltr"
                                        title={
                                            deductionUnset
                                                ? 'لم يُدخل مبلغ الاستقطاع — عدّل من قائمة الضامن → تفاصيل الضامن'
                                                : deductionLabel
                                        }
                                    >
                                        {deductionLabel}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            onOpenUnifiedSummonsHub?.({
                                debtorKey: null,
                                initialMainTab: 'guarantor',
                            }) ?? (() => {
                                setSummonsContextDebtorKey?.(null);
                                setSummonsHubInitialMainTab?.('guarantor');
                                setShowUnifiedSummonsModal?.(true);
                            })();
                        }}
                        className="mt-3 inline-flex w-full flex-row-reverse items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-500/15"
                    >
                        <Bell size={14} />
                        متابعة الضامن
                    </button>
                </>
            ) : (
                <GuarantorCollapsedSummary
                    cells={[
                        { label: 'اسم الكفيل', value: gf.guarantor_name?.trim() || '—' },
                        {
                            label: 'الاستقطاع',
                            value: gf.guarantee_type === 'amount' ? deductionLabel : '—',
                            mono: true,
                        },
                    ]}
                />
            )}
        </div>
    );

    if (embedded) return inner;
    return (
        <div className="w-full overflow-visible" dir="rtl">
            {inner}
        </div>
    );
};
