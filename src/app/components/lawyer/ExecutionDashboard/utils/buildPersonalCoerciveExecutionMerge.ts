import type { PersonalCoerciveSubtype } from '@/app/utils/executorSeizureDecisionQueue';

export function buildPersonalCoerciveExecutionMerge(input: {
    subtype: PersonalCoerciveSubtype;
    resolution: 'approved' | 'rejected' | 'alternative' | 'withdrawn';
    decisionId?: string;
}): Record<string, unknown> {
    const { subtype, resolution } = input;
    const merge: Record<string, unknown> = {};

    if (resolution === 'withdrawn') {
        switch (subtype) {
            case 'travel_ban':
                merge.debtor_travel_ban_active = false;
                break;
            case 'arrest_warrant_investigation':
            case 'employee_assignment_investigation':
                merge.investigation_court_withdrawn_at = new Date().toISOString();
                merge.investigationCourtRequested = false;
                merge.investigationMemoIssued = false;
                merge.investigationPathDebtorPresent = false;
                merge.personal_arrest_investigation_session_open = false;
                merge.personal_arrest_warrant_stage = 'none';
                merge.debtor_wanted_arrest_warrant = false;
                merge.debtor_arrest_warrant_cleared_after_custody = false;
                merge.forced_bring_in_personal_outcome = null;
                merge.debtorEvaded = false;
                break;
            default:
                break;
        }
        return merge;
    }

    if (resolution === 'approved' || resolution === 'alternative') {
        switch (subtype) {
            case 'travel_ban':
                merge.debtor_travel_ban_active = true;
                merge.travel_ban_withdrawn_at = null;
                break;
            case 'forced_bring_in':
                merge.forcedAttendanceIssued = true;
                merge.activeNoticeState = 'forced_attendance';
                break;
            case 'arrest_warrant_investigation':
            case 'employee_assignment_investigation':
                merge.personal_arrest_warrant_stage = 'pending_court';
                merge.personal_arrest_investigation_session_open = true;
                merge.investigationCourtRequested = true;
                merge.investigation_court_withdrawn_at = null;
                break;
            case 'executive_detention':
            case 'executive_dossier_presentation':
                merge.executive_detention_judge_outcome = null;
                merge.personal_coercive_cycle_closed_at = null;
                merge.executive_dossier_phase = 'handed_to_judge';
                if (String(input.decisionId || '').trim()) {
                    merge.executive_detention_judge_eligible_decision_id = String(input.decisionId).trim();
                }
                break;
            default:
                break;
        }
    } else if (resolution === 'rejected') {
        switch (subtype) {
            case 'travel_ban':
                merge.debtor_travel_ban_active = false;
                break;
            case 'forced_bring_in':
                merge.forcedAttendanceIssued = false;
                merge.activeNoticeState = null;
                merge.forced_bring_in_personal_outcome = null;
                merge.forced_bring_in_personal_followup_logged = false;
                break;
            case 'arrest_warrant_investigation':
            case 'employee_assignment_investigation':
                merge.investigationCourtRequested = false;
                merge.personal_arrest_investigation_session_open = false;
                merge.personal_arrest_warrant_stage = 'none';
                merge.debtor_wanted_arrest_warrant = false;
                break;
            case 'executive_detention':
            case 'executive_dossier_presentation':
                merge.executive_detention_judge_outcome = null;
                merge.executive_dossier_phase = null;
                break;
            case 'executive_detention_judge':
                merge.executive_detention_judge_outcome = null;
                merge.executive_detention_judge_decision_id = null;
                merge.executive_detention_judge_eligible_decision_id = null;
                merge.executive_detention_judge_rejection_reason = null;
                merge.executive_dossier_phase = null;
                break;
            default:
                break;
        }
    }

    return merge;
}
