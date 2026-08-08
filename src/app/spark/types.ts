export type SparkSurface = 'lawsuit' | 'execution' | 'criminal' | 'calendar' | 'home' | 'field' | 'threading' | 'repository';

export type SparkJurisdiction = 'civil' | 'personal' | 'criminal' | 'unknown';

export type SparkNudgeKind =
    | 'lawsuit.absent_notification_missing'
    | 'lawsuit.defendant_objection_available'
    | 'lawsuit.plaintiff_absent_monitoring'
    | 'lawsuit.hearing_document_gap'
    | 'lawsuit.abandonment_renewal'
    | 'lawsuit.appeal_deadline_near'
    | 'lawsuit.cassation_deadline_near'
    | 'lawsuit.interruption_resume'
    | 'lawsuit.pause_active'
    | 'lawsuit.incidental_entry_pending'
    | 'lawsuit.petition_void_followup'
    | 'lawsuit.cross_appeal_available'
    | 'lawsuit.document_completeness'
    | 'lawsuit.archive_attention_summary'
    | 'execution.voluntary_period_end'
    | 'execution.pending_executor_decision'
    | 'execution.detention_judge_followup'
    | 'execution.lifecycle_resume'
    | 'execution.debtor_unnotified'
    | 'execution.debtor_absence_followup'
    | 'execution.subsequent_summons_round'
    | 'execution.guarantor_notice_pending'
    | 'execution.grace_period_ending'
    | 'execution.ready_for_coercive'
    | 'execution.eviction_voluntary_period_end'
    | 'execution.dormancy_art112'
    | 'execution.timeline_urgent_deadline'
    | 'execution.publication_period_near'
    | 'execution.stale_payments'
    | 'execution.pending_case_tasks'
    | 'execution.secretary_deadline'
    | 'execution.secretary_hearing'
    | 'execution.secretary_urgent'
    | 'execution.secretary_task'
    | 'execution.secretary_alert'
    | 'execution.coercive_stalled'
    | 'execution.coercive_seizure_pending'
    | 'execution.coercive_salary_during_grace'
    | 'execution.archive_attention_summary'
    | 'criminal.article3_deadline'
    | 'criminal.absentia_publication_missing'
    | 'criminal.absentia_objection_available'
    | 'criminal.mandatory_cassation'
    | 'criminal.archive_attention_summary'
    | 'urgent.grievance_notification_unconfirmed'
    | 'urgent.execution_data_incomplete'
    | 'urgent.cassation_followup'
    | 'urgent.archive_attention_summary'
    | 'home.procedural_attention_summary'
    | 'calendar.hearing_prep_gap'
    | 'calendar.hearing_missing_court'
    | 'calendar.travel_conflict'
    | 'calendar.schedule_overload'
    | 'calendar.location_mismatch'
    | 'calendar.deadline_overdue'
    | 'calendar.deadline_near'
    | 'calendar.hearing_today'
    | 'calendar.unscheduled_dossier_date'
    | 'calendar.note_reminder_due'
    | 'calendar.secretary_schedule_alert'
    | 'calendar.multi_day_travel'
    | 'lawsuit.creation_client_missing'
    | 'lawsuit.creation_stage_mismatch'
    | 'lawsuit.creation_underlying_stage_missing'
    | 'lawsuit.creation_exception_hint'
    | 'lawsuit.creation_incidental_parties'
    | 'execution.creation_directorate_incomplete'
    | 'execution.creation_debtor_address_missing'
    | 'execution.creation_document_blocked'
    | 'execution.creation_monetary_gap'
    | 'execution.creation_alimony_timeline'
    | 'execution.creation_alimony_incomplete'
    | 'execution.creation_alimony_insight'
    | 'coherence.timeline'
    | 'coherence.cross_field'
    | 'coherence.text'
    | 'coherence.action'
    | 'coherence.amount'
    | 'execution.creation_context_insight'
    | 'field.fatal_deadline'
    | 'field.overdue_incomplete'
    | 'field.due_today'
    | 'field.archive_attention_summary'
    | 'threading.task_deadline_near'
    | 'threading.task_blocked'
    | 'threading.transaction_paused'
    | 'threading.archive_attention_summary'
    | 'criminal.creation_client_missing'
    | 'criminal.creation_investigation_location_incomplete'
    | 'criminal.creation_referral_fields_incomplete'
    | 'criminal.creation_guardian_incomplete'
    | 'criminal.creation_article3_discovery'
    | 'criminal.creation_severance_reason'
    | 'repository.vault_unbound_docs'
    | 'repository.upload_meta_pending'
    | 'repository.vault_text_pending'
    | 'repository.vault_date_hint'
    | 'repository.vault_bound_date_unregistered'
    | 'repository.note_reminder_near'
    | 'repository.note_date_hint'
    | 'execution.employee_salary_coercive'
    | 'execution.employee_taklif_active'
    | 'execution.employee_assignment_coercive'
    | 'execution.employee_summons_attendance'
    | 'execution.financial_settlement_due'
    | 'execution.financial_settlement_overdue'
    | 'execution.financial_settlement_upcoming'
    | 'execution.financial_settlement_breach'
    | 'execution.financial_installment_due'
    | 'execution.financial_installment_overdue'
    | 'execution.financial_stale_payments'
    | 'execution.financial_ledger_remaining'
    | 'execution.financial_alimony_monthly_setup'
    | 'execution.financial_alimony_monthly_due';

export type SparkNudgeAction = {
    label: string;
    actionId: string;
};

export type SparkPresenceHint = {
    present: string[];
    missing: string[];
};

export type SparkNudge = {
    id: string;
    kind: SparkNudgeKind;
    surface: SparkSurface;
    priority: number;
    message: string;
    presence?: SparkPresenceHint;
    source: string;
    dossierKey?: string;
    action?: SparkNudgeAction;
    /** لمسح الأرشيف — فتح إضبارة محددة */
    targetFileId?: string;
    hitCount?: number;
};

export type SparkPreferenceEntry = {
    dismissCount: number;
    lastDismissedAt: number;
    snoozedUntil?: number;
    hidden?: boolean;
};

export type SparkPreferenceMap = Record<string, SparkPreferenceEntry>;
