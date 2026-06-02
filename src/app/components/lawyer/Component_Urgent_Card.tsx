import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, AlertCircle, CheckCircle2, Scale, FileText, MapPin, Calendar, Trash2, RotateCcw } from 'lucide-react';
import { preloadActiveOrderFilePanel } from './DeferredActiveOrderFile';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildUrgentWorkspacePin } from '@/app/workspace/workspacePinBuilders';

export type UrgentCaseStatus = 'critical' | 'warning' | 'safe' | 'expired' | 'completed';
export type UrgentCaseType = 'urgent_action' | 'state_order';
export type ActionPhase = 'notification_pending' | 'grievance_window' | 'cassation_window' | 'completed';
export type LegalState = 'Awaiting_Grievance' | 'Grievance_Filed' | 'Awaiting_Cassation';

export type CaseNote = {
    id: string;
    text: string;
    createdAt: string;
};

export type CaseAttachment = {
    id: string;
    kind: 'file' | 'link';
    name: string;
    url?: string;
    createdAt: string;
};

export type CaseFollowup = {
    id: string;
    title: string;
    date: string;
    completed: boolean;
    createdAt: string;
};

export type InitialNotificationMethod = 'personal' | 'by_agent' | 'publication';

export type HearingStage = 'pre_decision' | 'grievance';

export type CaseHearing = {
    id: string;
    stage: HearingStage;
    sessionDate: string;
    notes: string;
    nextSessionDate: string;
    createdAt: string;
};

export type ExpertModule = {
    enabled: boolean;
    expertName: string;
    depositAmount: string;
    inspectionDate: string;
    reportDueDate: string;
    reportReceivedDate: string;
};

export type CasePartyEntry = {
    name: string;
    type?: string;
    phone?: string;
    address?: string;
    isRepresented?: boolean;
    /** يُشتق من موكلي المطلوب ضده في النموذج */
    isClient?: boolean;
};

export interface UrgentCase {
    id: string;
    type: UrgentCaseType;
    actionType: string; // "الكشف المستعجل", "الحجز الاحتياطي", etc.
    applicantName: string;
    court: string;
    requestNumber?: string;
    requestDate?: string;
    courtName?: string;
    judgeName?: string;
    specificActionType?: string;
    /** تصنيف ثنائي: أوامر على عرائض | قضاء مستعجل — يتحكم بمسار التظلم والتمييز */
    procedureCategory?: 'petition_orders' | 'urgent_judiciary' | null;
    /** Phase 25 — تفاصيل جوهرية للإجراء (مرتبطة بنوع الطلب) */
    procedureDetails?: string | null;
    requestSubject?: string;
    urgentReason?: string;
    legalBasis?: string;
    requestNotes?: string;
    feeReceiptNumber?: string | null;
    feeReceiptDate?: string | null;
    initialNotificationMethod?: InitialNotificationMethod | null;
    initialNotificationDate?: string | null;
    party1Name?: string;
    party1Phone?: string;
    party1Address?: string;
    party2Name?: string;
    party2Address?: string;
    allParty1?: CasePartyEntry[];
    allParty2?: CasePartyEntry[];
    representedParty?: 'client' | 'opponent' | null;
    /** Phase 22 — وكيل المطلوب ضده: نقطة الدوران */
    defenderEntryPhase?: 1 | 2 | 3 | null;
    clientRole?: 'respondent' | 'applicant' | null;
    /** تاريخ صدور الأمر عند الدخول من مرحلة التظلم */
    stateOrderIssuedDate?: string | null;
    deadlineDate?: Date | null;
    sessionDate?: Date | null;
    notificationDate?: Date | string | null;
    deadlineDays?: number | null;
    firstHearingDate?: string | null;
    preDecisionClosed?: boolean;
    expectedDecisionDate?: string | null;
    judgeDecision?: 'accepted' | 'rejected' | 'partially_accepted' | null;
    judgeDecisionDate?: string | null;
    hasIntervention?: boolean;
    isMainLawsuitFiled?: boolean;
    guaranteeKind?: 'cash' | 'personal' | 'real_estate' | 'none' | null;
    guaranteeDetailsText?: string | null;
    legalState?: LegalState | null;
    rejectionNotificationDate?: string | null;
    grievanceOutcome?: 'filed' | 'expired' | null;
    grievanceFiledBy?: 'client' | 'opponent' | null;
    grievanceFilingDate?: string | null;
    /** تاريخ أول جلسة تظلم (منفصل تماماً عن firstHearingDate) */
    grievanceFirstHearingDate?: string | null;
    grievanceSessionDate?: string | null;
    grievanceDecision?: 'confirmed' | 'modified' | 'canceled' | null;
    grievanceDecisionDate?: string | null;
    cassationOutcome?: 'filed' | 'expired' | null;
    cassationFiledBy?: 'client' | 'opponent' | null;
    cassationFilingDate?: string | null;
    cassationFileNumber?: string | null;
    cassationDecision?: 'confirmed' | 'modified' | 'canceled' | null;
    cassationDecisionDate?: string | null;
    archived?: boolean;
    archivedAt?: string | null;
    archivedReason?: string | null;
    deleted?: boolean;
    deletedAt?: string | null;
    deletedReason?: string | null;
    guaranteeStatus?: boolean;
    requiresGuarantee?: boolean;
    guaranteeSubmitted?: boolean;
    guaranteeRecovered?: boolean;
    guaranteeRecoveryDate?: string | null;
    orderLifted?: boolean;
    orderLiftDate?: string | null;
    hearings?: CaseHearing[];
    expertModule?: ExpertModule;
    notes?: CaseNote[];
    events?: Array<{ id: string; kind: 'system' | 'action' | 'edit'; message: string; createdAt: string }>;
    attachments?: CaseAttachment[];
    followups?: CaseFollowup[];
    phase: ActionPhase;
    isNotificationConfirmed?: boolean;
    grievanceResult?: 'affirmed' | 'modified' | 'cancelled' | null;
    status: UrgentCaseStatus;
    createdAt: Date;
}

const defaultMsPerDay = 1000 * 60 * 60 * 24;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const toDate = (v: unknown): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
};

export const computeUrgentCaseStatus = (
    c: Omit<UrgentCase, 'status'> & { status?: UrgentCaseStatus },
    opts?: { now?: Date; msPerDay?: number; grievanceDays?: number },
): UrgentCaseStatus => {
    const msPerDay = typeof opts?.msPerDay === 'number' && opts.msPerDay > 0 ? opts.msPerDay : defaultMsPerDay;
    const now = opts?.now instanceof Date ? opts.now : new Date();
    const grievanceDays = typeof opts?.grievanceDays === 'number' && opts.grievanceDays > 0 ? opts.grievanceDays : 3;

    if (c.phase === 'completed' || c.status === 'completed') return 'completed';
    if (c.type === 'state_order') {
        if (c.judgeDecision === 'accepted' && !c.notificationDate) return 'safe';
        if (!c.notificationDate) return 'safe';
        const hasGrievanceLogged =
            c.legalState === 'Grievance_Filed' ||
            c.grievanceOutcome === 'filed' ||
            c.grievanceDecision === 'confirmed' ||
            c.grievanceDecision === 'modified' ||
            c.grievanceDecision === 'canceled';

        const base = toDate(c.notificationDate);
        if (!base) return 'safe';
        const target = new Date(base.getTime() + grievanceDays * msPerDay);

        if (c.legalState === 'Awaiting_Grievance' && !hasGrievanceLogged) {
            const daysLeft = Math.ceil((startOfDay(target) - startOfDay(now)) / msPerDay);
            if (daysLeft < 0) return 'completed';
            if (daysLeft <= 1) return 'critical';
            if (daysLeft <= 3) return 'warning';
            return 'safe';
        }

        const days = Math.ceil((startOfDay(target) - startOfDay(now)) / msPerDay);
        if (days < 0) return 'expired';
        if (days <= 2) return 'critical';
        if (days <= 7) return 'warning';
        return 'safe';
    }

    const target = (c as any).deadlineDate ?? (c as any).sessionDate;
    const targetDate = toDate(target);
    if (!targetDate) return 'safe';
    const days = Math.ceil((startOfDay(targetDate) - startOfDay(now)) / msPerDay);
    if (days < 0) return 'expired';
    if (days <= 2) return 'critical';
    if (days <= 7) return 'warning';
    return 'safe';
};

export const isUrgentCaseClosed = (c: Partial<UrgentCase>) => {
    if (!c || typeof c !== 'object') return false;
    if (c.phase === 'completed') return true;
    const judge = c.judgeDecision;
    if (judge !== 'accepted' && judge !== 'rejected') return false;
    const grievanceExpired = c.grievanceOutcome === 'expired';
    const grievanceDecided = c.grievanceDecision === 'confirmed' || c.grievanceDecision === 'modified' || c.grievanceDecision === 'canceled';
    const cassationExpired = c.cassationOutcome === 'expired';
    const cassationDecided = c.cassationDecision === 'confirmed' || c.cassationDecision === 'modified' || c.cassationDecision === 'canceled';

    if (judge === 'accepted' && !c.notificationDate) return false;
    if (grievanceExpired) return true;
    if (grievanceDecided && (cassationExpired || cassationDecided)) return true;
    return false;
};

interface Props {
    case_data: UrgentCase;
    onQuickAction?: (actionType: 'notification' | 'grievance' | 'cassation', caseId: string) => void;
    onCaseClick?: (caseId: string) => void;
    onArchive?: (caseId: string) => void;
    onUnarchive?: (caseId: string) => void;
    onTrash?: (caseId: string) => void;
    onRestore?: (caseId: string) => void;
    onPermanentDelete?: (caseId: string) => void;
    scope?: 'active' | 'archive' | 'trash';
}

const Component_Urgent_CardInner: React.FC<Props> = ({
    case_data, 
    onQuickAction, 
    onCaseClick,
    onArchive,
    onUnarchive,
    onTrash,
    onRestore,
    onPermanentDelete,
    scope = 'active',
}) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const grievanceDays = 3;

    const submitted =
        typeof case_data.guaranteeSubmitted === 'boolean'
            ? case_data.guaranteeSubmitted
            : typeof case_data.guaranteeStatus === 'boolean'
              ? case_data.guaranteeStatus
              : false;
    const requires =
        typeof case_data.requiresGuarantee === 'boolean' ? case_data.requiresGuarantee : false;
    const isWaitingNotification =
        case_data.type === 'state_order' &&
        case_data.judgeDecision === 'accepted' &&
        (!case_data.notificationDate || (requires && !submitted));
    const notificationBase = case_data.notificationDate ? new Date(case_data.notificationDate) : null;
    const deadlineDays = typeof case_data.deadlineDays === 'number' && case_data.deadlineDays > 0 ? case_data.deadlineDays : 3;
    const grievanceDeadline = notificationBase ? new Date(notificationBase.getTime() + deadlineDays * msPerDay) : null;
    const targetDate =
        case_data.type === 'state_order'
            ? grievanceDeadline
            : case_data.sessionDate
              ? new Date(case_data.sessionDate)
              : case_data.deadlineDate
                ? new Date(case_data.deadlineDate)
                : null;
    const targetLabel = case_data.sessionDate ? 'موعد الجلسة' : 'الموعد النهائي';
    const targetText = targetDate ? targetDate.toLocaleDateString('ar-IQ') : null;

    const daysBadgeText = () => {
        if (case_data.deleted || case_data.archived || case_data.phase === 'completed' || case_data.status === 'completed') return null;
        if (!targetDate || isWaitingNotification) return null;
        const diffDays = Math.ceil((startOfDay(targetDate) - startOfDay(new Date())) / msPerDay);
        if (diffDays < 0) return 'انتهت المدة القانونية';
        if (diffDays === 0) return 'اليوم هو الموعد الأخير';
        if (diffDays === 1) return 'تنتهي غداً';
        return `متبقي ${diffDays} أيام`;
    };

    const getStatusConfig = () => {
        switch (case_data.status) {
            case 'critical':
                return {
                    dot: 'bg-red-500',
                    dotPulse: 'animate-pulse',
                    border: 'border-red-500/50',
                    bg: 'from-red-900/30 to-red-800/10',
                    timerBg: 'bg-red-500/20',
                    timerText: 'text-red-300',
                    icon: '🚨'
                };
            case 'warning':
                return {
                    dot: 'bg-amber-500',
                    dotPulse: 'animate-pulse',
                    border: 'border-amber-500/50',
                    bg: 'from-amber-900/30 to-amber-800/10',
                    timerBg: 'bg-amber-500/20',
                    timerText: 'text-amber-300',
                    icon: '⚠️'
                };
            case 'safe':
                return {
                    dot: 'bg-blue-500',
                    dotPulse: '',
                    border: 'border-blue-500/30',
                    bg: 'from-blue-900/20 to-blue-800/5',
                    timerBg: 'bg-blue-500/20',
                    timerText: 'text-blue-300',
                    icon: '⏳'
                };
            case 'expired':
                return {
                    dot: 'bg-gray-500',
                    dotPulse: '',
                    border: 'border-gray-500/30',
                    bg: 'from-gray-900/20 to-gray-800/5',
                    timerBg: 'bg-gray-500/20',
                    timerText: 'text-gray-400',
                    icon: '⌛'
                };
            case 'completed':
                return {
                    dot: 'bg-green-500',
                    dotPulse: '',
                    border: 'border-green-500/30',
                    bg: 'from-green-900/20 to-green-800/5',
                    timerBg: 'bg-green-500/20',
                    timerText: 'text-green-300',
                    icon: '✅'
                };
        }
    };

    const getPhaseLabel = (): string => {
        if (case_data.status === 'completed' || case_data.phase === 'completed') return 'مكتسب الدرجة القطعية';
        if (case_data.type === 'state_order') {
            if (case_data.judgeDecision === 'accepted' && !case_data.notificationDate) return 'بانتظار التبليغ الأصولي';
            if (case_data.judgeDecision !== 'accepted') return 'بانتظار قرار القاضي';
            if (case_data.legalState === 'Awaiting_Grievance' && case_data.notificationDate) {
                const base = new Date(case_data.notificationDate);
                const target = new Date(base.getTime() + grievanceDays * msPerDay);
                const remainingDays = Math.ceil((startOfDay(target) - startOfDay(new Date())) / msPerDay);
                if (remainingDays < 0) return 'مكتسب الدرجة القطعية';
                if (remainingDays === 0) return '⏳ اليوم آخر يوم للتظلم';
                if (remainingDays === 1) return '⏳ متبقي يوم واحد للتظلم';
                return `⏳ متبقي ${remainingDays} أيام للتظلم`;
            }
            return `مدة التظلم (${grievanceDays} أيام)`;
        }
        switch (case_data.phase) {
            case 'notification_pending':
                return 'بانتظار التبليغ الأصولي';
            case 'grievance_window':
                return `مدة التظلم (${deadlineDays} أيام)`;
            case 'cassation_window':
                return 'مدة التمييز (7 أيام)';
            default:
                return '';
        }
    };

    const getQuickActionButton = () => {
        if (case_data.status === 'completed') return null;

        // For Urgent Actions
        if (case_data.type === 'urgent_action' && case_data.phase === 'notification_pending') {
            return (
                <button type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickAction?.('notification', case_data.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-lg"
                >
                    <CheckCircle2 size={14} />
                    <span>تأكيد التبليغ</span>
                </button>
            );
        }

        // For State Orders - Grievance Phase
        if (case_data.type === 'state_order' && case_data.phase === 'grievance_window') {
            if (!case_data.judgeDecision) return null;
            if (case_data.judgeDecision !== 'accepted' && case_data.judgeDecision !== 'rejected') return null;
            if (!case_data.notificationDate) return null;
            return (
                <button type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickAction?.('grievance', case_data.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-lg"
                >
                    <Scale size={14} />
                    <span>تسجيل التظلم الآن</span>
                </button>
            );
        }

        // For State Orders - Cassation Phase
        if (case_data.type === 'state_order' && case_data.phase === 'cassation_window') {
            return (
                <button type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onQuickAction?.('cassation', case_data.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-lg"
                >
                    <Scale size={14} />
                    <span>تسجيل التمييز</span>
                </button>
            );
        }

        return null;
    };

    const phaseLabel = getPhaseLabel();
    const bottomBarStatusText = isWaitingNotification ? 'بانتظار التبليغ الأصولي' : null;
    const showPhaseBadge = case_data.status !== 'completed' && !!phaseLabel && phaseLabel !== bottomBarStatusText;
    const quickAction = getQuickActionButton();

    const config = getStatusConfig();
    const workspacePin = buildUrgentWorkspacePin(case_data);
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            onPointerEnter={() => preloadActiveOrderFilePanel()}
            onClick={() => onCaseClick?.(case_data.id)}
            className={`font-['Tajawal'] group relative bg-gradient-to-br ${config.bg} border-2 ${config.border} rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-black/20`}
        >
            {/* Status Dot - Top Left */}
            <div className="absolute top-4 left-4">
                <div className={`w-3 h-3 rounded-full ${config.dot} ${config.dotPulse}`} />
            </div>

            <div className="absolute top-3 left-12 flex items-center gap-1 opacity-100 transition-all">
                {workspacePin ? (
                    <div onPointerDown={(e) => e.stopPropagation()} role="presentation">
                        <WorkspacePinButton item={workspacePin} />
                    </div>
                ) : null}
                {scope === 'trash' ? (
                    <>
                        <button
                            type="button"
                            title="استعادة"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRestore?.(case_data.id);
                            }}
                            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
                        >
                            <RotateCcw size={16} />
                        </button>
                        <button
                            type="button"
                            title="حذف نهائي"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onPermanentDelete?.(case_data.id);
                            }}
                            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-red-300 hover:text-red-200 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        title="نقل إلى سلة المهملات"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onTrash?.(case_data.id);
                        }}
                        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-red-300 hover:text-red-200 transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Icon Badge - Top Right */}
            <div className="absolute top-3 right-3 text-2xl">
                {config.icon}
            </div>

            {/* Content */}
            <div className="mt-6 mb-4">
                {/* Title */}
                <h3 className="text-white font-bold text-base mb-2 leading-relaxed line-clamp-2">
                    {case_data.actionType} - {case_data.applicantName}
                </h3>

                {/* Court Info */}
                <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
                    <MapPin size={12} />
                    <span>المحكمة: {case_data.court}</span>
                </div>

                {/* Phase Badge */}
                {showPhaseBadge && (
                    <div className="flex items-center gap-2 mb-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                            <FileText size={11} />
                            <span className="text-white/80 text-[10px] font-bold">{phaseLabel}</span>
                        </div>
                    </div>
                )}

                {/* Session/Deadline Date if exists */}
                {(case_data.sessionDate || case_data.deadlineDate) && (
                    <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
                        <Calendar size={12} />
                        <span>
                            {case_data.sessionDate 
                                ? `موعد الجلسة: ${new Date(case_data.sessionDate).toLocaleDateString('ar-IQ')}`
                                : `الموعد النهائي: ${new Date(case_data.deadlineDate!).toLocaleDateString('ar-IQ')}`
                            }
                        </span>
                    </div>
                )}
            </div>

            {/* Quick Action Button */}
            {quickAction && (
                <div className="mb-4">
                    {quickAction}
                </div>
            )}

            {/* Timer Strip - Bottom */}
            {case_data.status !== 'completed' && (
                <div className={`${config.timerBg} rounded-lg px-3 py-2 border border-white/10`}>
                    <div className="flex items-center justify-between">
                        {isWaitingNotification ? (
                            <div className="flex items-center gap-2 min-w-0">
                                <Clock size={14} className="text-cyan-200" />
                                <span className="text-cyan-200 text-xs font-bold truncate">
                                    ⏳ بانتظار التبليغ الأصولي
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 min-w-0">
                                <Calendar size={14} className={config.timerText} />
                                <span className={`${config.timerText} text-xs font-bold truncate`}>
                                    {targetText ? `${targetLabel}: ${targetText}` : targetLabel}
                                </span>
                            </div>
                        )}
                        {daysBadgeText() && (
                            <span
                                className={`text-[11px] font-extrabold px-2 py-1 rounded-full border ${
                                    daysBadgeText() === 'انتهت المدة القانونية'
                                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                        : 'bg-white/10 text-white/80 border-white/20'
                                }`}
                            >
                                {daysBadgeText()}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Completed Badge */}
            {case_data.status === 'completed' && (
                <div className="bg-green-500/15 rounded-lg px-3 py-2 border border-green-500/25">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-400" />
                            <span className="text-green-300 text-xs font-bold">منجز ومكتسب الدرجة القطعية</span>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export const Component_Urgent_Card = React.memo(Component_Urgent_CardInner);
