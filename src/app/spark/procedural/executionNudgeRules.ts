import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionSparkContext } from '@/app/spark/context/executionSparkContext';

function claimHint(ctx: ExecutionSparkContext): string {
    const label = ctx.signals.claimTypeLabel;
    return label ? ` (${label})` : '';
}

/** قواعد محلية لإضبارة التنفيذ — Wave 2: حالة التبليغ، نوع المطالبة، السجل الزمني */
export function collectExecutionSparkNudges(ctx: ExecutionSparkContext): SparkNudge[] {
    if (ctx.lifecycleStatus === 'finished') return [];

    const nudges: SparkNudge[] = [];
    const { signals: s } = ctx;
    const claimSuffix = claimHint(ctx);

    if (s.showUnservedMemo || (s.globalStatus === 'UNNOTIFIED' && s.remainingDebt > 0)) {
        const debtorLabel = s.unnotifiedDebtorLabels[0] ?? s.primaryDebtorLabel;
        nudges.push({
            id: `${ctx.dossierKey}:debtor-unnotified`,
            kind: 'execution.debtor_unnotified',
            surface: 'execution',
            priority: 4,
            message: `المدين ${debtorLabel} غير مبلّغ بعد${claimSuffix} — هل تود فتح التبليغ أو مذكرة الإخبار؟`,
            presence: {
                present: s.claimTypes.length ? s.claimTypes : ['إضبارة تنفيذ'],
                missing: ['تبليغ المدين', 'مذكرة إخبار'],
            },
            source: 'executionStateMachine.UNNOTIFIED',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح التبليغ', actionId: 'open_summons' },
        });
    }

    if (s.subsequentSummonsDue) {
        nudges.push({
            id: `${ctx.dossierKey}:subsequent-summons`,
            kind: 'execution.subsequent_summons_round',
            surface: 'execution',
            priority: 5,
            message: `انتهت المهلة الرضائية دون حضور ${s.primaryDebtorLabel}${claimSuffix} — هل تود إصدار تبليغ الحضور الإلزامي (الجولة الثانية)؟`,
            presence: {
                present: ['تبليغ أول', 'مهلة منتهية'],
                missing: ['تبليغ حضور إلزامي'],
            },
            source: 'execution.subsequentNoticeFlow.round2',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح التبليغ', actionId: 'open_summons' },
        });
    } else if (
        s.absenceFollowupDue &&
        !(s.employeeFinancialSalaryOnlyCoercive && s.subsequentNoticeUnlocked)
    ) {
        nudges.push({
            id: `${ctx.dossierKey}:absence-followup`,
            kind: 'execution.debtor_absence_followup',
            surface: 'execution',
            priority: 5,
            message: `انتهت المهلة الرضائية دون حضور ${s.primaryDebtorLabel}${claimSuffix} — هل تود تسجيل عدم الحضور أو التبليغ اللاحق؟`,
            presence: {
                present: ['مهلة رضائية منتهية'],
                missing: ['تبليغ لاحق / إجراء جبري'],
            },
            source: 'execution.subsequentNoticeFlow',
            dossierKey: ctx.dossierKey,
            action: { label: 'متابعة التبليغ', actionId: 'open_summons' },
        });
    }

    const coerciveActions = ctx.runtimeOverlay?.activeCoerciveActions ?? ctx.executionData.activeCoerciveActions ?? [];

    if (s.primaryDebtorTaklifActive) {
        nudges.push({
            id: `${ctx.dossierKey}:employee-taklif`,
            kind: 'execution.employee_taklif_active',
            surface: 'execution',
            priority: 4,
            message: `تكليف موظف حكومي قيد المتابعة لـ ${s.primaryDebtorLabel}${claimSuffix} — هل تود تحديث حالة التكليف؟`,
            presence: {
                present: ['مسار موظف حكومي', 'تكليف نشط'],
                missing: ['تحديث مرحلة التكليف'],
            },
            source: 'execution.employee_summons_assignments',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح التكليف', actionId: 'open_employee_assignment' },
        });
    } else if (s.showEmployeeAssignmentCoerciveBlock) {
        nudges.push({
            id: `${ctx.dossierKey}:employee-assignment-coercive`,
            kind: 'execution.employee_assignment_coercive',
            surface: 'execution',
            priority: 5,
            message: `تكليف الموظف تجاوز المرحلة النشطة${claimSuffix} — هل تود متابعة الإجراء الجبري (غياب / تحقيق / أمر قبض)؟`,
            presence: {
                present: ['تكليف موظف'],
                missing: ['إجراء جبري لاحق'],
            },
            source: 'execution.employee_summons_assignments.coercive',
            dossierKey: ctx.dossierKey,
            action: { label: 'متابعة التكليف', actionId: 'open_employee_assignment' },
        });
    } else if (
        s.employeeFinancialSalaryOnlyCoercive &&
        s.subsequentNoticeUnlocked &&
        s.notificationCount >= 1 &&
        !coerciveActions.includes('salary')
    ) {
        nudges.push({
            id: `${ctx.dossierKey}:employee-salary`,
            kind: 'execution.employee_salary_coercive',
            surface: 'execution',
            priority: 5,
            message: `المدين موظف حكومي${s.isAlimonyClaim ? ' (نفقة)' : ''}${claimSuffix} — المسار الجبري عبر حجز الراتب. هل تود فتح طلب الحجز؟`,
            presence: {
                present: ['موظف حكومي', 'تبليغ سابق'],
                missing: ['حجز راتب'],
            },
            source: 'execution.subsequentNoticeFlow.employee_monetary',
            dossierKey: ctx.dossierKey,
            action: { label: 'حجز الراتب', actionId: 'open_coercive' },
        });
    } else if (s.showDebtorSummonsAttendanceBadge && !s.subsequentSummonsDue) {
        nudges.push({
            id: `${ctx.dossierKey}:summons-attendance`,
            kind: 'execution.employee_summons_attendance',
            surface: 'execution',
            priority: 6,
            message: `التبليغ اللاحق مفتوح لـ ${s.primaryDebtorLabel}${claimSuffix} — هل تود تسجيل حضور المدين أو متابعة الإجراء؟`,
            presence: {
                present: ['تبليغ لاحق'],
                missing: ['حضور أو إجراء'],
            },
            source: 'execution.subsequentNoticeFlow.attendance',
            dossierKey: ctx.dossierKey,
            action: { label: 'متابعة الحضور', actionId: 'open_summons' },
        });
    }

    if (s.gracePeriodEndingSoon) {
        nudges.push({
            id: `${ctx.dossierKey}:grace-ending`,
            kind: 'execution.grace_period_ending',
            surface: 'execution',
            priority: 6,
            message: `تبقّى ${s.primaryDebtorDaysRemaining} يوماً على انتهاء المهلة الرضائية لـ ${s.primaryDebtorLabel}${claimSuffix}.`,
            presence: {
                present: ['فترة رضائية'],
                missing: [`${s.primaryDebtorDaysRemaining} أيام متبقية`],
            },
            source: 'executionStateMachine.GRACE_PERIOD',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة المحضر', actionId: 'open_followup' },
        });
    }

    if (s.coerciveReadyUnresolved) {
        nudges.push({
            id: `${ctx.dossierKey}:coercive-ready`,
            kind: 'execution.ready_for_coercive',
            surface: 'execution',
            priority: 7,
            message:
                s.isEvictionModule
                    ? `الإضبارة جاهزة لإجراءات الإخلاء الجبرية${claimSuffix} — هل تود فتح المحضر الميداني؟`
                    : `المدين ${s.primaryDebtorLabel} جاهز للتنفيذ الجبري${claimSuffix} — هل تود اتخاذ إجراء؟`,
            presence: {
                present: ['جاهز للتنفيذ'],
                missing: ['إجراء جبري مسجّل'],
            },
            source: 'executionStateMachine.READY_FOR_COERCIVE',
            dossierKey: ctx.dossierKey,
            action: {
                label: s.isEvictionModule ? 'إجراءات الإخلاء' : 'الإجراءات الجبرية',
                actionId: 'open_coercive',
            },
        });
    }

    if (ctx.voluntaryPeriodGap) {
        const gap = ctx.voluntaryPeriodGap;
        const evictionLabel = gap.isEviction ? 'إخلاء — ' : '';
        nudges.push({
            id: `${ctx.dossierKey}:voluntary-period`,
            kind: gap.isEviction ? 'execution.eviction_voluntary_period_end' : 'execution.voluntary_period_end',
            surface: 'execution',
            priority: 8,
            message:
                gap.daysSincePeriodEnd <= 0
                    ? `${evictionLabel}انتهت مدة التنفيذ الرضائي لـ ${gap.debtorLabel}${claimSuffix} — هل تود تسجيل انتهائها أو متابعة التبليغ؟`
                    : `${evictionLabel}مرّت ${gap.daysSincePeriodEnd} يوماً على انتهاء المهلة الرضائية لـ ${gap.debtorLabel}${claimSuffix} دون تسجيل — هل يهمك الأمر؟`,
            presence: {
                present: [
                    gap.isEviction ? 'تبليغ إخلاء' : `مذكرة إخبار: ${gap.anchorDate}`,
                    'مهلة 7 أيام',
                ],
                missing: ['إعلان انتهاء المدة الرضائية'],
            },
            source: gap.isEviction
                ? 'execution.eviction_first_notice_date'
                : 'execution.execution_memo_anchor_date',
            dossierKey: ctx.dossierKey,
            action: { label: 'متابعة التبليغ', actionId: 'open_summons' },
        });
    }

    if (s.dormancyDaysSinceAction != null) {
        const daysToExpiry = Math.max(0, 365 - s.dormancyDaysSinceAction);
        nudges.push({
            id: `${ctx.dossierKey}:dormancy`,
            kind: 'execution.dormancy_art112',
            surface: 'execution',
            priority: 9,
            message: `الإضبارة راكدة منذ ${s.dormancyDaysSinceAction} يوماً${claimSuffix} — يتبقّى نحو ${daysToExpiry} يوماً قبل سقوط الحق (م. 112 ق.ت.).`,
            presence: {
                present: [`${s.dormancyDaysSinceAction} يوم بدون إجراء`],
                missing: ['إجراء تنفيذي يوقف الركود'],
            },
            source: 'executionAlerts.dormancy',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح السجل', actionId: 'open_timeline' },
        });
    }

    if (s.guarantorNoticePending && !s.subsequentSummonsDue) {
        nudges.push({
            id: `${ctx.dossierKey}:guarantor-notice`,
            kind: 'execution.guarantor_notice_pending',
            surface: 'execution',
            priority: 12,
            message: `مهلة تبليغ الكفيل قيد السير${claimSuffix} — تابع الحضور أو تفعيل الكفالة.`,
            presence: {
                present: ['تبليغ كفيل'],
                missing: ['حضور أو إنهاء المهلة'],
            },
            source: 'execution.guarantor_notification',
            dossierKey: ctx.dossierKey,
            action: { label: 'متابعة الكفيل', actionId: 'open_followup' },
        });
    }

    if (ctx.detentionJudgePending) {
        nudges.push({
            id: `${ctx.dossierKey}:detention-judge`,
            kind: 'execution.detention_judge_followup',
            surface: 'execution',
            priority: 3,
            message: 'يوجد طلب حبس تنفيذي بانتظار قرار القاضي — هل تود تسجيل النتيجة؟',
            presence: {
                present: ['موافقة المنفذ على الحبس'],
                missing: ['قرار القاضي في السجل'],
            },
            source: 'execution.executive_detention_judge_outcome',
            dossierKey: ctx.dossierKey,
            action: { label: 'تسجيل قرار القاضي', actionId: 'record_detention_judge' },
        });
    }

    if (s.urgentTimelineDeadline) {
        const d = s.urgentTimelineDeadline;
        nudges.push({
            id: `${ctx.dossierKey}:timeline-deadline`,
            kind: 'execution.timeline_urgent_deadline',
            surface: 'execution',
            priority: 11,
            message: `مهلة قريبة في السجل: «${d.title}»${claimSuffix} — تبقّى ${d.daysLeft} يوماً (${d.deadlineDate}).`,
            presence: {
                present: [d.title],
                missing: [`مهلة ${d.deadlineDate}`],
            },
            source: 'execution.timelineEvents.deadlineDate',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة السجل', actionId: 'open_timeline' },
        });
    }

    if (s.publicationNearEnd) {
        nudges.push({
            id: `${ctx.dossierKey}:publication`,
            kind: 'execution.publication_period_near',
            surface: 'execution',
            priority: 12,
            message: `مدة تبليغ النشر (15 يوماً) تقترب من الانتهاء${claimSuffix} — تبقّى ${s.publicationNearEnd.daysLeft} يوماً.`,
            presence: {
                present: ['تبليغ بالنشر'],
                missing: ['إعلان انتهاء مدة النشر'],
            },
            source: 'execution.publication_notice_by_debtor',
            dossierKey: ctx.dossierKey,
            action: { label: 'متابعة النشر', actionId: 'open_summons' },
        });
    }

    if (ctx.pendingExecutorDecisionCount > 0) {
        const count = ctx.pendingExecutorDecisionCount;
        nudges.push({
            id: `${ctx.dossierKey}:pending-decisions`,
            kind: 'execution.pending_executor_decision',
            surface: 'execution',
            priority: 13,
            message:
                count === 1
                    ? 'يوجد قرار منفذ بانتظار الرد في السجل — هل تود مراجعته؟'
                    : `يوجد ${count} قرارات منفذ بانتظار الرد — هل تود مراجعتها؟`,
            presence: {
                present: ['قرارات منفذ مسجّلة'],
                missing: ['رد المنفذ على القرار'],
            },
            source: 'executorSeizureDecisionQueue.pending',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة القرارات', actionId: 'open_decisions' },
        });
    }

    if (s.stalePaymentDaysSince != null) {
        nudges.push({
            id: `${ctx.dossierKey}:stale-payment`,
            kind: 'execution.stale_payments',
            surface: 'execution',
            priority: 14,
            message: `لا توجد دفعات منذ ${s.stalePaymentDaysSince} يوماً${claimSuffix} مع رصيد متبقٍ — هل تود متابعة التحصيل؟`,
            presence: {
                present: [`رصيد: ${s.remainingDebt.toLocaleString()}`],
                missing: ['دفعة حديثة'],
            },
            source: 'executionAlerts.stalePayment',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح المحضر', actionId: 'open_followup' },
        });
    }

    if (s.pendingCaseTasks > 0) {
        nudges.push({
            id: `${ctx.dossierKey}:pending-tasks`,
            kind: 'execution.pending_case_tasks',
            surface: 'execution',
            priority: 15,
            message:
                s.pendingCaseTasks === 1
                    ? 'مهمة واحدة معلّقة في سجل الملاحظات — هل تود مراجعتها؟'
                    : `${s.pendingCaseTasks} مهام معلّقة في سجل الملاحظات — هل تود مراجعتها؟`,
            presence: {
                present: [`${s.pendingCaseTasks} مهمة`],
                missing: ['إنجاز المهمة'],
            },
            source: 'execution.caseTasksPending',
            dossierKey: ctx.dossierKey,
            action: { label: 'مراجعة المهام', actionId: 'open_timeline' },
        });
    }

    if (
        ctx.lifecycleStatus === 'paused' ||
        ctx.lifecycleStatus === 'suspended' ||
        ctx.executionPaused
    ) {
        const reason = String(ctx.executionData.dossier_status_reason ?? '').trim();
        nudges.push({
            id: `${ctx.dossierKey}:lifecycle-resume`,
            kind: 'execution.lifecycle_resume',
            surface: 'execution',
            priority: 20,
            message: reason
                ? `الإضبارة ${ctx.lifecycleStatus === 'suspended' ? 'موقوفة' : 'مستأخرة'} (${reason})${claimSuffix} — هل تود استئناف السير؟`
                : `الإضبارة متوقفة أو مستأخرة في السجل${claimSuffix} — هل تود استئناف السير؟`,
            presence: {
                present: [`حالة: ${ctx.lifecycleStatus}`],
                missing: ['استئناف السير'],
            },
            source: 'execution.dossier_lifecycle_status',
            dossierKey: ctx.dossierKey,
            action: { label: 'استئناف السير', actionId: 'resume_lifecycle' },
        });
    }

    return nudges.sort((a, b) => a.priority - b.priority);
}
