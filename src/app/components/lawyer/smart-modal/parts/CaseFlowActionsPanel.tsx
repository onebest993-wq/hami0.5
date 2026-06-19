import React, { useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Activity, AlertOctagon, Archive, Ban, Clock, X, type LucideIcon } from 'lucide-react';
import { resolveAbandonmentFlowAction } from '../smartFile/caseFlowAbandonment';
import {
    resolvePetitionVoidMenuLabel,
    shouldShowPetitionVoidMenuAction,
} from '../smartFile/petitionVoidFlow';
import type { CaseStage } from '../../LawyerShared';
import { personalPearlModalTheme, PS_DOCK_BTN_ROSE } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';
import { PersonalStatusFlowConfirmDialog } from '@/app/components/lawyer/personal-status/PersonalStatusFlowConfirmDialog';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';

type FlowConfirmState = {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
};

export interface CaseFlowActionsPanelProps {
    onInterrupt?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onAbandon?: () => void;
    onPetitionVoid?: () => void;
    flowStage?: Pick<
        CaseStage,
        | 'stageName'
        | 'isVoided'
        | 'isPleadingsClosed'
        | 'abandonmentCount'
        | 'abandonmentDate'
        | 'petitionVoidFlow'
    >;
    isPaused?: boolean;
    isInterrupted?: boolean;
    /** chrome = زر في الشريط العلوي · dock = أيقونة في عمود الأوامر */
    variant?: 'chrome' | 'dock';
}

type FlowAction = {
    key: string;
    label: string;
    icon: LucideIcon;
    iconClass: string;
    onClick: () => void;
};

function FlowActionRow({
    label,
    icon: Icon,
    iconClass,
    onClick,
    danger = false,
}: Omit<FlowAction, 'key'> & { danger?: boolean }) {
    const T = useSmartFileModalTheme();
    return (
        <button type="button" onClick={onClick} className={danger ? T.actionRowDanger : T.actionRow}>
            <div className={`${danger ? T.actionRowIconDanger : T.actionRowIcon} ${iconClass}`}>
                <Icon size={15} strokeWidth={1.75} />
            </div>
            <span className={`flex-1 text-[12px] font-semibold ${danger ? 'text-rose-200/90' : T.variant === 'personal-pearl' ? 'text-[#FFFEF9]/90' : 'text-white/90'}`}>
                {label}
            </span>
        </button>
    );
}

export const CaseFlowActionsPanel = memo(({
    onInterrupt,
    onPause,
    onResume,
    onAbandon,
    onPetitionVoid,
    flowStage,
    isPaused,
    isInterrupted,
    variant = 'chrome',
}: CaseFlowActionsPanelProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pendingConfirm, setPendingConfirm] = useState<FlowConfirmState | null>(null);
    const T = useSmartFileModalTheme();
    const pearlFlow = personalPearlModalTheme();
    const isDock = variant === 'dock';
    const needsPearlConfirm = isDock || T.variant === 'personal-pearl';

    const closeAnd = (fn: () => void, confirm?: Omit<FlowConfirmState, 'onConfirm'>) => () => {
        setIsOpen(false);
        if (needsPearlConfirm && confirm) {
            setPendingConfirm({ ...confirm, onConfirm: fn });
            return;
        }
        fn();
    };

    const actions: FlowAction[] = [];

    if (onInterrupt) {
        actions.push({
            key: 'interrupt',
            label: isInterrupted ? 'استئناف السير' : 'انقطاع السير في الدعوى',
            icon: AlertOctagon,
            iconClass: 'text-red-400/90',
            onClick: isInterrupted
                ? closeAnd(onInterrupt)
                : closeAnd(onInterrupt, {
                      title: 'انقطاع السير في الدعوى',
                      message:
                          'هل تريد تسجيل انقطاع السير في الدعوى؟ سيتم تجميد الإجراءات إلى حين زوال السبب القانوني.',
                      confirmLabel: 'متابعة',
                      danger: true,
                  }),
        });
    }
    if (onPause || onResume) {
        actions.push({
            key: 'pause',
            label: isPaused ? 'استئناف السير' : 'استئخار الدعوى',
            icon: Clock,
            iconClass: 'text-amber-400/90',
            onClick: closeAnd(
                () => {
                    if (isPaused && onResume) onResume();
                    else if (onPause) onPause();
                },
                isPaused
                    ? undefined
                    : {
                          title: 'استئخار الدعوى',
                          message: 'هل تريد استئخار الدعوى وربطها برقم دعوى جديدة؟ سيتم إيقاف السير مؤقتاً حتى حسم الدعوى المرتبطة.',
                          confirmLabel: 'متابعة',
                      },
            ),
        });
    }

    const abandonFlow = resolveAbandonmentFlowAction({
        abandonmentCount: flowStage?.abandonmentCount,
        abandonmentDate: flowStage?.abandonmentDate,
        isVoided: flowStage?.isVoided,
        isPleadingsClosed: flowStage?.isPleadingsClosed,
    });

    if (onAbandon && abandonFlow.show) {
        actions.push({
            key: 'abandon',
            label: abandonFlow.label,
            icon: Archive,
            iconClass: abandonFlow.isSecondAttempt ? 'text-rose-400/90' : 'text-slate-300/90',
            onClick: closeAnd(onAbandon, {
                title: abandonFlow.isSecondAttempt ? 'إبطال العريضة' : 'ترك الدعوى للمراجعة',
                message: abandonFlow.isSecondAttempt
                    ? 'تحذير: هذه المحاولة الثانية — سيُبطل العريضة نهائياً وفقاً للقانون. هل أنت متأكد من المتابعة؟'
                    : 'هل تريد ترك الدعوى للمراجعة؟ يجب تجديدها خلال 10 أيام وإلا تُبطل العريضة.',
                confirmLabel: abandonFlow.isSecondAttempt ? 'تأكيد الإبطال' : 'تأكيد',
                danger: abandonFlow.isSecondAttempt,
            }),
        });
    }

    if (onPetitionVoid && shouldShowPetitionVoidMenuAction(flowStage as CaseStage | undefined)) {
        actions.push({
            key: 'petition_void',
            label: resolvePetitionVoidMenuLabel(flowStage?.stageName),
            icon: Ban,
            iconClass: 'text-rose-400/90',
            onClick: closeAnd(onPetitionVoid, {
                title: resolvePetitionVoidMenuLabel(flowStage?.stageName),
                message: 'هل تريد تسجيل إبطال العريضة؟ هذا الإجراء له آثار قانونية على سير الدعوى.',
                confirmLabel: 'تأكيد',
                danger: true,
            }),
        });
    }

    if (actions.length === 0) return null;

    const panelBackdrop = isDock ? pearlFlow.flowBackdrop : 'fixed inset-0 z-[9998] bg-[#05060D]/50 backdrop-blur-[2px] animate-in fade-in duration-200';
    const panelShell = isDock
        ? pearlFlow.flowPanel
        : 'fixed top-[72px] left-1/2 -translate-x-1/2 w-[92vw] max-w-[360px] z-[9999] font-[\'Tajawal\'] animate-in zoom-in-95 fade-in duration-200 rounded-2xl border border-white/[0.1] bg-[#0A0F1C]/85 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden';
    const panelHeader = isDock
        ? pearlFlow.header
        : 'relative px-4 py-3.5 border-b border-white/[0.08] bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent';

    const panel = isOpen && (
        <>
            <div className={panelBackdrop} onClick={() => setIsOpen(false)} />
            <div className={panelShell} dir="rtl">
                <div className={panelHeader}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className={isDock ? pearlFlow.closeBtn : 'absolute left-3 top-3 p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors'}
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                    <h3 className={`font-bold text-[13px] flex items-center gap-2 ${isDock ? 'text-[#FFFEF9]' : 'text-white/95 pr-1'}`}>
                        <Activity size={16} className={isDock ? 'text-[#C9B89A]' : 'text-[#E6C673] shrink-0'} strokeWidth={1.75} />
                        سير الدعوى
                    </h3>
                </div>
                <div className={`${isDock ? 'px-2 py-2 space-y-1' : 'px-2 py-3 space-y-1'}`}>
                    {actions.map((a) => (
                        <FlowActionRow key={a.key} label={a.label} icon={a.icon} iconClass={a.iconClass} onClick={a.onClick} />
                    ))}
                </div>
            </div>
        </>
    );

    const confirmDialog = pendingConfirm ? (
        <PersonalStatusFlowConfirmDialog
            isOpen
            title={pendingConfirm.title}
            message={pendingConfirm.message}
            confirmLabel={pendingConfirm.confirmLabel}
            danger={pendingConfirm.danger}
            onConfirm={pendingConfirm.onConfirm}
            onCancel={() => setPendingConfirm(null)}
        />
    ) : null;

    if (isDock) {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={PS_DOCK_BTN_ROSE}
                    title="سير الدعوى"
                >
                    <Activity size={17} strokeWidth={1.75} />
                </button>
                {panel && createPortal(panel, document.body)}
                {confirmDialog}
            </>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.10] text-white/70 hover:text-[#E6C673] hover:border-[#E6C673]/25 hover:bg-[#E6C673]/[0.06] transition-all duration-200 shrink-0"
                title="سير الدعوى"
            >
                <Activity size={14} strokeWidth={1.75} className="text-[#E6C673]/80" />
                <span className="text-[11px] font-bold whitespace-nowrap">سير الدعوى</span>
            </button>
            {panel && createPortal(panel, document.body)}
            {confirmDialog}
        </>
    );
});
