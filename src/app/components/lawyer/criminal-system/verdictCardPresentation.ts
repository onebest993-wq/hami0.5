import { isTrialVerdictOutcome } from './trialSessionsEngine';
import { verdictCassationResultLabel } from './verdictCassationResultEngine';
import type { VerdictCardOutcome } from './verdictCardTypes';

export function formatVerdictCassationResultLabel(resultRaw: string | undefined): string {
    return verdictCassationResultLabel(resultRaw);
}

export function isVerdictCardOutcome(v: string): v is VerdictCardOutcome {
    return isTrialVerdictOutcome(v);
}

export function verdictOutcomeLabel(outcome: VerdictCardOutcome): string {
    if (outcome === 'acquittal') return 'حكم بالبراءة';
    if (outcome === 'release') return 'حكم بالإفراج';
    return 'حكم بالإدانة';
}

export function verdictCardShellClass(outcome: VerdictCardOutcome): string {
    if (outcome === 'acquittal') {
        return 'border-emerald-500/40 bg-emerald-950/20';
    }
    if (outcome === 'release') {
        return 'border-amber-400/40 bg-amber-950/18';
    }
    return 'border-[#E6C673]/30 bg-slate-800/40';
}

export function verdictOutcomeEmoji(outcome: VerdictCardOutcome): string {
    if (outcome === 'acquittal') return '';
    if (outcome === 'release') return '';
    return '';
}
