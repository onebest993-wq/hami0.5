import type { SparkNudge } from '@/app/spark/types';
import type { ExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import { EARNER_EXECUTIVE_DETENTION_MIN_IQD, EARNER_PERSONAL_COERCIVE_MIN_IQD } from '@/app/utils/earnerPersonalCoerciveFinancialGate';

const STALE_PAYMENT_DAYS = 60;
const INSTALLMENT_DUE_SOON_DAYS = 3;

function claimHint(ctx: ExecutionSparkContext): string {
    const label = ctx.signals.claimTypeLabel;
    return label ? ` (${label})` : '';
}

/** قواعد سبارك المرتبطة بالمركز المالي / الوعاء الموحّد */
export function collectExecutionFinancialSparkNudges(ctx: ExecutionSparkContext): SparkNudge[] {
    const fin = ctx.financialSignals;
    if (!fin?.isMonetaryClaim) return [];
    if (ctx.lifecycleStatus === 'finished') return [];

    const nudges: SparkNudge[] = [];
    const claimSuffix = claimHint(ctx);
    const remaining = fin.effectiveRemainingIqd;

    if (fin.settlementBreachTriggeredAt && remaining > 0) {
        nudges.push({
            id: `${ctx.dossierKey}:financial-settlement-breach`,
            kind: 'execution.financial_settlement_breach',
            surface: 'execution',
            priority: 2,
            message: `تم تسجيل إخلال في التسوية${claimSuffix} — المتبقي ${remaining.toLocaleString('ar-IQ')} د.ع. هل تود متابعة الكفالة أو المركز المالي؟`,
            presence: {
                present: ['إخلال تسوية'],
                missing: ['متابعة الكفالة / التحصيل'],
            },
            source: 'financialCenter.settlementBreachTriggeredAt',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح المركز المالي', actionId: 'open_financial_center' },
        });
    }

    if (fin.pendingSettlement && fin.settlementDuePhase === 'overdue' && !fin.settlementBreachTriggeredAt) {
        const ps = fin.pendingSettlement;
        const alimonyLabel = fin.tracksOngoingAlimonySettlement ? 'النفقة الشهرية' : 'التسوية';
        nudges.push({
            id: `${ctx.dossierKey}:financial-settlement-overdue`,
            kind: 'execution.financial_settlement_overdue',
            surface: 'execution',
            priority: 4,
            message: `تجاوز موعد تسديد ${alimonyLabel} (${ps.dueDate})${claimSuffix} — المبلغ ${ps.amount.toLocaleString('ar-IQ')} د.ع. هل تود تسجيل التسديد أو الإخلال؟`,
            presence: {
                present: [`تسوية: ${ps.amount.toLocaleString('ar-IQ')} د.ع`],
                missing: [`موعد ${ps.dueDate}`],
            },
            source: 'financialCenter.pendingSettlement.overdue',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح المركز المالي', actionId: 'open_financial_center' },
        });
    } else if (fin.pendingSettlement && fin.settlementDuePhase === 'due') {
        const ps = fin.pendingSettlement;
        const alimonyLabel = fin.tracksOngoingAlimonySettlement ? 'النفقة الشهرية' : 'التسوية';
        nudges.push({
            id: `${ctx.dossierKey}:financial-settlement-due`,
            kind: 'execution.financial_settlement_due',
            surface: 'execution',
            priority: 5,
            message: `موعد تسديد ${alimonyLabel} اليوم (${ps.dueDate})${claimSuffix} — ${ps.amount.toLocaleString('ar-IQ')} د.ع. هل تود متابعة السداد؟`,
            presence: {
                present: [`تسوية معلّقة: ${ps.amount.toLocaleString('ar-IQ')} د.ع`],
                missing: ['تسجيل التسديد'],
            },
            source: 'financialCenter.pendingSettlement.due',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح المركز المالي', actionId: 'open_financial_center' },
        });
    } else if (
        fin.pendingSettlement &&
        fin.settlementDuePhase === 'waiting' &&
        fin.pendingSettlement.dueDate
    ) {
        const ps = fin.pendingSettlement;
        const daysUntil = fin.settlementDaysUntilDue;
        const alimonyLabel = fin.tracksOngoingAlimonySettlement ? 'نفقة شهرية' : 'تسوية';
        const soon =
            daysUntil != null && daysUntil > 0 && daysUntil <= INSTALLMENT_DUE_SOON_DAYS;
        nudges.push({
            id: `${ctx.dossierKey}:financial-settlement-upcoming`,
            kind: soon && fin.tracksOngoingAlimonySettlement
                ? 'execution.financial_alimony_monthly_due'
                : 'execution.financial_settlement_upcoming',
            surface: 'execution',
            priority: soon ? 6 : 8,
            message: soon
                ? `يقترب موعد ${alimonyLabel} (${ps.dueDate})${claimSuffix} — ${ps.amount.toLocaleString('ar-IQ')} د.ع.`
                : `${alimonyLabel} معلّقة بموعد ${ps.dueDate}${claimSuffix} — ${ps.amount.toLocaleString('ar-IQ')} د.ع.`,
            presence: {
                present: [`${alimonyLabel} مسجّلة`],
                missing: [`موعد ${ps.dueDate}`],
            },
            source: fin.tracksOngoingAlimonySettlement
                ? 'financialCenter.pendingSettlement.alimony'
                : 'financialCenter.pendingSettlement.waiting',
            dossierKey: ctx.dossierKey,
            action: { label: 'المركز المالي', actionId: 'open_financial_center' },
        });
    }

    if (fin.alimonyNeedsMonthlySettlement) {
        nudges.push({
            id: `${ctx.dossierKey}:financial-alimony-setup`,
            kind: 'execution.financial_alimony_monthly_setup',
            surface: 'execution',
            priority: 9,
            message: `نفقة مستمرة ${fin.ongoingMonthlyAlimonyIqd.toLocaleString('ar-IQ')} د.ع/شهر${claimSuffix} — لم تُسجَّل تسوية شهرية بعد. هل تود ضبطها في المركز المالي؟`,
            presence: {
                present: [`${fin.ongoingMonthlyAlimonyIqd.toLocaleString('ar-IQ')} د.ع/شهر`],
                missing: ['تسوية شهرية'],
            },
            source: 'financialCenter.ongoingAlimony.setup',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح المركز المالي', actionId: 'open_financial_center' },
        });
    }

    if (
        fin.salaryInstallmentDueYmd &&
        fin.salaryInstallmentAmountIqd != null &&
        fin.salaryInstallmentDaysUntilDue != null &&
        remaining > 0
    ) {
        const days = fin.salaryInstallmentDaysUntilDue;
        const amt = fin.salaryInstallmentAmountIqd;
        const due = fin.salaryInstallmentDueYmd;
        if (days < 0) {
            nudges.push({
                id: `${ctx.dossierKey}:financial-installment-overdue`,
                kind: 'execution.financial_installment_overdue',
                surface: 'execution',
                priority: 6,
                message: `تأخر قسط حجز الراتب (${due})${claimSuffix} — ${amt.toLocaleString('ar-IQ')} د.ع منذ ${Math.abs(days)} يوماً.`,
                presence: {
                    present: ['جدول حجز راتب'],
                    missing: ['قسط الشهر'],
                },
                source: 'execution.salary_garnishment_installment_schedule',
                dossierKey: ctx.dossierKey,
                action: { label: 'المركز المالي', actionId: 'open_financial_center' },
            });
        } else if (days <= INSTALLMENT_DUE_SOON_DAYS) {
            nudges.push({
                id: `${ctx.dossierKey}:financial-installment-due`,
                kind: 'execution.financial_installment_due',
                surface: 'execution',
                priority: 7,
                message:
                    days === 0
                        ? `موعد قسط حجز الراتب اليوم${claimSuffix} — ${amt.toLocaleString('ar-IQ')} د.ع.`
                        : `يقترب موعد قسط حجز الراتب (${due})${claimSuffix} — ${amt.toLocaleString('ar-IQ')} د.ع.`,
                presence: {
                    present: ['جدول حجز راتب'],
                    missing: [`موعد ${due}`],
                },
                source: 'execution.salary_garnishment_installment_schedule',
                dossierKey: ctx.dossierKey,
                action: { label: 'المركز المالي', actionId: 'open_financial_center' },
            });
        }
    }

    if (
        fin.hasLedgerData &&
        remaining >= EARNER_PERSONAL_COERCIVE_MIN_IQD &&
        ctx.lifecycleStatus === 'active' &&
        fin.daysSinceLastLedgerPayment != null &&
        fin.daysSinceLastLedgerPayment >= STALE_PAYMENT_DAYS
    ) {
        nudges.push({
            id: `${ctx.dossierKey}:financial-stale-ledger`,
            kind: 'execution.financial_stale_payments',
            surface: 'execution',
            priority: 13,
            message: `لا توجد دفعات في المركز المالي منذ ${fin.daysSinceLastLedgerPayment} يوماً${claimSuffix} — المتبقي ${remaining.toLocaleString('ar-IQ')} د.ع.`,
            presence: {
                present: [`متبقي: ${remaining.toLocaleString('ar-IQ')} د.ع`],
                missing: ['دفعة حديثة'],
            },
            source: 'financialCenter.ledgerPayments.stale',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح المركز المالي', actionId: 'open_financial_center' },
        });
    }

    if (
        fin.hasLedgerData &&
        remaining >= EARNER_EXECUTIVE_DETENTION_MIN_IQD &&
        ctx.signals.coerciveReadyUnresolved
    ) {
        nudges.push({
            id: `${ctx.dossierKey}:financial-ledger-remaining`,
            kind: 'execution.financial_ledger_remaining',
            surface: 'execution',
            priority: 16,
            message: `المتبقي في المركز المالي ${remaining.toLocaleString('ar-IQ')} د.ع${claimSuffix} — هل تود متابعة التحصيل أو الحجز؟`,
            presence: {
                present: [`${remaining.toLocaleString('ar-IQ')} د.ع`],
                missing: ['متابعة تحصيل'],
            },
            source: 'financialCenter.remainingUnified',
            dossierKey: ctx.dossierKey,
            action: { label: 'فتح المركز المالي', actionId: 'open_financial_center' },
        });
    }

    return nudges.sort((a, b) => a.priority - b.priority);
}
