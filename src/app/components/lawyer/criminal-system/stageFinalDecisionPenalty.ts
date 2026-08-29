import {
    MASTER_PENALTY_OPTIONS,
    STAGE_FINAL_DECISION_KIND_OPTIONS,
    type MasterPenaltyKind,
    type StageFinalDecisionKind,
    type StageFinalPenaltyBlock,
} from './stageFinalDecisionTypes';

export function stageFinalDecisionKindLabel(kind: StageFinalDecisionKind | undefined): string {
    return STAGE_FINAL_DECISION_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? '—';
}

export function masterPenaltyLabel(kind: MasterPenaltyKind | undefined): string {
    return MASTER_PENALTY_OPTIONS.find((o) => o.value === kind)?.label ?? '—';
}

export function resolvePenaltiesSupplementary(penalty: StageFinalPenaltyBlock | undefined): string {
    if (!penalty) return '';
    const raw =
        penalty.penalties_supplementary != null
            ? penalty.penalties_supplementary
            : penalty.accessory_penalties;
    return String(raw ?? '').trim();
}

export function formatPenaltyDisplay(penalty: StageFinalPenaltyBlock | undefined): string {
    if (!penalty) return '';
    const parts: string[] = [];
    const durationParts: string[] = [];
    if (penalty.years && penalty.years > 0) durationParts.push(`${penalty.years} ${penalty.years === 1 ? 'سنة' : 'سنوات'}`);
    if (penalty.months && penalty.months > 0) durationParts.push(`${penalty.months} ${penalty.months === 1 ? 'شهر' : 'أشهر'}`);

    if (penalty.masterKind === 'fine' || penalty.masterKind === 'combined_imprisonment_fine') {
        if (penalty.fineAmountIqd && penalty.fineAmountIqd > 0) {
            parts.push(`غرامة مقدارها ${penalty.fineAmountIqd.toLocaleString('ar-IQ')} دينار عراقي`);
        }
        const sub: string[] = [];
        if (penalty.substituteImprisonmentMonths && penalty.substituteImprisonmentMonths > 0) {
            sub.push(`${penalty.substituteImprisonmentMonths} شهر`);
        }
        if (penalty.substituteImprisonmentDays && penalty.substituteImprisonmentDays > 0) {
            sub.push(`${penalty.substituteImprisonmentDays} يوم`);
        }
        if (sub.length) parts.push(`حبس بديل عند عدم الدفع: ${sub.join(' و')}`);
    }

    if (
        penalty.masterKind === 'severe_imprisonment' ||
        penalty.masterKind === 'simple_imprisonment' ||
        penalty.masterKind === 'combined_imprisonment_fine'
    ) {
        const kindLabel =
            penalty.masterKind === 'severe_imprisonment'
                ? 'حبس شديد'
                : penalty.masterKind === 'simple_imprisonment'
                  ? 'حبس بسيط'
                  : 'حبس';
        if (durationParts.length) parts.unshift(`${kindLabel} لمدة ${durationParts.join(' و')}`);
        else parts.unshift(kindLabel);
    }

    if (penalty.suspendedExecution) {
        parts.push(
            penalty.suspendedExecutionReason?.trim()
                ? `مشمول بإيقاف التنفيذ — ${penalty.suspendedExecutionReason.trim()}`
                : 'مشمول بإيقاف التنفيذ',
        );
    }
    return parts.join(' — ');
}
