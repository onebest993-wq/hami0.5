import type { SparkNudge, SparkNudgeKind } from '@/app/spark/types';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { WorkspacePinType } from '@/app/workspace/types';
import { buildWorkspaceRoute } from '@/app/workspace/workspaceRoutes';
import { scanLawsuitArchiveForSpark } from '@/app/spark/engine/lawsuitArchiveSparkScan';
import { scanExecutionArchiveForSpark } from '@/app/spark/engine/executionArchiveSparkScan';
import { scanCriminalArchiveForSpark } from '@/app/spark/engine/criminalArchiveSparkScan';
import { scanUrgentCasesForSpark } from '@/app/spark/engine/urgentArchiveSparkScan';
import { scanFieldTasksForSpark } from '@/app/spark/engine/fieldTasksSparkScan';
import { scanThreadingForSpark } from '@/app/spark/engine/threadingSparkScan';
import { scanRepositoryHomeSparkHits } from '@/app/spark/engine/repositoryHomeSparkScan';
import { SPARK_REPOSITORY_SESSION_ROUTE } from '@/app/spark/engine/homeSparkRoutes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

export type HomeSparkSection =
    | 'lawsuit'
    | 'execution'
    | 'criminal'
    | 'urgent'
    | 'field'
    | 'threading'
    | 'repository';

export type HomeSparkHit = {
    section: HomeSparkSection;
    targetFileId: string;
    dossierKey: string;
    caseLabel: string;
    kind: SparkNudgeKind;
    kindLabel: string;
    routePath: string;
};

const KIND_LABELS: Partial<Record<SparkNudgeKind, string>> = {
    'lawsuit.absent_notification_missing': 'إعلان حكم غيابي',
    'lawsuit.defendant_objection_available': 'اعتراض غيابي',
    'lawsuit.plaintiff_absent_monitoring': 'متابعة حكم غيابي',
    'lawsuit.hearing_document_gap': 'جلسة قريبة',
    'lawsuit.abandonment_renewal': 'انقطاع الدعوى',
    'lawsuit.appeal_deadline_near': 'مهلة طعن',
    'lawsuit.cassation_deadline_near': 'مهلة تمييز',
    'lawsuit.interruption_resume': 'استئناف بعد انقطاع',
    'lawsuit.pause_active': 'إيقاف الدعوى',
    'lawsuit.incidental_entry_pending': 'طرف ثالث',
    'lawsuit.petition_void_followup': 'إبطال عريضة',
    'lawsuit.cross_appeal_available': 'طعن متقابل',
    'lawsuit.document_completeness': 'اكتمال المستندات',
    'execution.voluntary_period_end': 'مهلة رضائية',
    'execution.eviction_voluntary_period_end': 'مهلة إخلاء',
    'execution.debtor_unnotified': 'غير مبلّغ',
    'execution.debtor_absence_followup': 'عدم حضور',
    'execution.grace_period_ending': 'مهلة رضائية قريبة',
    'execution.ready_for_coercive': 'جاهز جبرياً',
    'execution.dormancy_art112': 'ركود إضبارة',
    'execution.timeline_urgent_deadline': 'مهلة في السجل',
    'execution.publication_period_near': 'نشر قريب',
    'execution.stale_payments': 'دفعات راكدة',
    'execution.financial_settlement_due': 'موعد تسوية',
    'execution.financial_settlement_overdue': 'تسوية متأخرة',
    'execution.financial_settlement_upcoming': 'تسوية قادمة',
    'execution.financial_settlement_breach': 'إخلال تسوية',
    'execution.financial_installment_due': 'قسط راتب',
    'execution.financial_installment_overdue': 'قسط متأخر',
    'execution.financial_stale_payments': 'دفعات راكدة (مركز مالي)',
    'execution.financial_ledger_remaining': 'متبقي مالي',
    'execution.financial_alimony_monthly_setup': 'نفقة — ضبط شهري',
    'execution.financial_alimony_monthly_due': 'نفقة شهرية قريبة',
    'execution.pending_case_tasks': 'مهام معلّقة',
    'execution.secretary_deadline': 'مهلة Secretary',
    'execution.secretary_hearing': 'جلسة تنفيذ',
    'execution.secretary_urgent': 'عاجل',
    'execution.secretary_task': 'مهمة تنفيذ',
    'execution.secretary_alert': 'تنبيه تنفيذ',
    'execution.coercive_stalled': 'جبري راكد',
    'execution.coercive_seizure_pending': 'حجز معلّق',
    'execution.coercive_salary_during_grace': 'راتب/رضائي',
    'execution.pending_executor_decision': 'قرار منفذ',
    'execution.detention_judge_followup': 'قرار حبس',
    'execution.lifecycle_resume': 'إضبارة متوقفة',
    'criminal.article3_deadline': 'مهلة المادة ٣',
    'criminal.absentia_publication_missing': 'نشر حكم غيابي',
    'criminal.absentia_objection_available': 'اعتراض جزائي',
    'criminal.mandatory_cassation': 'تمييز إلزامي',
    'urgent.grievance_notification_unconfirmed': 'تبليغ تظلم',
    'urgent.execution_data_incomplete': 'بيانات تنفيذ',
    'urgent.cassation_followup': 'متابعة تمييز',
    'field.fatal_deadline': 'مهلة حرجة',
    'field.overdue_incomplete': 'مهمة متأخرة',
    'field.due_today': 'مهمة اليوم',
    'threading.task_deadline_near': 'مهلة معاملة',
    'threading.task_blocked': 'مهمة معلّقة',
    'threading.transaction_paused': 'معاملة متوقفة',
    'repository.vault_unbound_docs': 'ملفات غير مربوطة',
    'repository.upload_meta_pending': 'رفع معلّق',
    'repository.vault_text_pending': 'استخراج نص',
    'repository.vault_date_hint': 'تواريخ في مرفق',
    'repository.vault_bound_date_unregistered': 'تاريخ غير مسجّل',
    'repository.note_reminder_near': 'تذكير ملاحظة',
    'repository.note_date_hint': 'تواريخ في ملاحظة',
};

function resolveKindLabel(kind: SparkNudgeKind): string {
    return KIND_LABELS[kind] ?? 'متابعة إجرائية';
}

function pushHits(
    hits: HomeSparkHit[],
    section: HomeSparkSection,
    items: Array<{ fileId?: string; caseId?: string; dossierKey: string; caseLabel: string; nudge: { kind: SparkNudgeKind } }>,
    pinType: WorkspacePinType,
    maxTotal: number,
): void {
    for (const item of items) {
        if (hits.length >= maxTotal) return;
        const targetFileId = String(item.fileId ?? item.caseId ?? '').trim();
        if (!targetFileId) continue;
        hits.push({
            section,
            targetFileId,
            dossierKey: item.dossierKey,
            caseLabel: item.caseLabel,
            kind: item.nudge.kind,
            kindLabel: resolveKindLabel(item.nudge.kind),
            routePath: buildWorkspaceRoute(pinType, targetFileId),
        });
    }
}

/** مسح هادئ عبر الأقسام — بدون LLM */
export function scanHomeSparkHits(
    sources: ClusterScanSources,
    options?: { maxHitsPerSection?: number; maxTotal?: number },
): HomeSparkHit[] {
    const perSection = options?.maxHitsPerSection ?? 6;
    const maxTotal = options?.maxTotal ?? 24;
    const hits: HomeSparkHit[] = [];

    // مصادر محلية متاحة فوراً (lite + hydrated) — لا تنتظر urgent/threading
    pushHits(
        hits,
        'lawsuit',
        scanLawsuitArchiveForSpark(sources.lawsuitFiles as Array<Record<string, unknown>>, {
            maxHits: perSection,
        }).map((h) => ({ fileId: h.fileId, dossierKey: h.dossierKey, caseLabel: h.caseLabel, nudge: h.nudge })),
        'lawsuit',
        maxTotal,
    );

    pushHits(
        hits,
        'execution',
        scanExecutionArchiveForSpark(sources.executionFiles as Array<Record<string, unknown>>, {
            maxHits: perSection,
        }).map((h) => ({ fileId: h.fileId, dossierKey: h.dossierKey, caseLabel: h.caseLabel, nudge: h.nudge })),
        'execution',
        maxTotal,
    );

    pushHits(
        hits,
        'criminal',
        scanCriminalArchiveForSpark(sources.criminalCases as Array<Record<string, unknown>>, {
            maxHits: perSection,
        }).map((h) => ({ caseId: h.caseId, dossierKey: h.dossierKey, caseLabel: h.caseLabel, nudge: h.nudge })),
        'criminal',
        maxTotal,
    );

    pushHits(
        hits,
        'field',
        scanFieldTasksForSpark(sources.fieldTasks).map((h) => ({
            fileId: h.taskId,
            dossierKey: h.dossierKey,
            caseLabel: h.caseLabel,
            nudge: h.nudge,
        })),
        'task',
        maxTotal,
    );

    // المستعجل والمعاملات يعتمدان على IndexedDB — يُضافان بعد جاهزية extras
    if (sources.ready) {
        pushHits(
            hits,
            'urgent',
            scanUrgentCasesForSpark(sources.urgentCases as Array<Record<string, unknown>>, {
                maxHits: perSection,
            }).map((h) => ({ caseId: h.caseId, dossierKey: h.dossierKey, caseLabel: h.caseLabel, nudge: h.nudge })),
            'urgent',
            maxTotal,
        );

        pushHits(
            hits,
            'threading',
            scanThreadingForSpark(sources.threadingTransactions, sources.threadingTasks, {
                maxHits: perSection,
            }).map((h) => ({
                fileId: h.transactionId,
                dossierKey: h.dossierKey,
                caseLabel: h.caseLabel,
                nudge: h.nudge,
            })),
            'threading',
            maxTotal,
        );
    }

    const repositoryHits = scanRepositoryHomeSparkHits(
        {
            vaultDocs: sources.vaultDocs ?? [],
            notes: (sources.notes ?? []) as GlobalNote[],
            lawsuitFiles: (sources.lawsuitFiles ?? []) as FileData[],
            executionFiles: (sources.executionFiles ?? []) as ExecutionFile[],
        },
        { maxHits: perSection },
    );
    for (const item of repositoryHits) {
        if (hits.length >= maxTotal) break;
        hits.push({
            section: 'repository',
            targetFileId: item.targetFileId,
            dossierKey: item.dossierKey,
            caseLabel: item.caseLabel,
            kind: item.kind,
            kindLabel: resolveKindLabel(item.kind),
            routePath: SPARK_REPOSITORY_SESSION_ROUTE,
        });
    }

    return hits;
}

const SECTION_LABELS: Record<HomeSparkSection, string> = {
    lawsuit: 'دعوى',
    execution: 'تنفيذ',
    criminal: 'جزائي',
    urgent: 'مستعجل',
    field: 'مهمة',
    threading: 'معاملة',
    repository: 'مستودع',
};

function proceduralAttentionGroupKey(hit: HomeSparkHit): string {
    return `${hit.section}|${hit.kind}|${hit.targetFileId}`;
}

function buildProceduralAttentionNudgeFromGroup(groupHits: HomeSparkHit[]): SparkNudge {
    const first = groupHits[0];
    const count = groupHits.length;
    const sectionLabel = SECTION_LABELS[first.section];
    const message =
        count === 1
            ? `يبدو أن ${sectionLabel} ${first.caseLabel} تحتاج ${first.kindLabel} — هل يهمك الأمر؟`
            : `يبدو أن ${sectionLabel} «${first.caseLabel}» — ${count} متابعات (${first.kindLabel}) — هل يهمك الأمر؟`;

    return {
        id: `home-procedural-attention:${first.section}:${first.kind}:${first.targetFileId}`,
        kind: 'home.procedural_attention_summary',
        surface: 'home',
        priority: 4,
        message,
        presence: {
            present: count === 1 ? [first.caseLabel] : [`${count} في ${sectionLabel}`],
            missing: [first.kindLabel],
        },
        source: 'homeSparkAggregateScan',
        dossierKey: first.dossierKey,
        targetFileId: first.targetFileId,
        hitCount: count,
        action: { label: 'فتح الإضبارة', actionId: 'open_dossier' },
    };
}

/**
 * إشعار لكل مجموعة: نفس القسم + نفس الموضوع (kind) + نفس الإضبارة.
 * أقسام أو مواضيع أو إضابير مختلفة → بطاقات منفصلة.
 */
export function buildHomeProceduralAttentionNudges(hits: HomeSparkHit[]): SparkNudge[] {
    if (!hits.length) return [];

    const groups = new Map<string, HomeSparkHit[]>();
    const groupOrder: string[] = [];

    for (const hit of hits) {
        const key = proceduralAttentionGroupKey(hit);
        if (!groups.has(key)) {
            groupOrder.push(key);
            groups.set(key, []);
        }
        groups.get(key)!.push(hit);
    }

    return groupOrder.map((key) => buildProceduralAttentionNudgeFromGroup(groups.get(key)!));
}

/** أول إشعار إجرائي — للتذييل وواجهات سبارك القديمة */
export function buildHomeProceduralAttentionNudge(hits: HomeSparkHit[]): SparkNudge | null {
    return buildHomeProceduralAttentionNudges(hits)[0] ?? null;
}

export function resolveHomeSparkRoutePath(hits: HomeSparkHit[], targetFileId: string): string | null {
    const hit = hits.find((h) => h.targetFileId === targetFileId);
    return hit?.routePath ?? null;
}

/** عدّادات مسح الرئيسية لكل قسم — للربط الوظيفي دون تغيير بصري */
export function countHomeSparkHitsBySection(
    sources: ClusterScanSources,
    options?: { maxHitsPerSection?: number; maxTotal?: number },
): Partial<Record<HomeSparkSection, number>> {
    const hits = scanHomeSparkHits(sources, options);
    return hits.reduce(
        (acc, hit) => {
            acc[hit.section] = (acc[hit.section] ?? 0) + 1;
            return acc;
        },
        {} as Partial<Record<HomeSparkSection, number>>,
    );
}
