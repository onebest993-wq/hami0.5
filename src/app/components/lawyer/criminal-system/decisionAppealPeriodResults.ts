import type { JudicialDecision } from '@/app/types/criminal';
import {
    ALL_CASSATION_RESULT_FORM_OPTIONS,
    formatCassationResultShortLabel,
    normalizeCassationAppealResult,
} from './cassationJudicialForm';
import { verdictCassationResultLabel } from './verdictCassationResultCatalog';
import { latestConcludedAppealWithBeneficiary } from './judicialDecisionsEngine';

export function formatAppealResultLabel(raw: string): string {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    if (key.startsWith('verdict_')) {
        const verdictLabel = verdictCassationResultLabel(key);
        if (verdictLabel && verdictLabel !== '—' && verdictLabel !== key) return verdictLabel;
    }
    const norm = normalizeCassationAppealResult(key);
    const short = formatCassationResultShortLabel(norm);
    if (short) return short;
    const fromOptions = ALL_CASSATION_RESULT_FORM_OPTIONS.find((o) => o.value === norm)?.label;
    if (fromOptions) return fromOptions;
    if (norm === 'upheld' || key === 'upheld') return 'تأييد القرار';
    if (norm === 'quashed' || key === 'quashed') return 'نقض القرار';
    return key;
}

export function resolveAppealResultCategory(raw: string): 'upheld' | 'quashed' | '' {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    const norm = normalizeCassationAppealResult(key);
    if (
        norm === 'affirmation' ||
        norm === 'procedural_affirmation' ||
        norm === 'upheld'
    ) {
        return 'upheld';
    }
    if (
        norm === 'quash_dismissal' ||
        norm === 'quash_remand' ||
        norm === 'quash_modify' ||
        norm === 'procedural_annulment' ||
        norm === 'procedural_remand_direction' ||
        norm === 'quashed'
    ) {
        return 'quashed';
    }
    if (/تأييد|تصديق/i.test(key)) return 'upheld';
    if (/نقض/i.test(key)) return 'quashed';
    return '';
}

export function resolveStoredAppealResultRaw(decision: JudicialDecision): string {
    const fromField = String(decision.appealResult ?? '').trim();
    if (fromField) return fromField;
    const concluded = latestConcludedAppealWithBeneficiary(decision);
    if (concluded?.result) return String(concluded.result);
    return '';
}

export function resolveAppealResultRecordedAt(decision: JudicialDecision): string {
    const explicit = String(decision.cassationPapersReceivedAt ?? '').trim();
    if (explicit) return explicit;
    const concluded = latestConcludedAppealWithBeneficiary(decision);
    return String(concluded?.concludedAt ?? concluded?.filedAt ?? '').trim();
}
